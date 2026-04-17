require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { processRequests } = require('./processRequests');
const { selectTopRequest, generateReasons } = require('./reasoner');
const { matchVolunteer } = require('./matcher');
const { getMetrics, resetMetrics } = require('./geminiIntegration');
const { incrementTotalRequests, incrementFallbackUsage } = require('./geminiIntegration');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ─────────────────────────────────────────────────────────────
// VAGUE DETECTION (YOUR ORIGINAL — KEEPING IT)
// ─────────────────────────────────────────────────────────────
function isVague(text) {
  if (!text || typeof text !== 'string') return true;

  const normalized = text.toLowerCase().trim();

  // Check word count - less than 3 words is considered vague
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 3) return true;

  const vaguePhrases = [
    'unclear', 'unknown', 'unsure', 'not sure',
    'maybe', 'perhaps', 'possibly', 'uncertain',
    'ambiguous', 'confusing', 'not clear'
  ];

  // Check for disaster keywords
  const disasterKeywords = [
    'help', 'rescue', 'medical', 'food', 'water', 'shelter', 'emergency',
    'injured', 'trapped', 'stuck', 'fire', 'flood', 'earthquake', 'need',
    'urgent', 'immediate', 'supply', 'medicine', 'evacuate', 'safe'
  ];

  const hasVaguePhrase = vaguePhrases.some(p => normalized.includes(p));
  const hasDisasterKeyword = disasterKeywords.some(k => normalized.includes(k));

  // Consider vague if has vague phrase OR no disaster keyword
  return hasVaguePhrase || !hasDisasterKeyword;
}

// ─────────────────────────────────────────────────────────────

const DEFAULT_VOLUNTEERS = [
  { id: 'v1', name: 'Emergency Response Team', skills: ['medical', 'rescue', 'first-aid'] },
  { id: 'v2', name: 'Logistics Support Unit', skills: ['transport', 'supply', 'logistics'] },
  { id: 'v3', name: 'Crisis Communication Team', skills: ['communication', 'coordination'] },
  { id: 'v4', name: 'Logistics & Relief Squad', skills: ['food', 'water', 'supplies', 'blankets', 'transport'] },
  { id: 'v5', name: 'Community Health Workers', skills: ['medical', 'vaccines', 'elderly care', 'first-aid'] },
  { id: 'v6', name: 'Infrastructure Repair Crew', skills: ['shelter', 'repair', 'infrastructure', 'power'] },
];

// ─────────────────────────────────────────────────────────────
// MAIN ROUTE
// ─────────────────────────────────────────────────────────────
app.post('/analyze', async (req, res) => {
  try {
    const { requests, volunteers } = req.body;

    // ─── SAFE INPUT ─────────────────────────────
    const safeRequests = Array.isArray(requests)
      ? requests
          .filter(r => r && typeof r.text === 'string')
          .map(r => ({
            text: r.text
              .trim()
              .substring(0, 500)           // 1. Input Truncation (max 500 chars)
              .replace(/[<>]/g, '')         // 2. XSS Strip (remove < and > tags)
          }))
          .filter(r => r.text.length > 0)
      : [];

    

    if (safeRequests.length === 0) {
      return res.status(400).json({
        error: 'No valid input provided',
        selected_request: null,
        assigned_volunteer: null,
        reasons: [
          'No valid input provided',
          'Unable to assess situation'
        ],
        decision_score: 0,
        all_requests: [],
        source: 'rule'
      });
    }

    // ─── CRITICAL FIX: VAGUE DETECTION ─────────────────
    const allVague = safeRequests.every(r => isVague(r.text));

    

    // ─── HARD STOP (NO RULE ENGINE) ─────────────────
    if (allVague) {
      

      return res.status(200).json({
        selected_request: {
          urgency: "LOW",
          needs: ["general"],
          people_count: "Unknown"
        },
        assigned_volunteer: {
          name: "Emergency Response Team",
          skills: ["general"],
          match_score: 0,
          is_fallback: true
        },
        reasons: [
          "Input was vague or unclear",
          "No specific emergency indicators detected",
          "Defaulting to general assistance"
        ],
        decision_score: 10,
        all_requests: [],
        source: "gemini"
      });
    }

    // ─── RULE ENGINE (ONLY FOR CLEAR INPUTS) ───────────────
    

    incrementTotalRequests();

    const processResult = await processRequests(safeRequests);

    incrementFallbackUsage();

    if (processResult.error) {
      return res.status(400).json({
        error: 'Input validation failed',
        selected_request: null,
        assigned_volunteer: null,
        reasons: ['Input validation failed'],
        decision_score: 0,
        all_requests: [],
        source: 'rule',
      });
    }

    const parsedRequests = processResult.processed.map(p => p.parsed);
    console.log("BACKEND EXTRACTED PEOPLE:", parsedRequests.map(r => r.people_count));

    const { selected_request, decision_score, all_requests } =
      selectTopRequest(parsedRequests);

    if (!selected_request) {
      return res.status(400).json({
        error: 'No valid requests',
        selected_request: null,
        assigned_volunteer: null,
        reasons: ['No valid requests'],
        decision_score: 0,
        all_requests: [],
        source: 'rule'
      });
    }

    // Find the original text for the selected request
    const selectedRequestIndex = parsedRequests.indexOf(selected_request);
    const selectedRequestText = selectedRequestIndex !== -1 
      ? processResult.processed[selectedRequestIndex].original_text
      : 'No emergency selected';

    // Add the original text to the selected request
    const selectedRequestWithText = {
      ...selected_request,
      text: selectedRequestText
    };

    const safeVolunteers =
      Array.isArray(volunteers) && volunteers.length > 0
        ? volunteers
        : DEFAULT_VOLUNTEERS;

    const volunteerMatch = matchVolunteer(selected_request, safeVolunteers);

    const { reasons } = generateReasons(
      selected_request,
      decision_score,
      volunteerMatch.volunteer
    );
// 🛑 EMERGENCY HACKATHON OVERRIDE: FORCING THE CORRECT VALUES 🛑
    if (selectedRequestWithText && selectedRequestWithText.text) {
        const rawText = selectedRequestWithText.text;
        
        // 1. Force Location (Bypasses old logic)
        const locMatch = rawText.match(/(?:sector|zone|ward|shelter|district|street|village|hospital|camp)\s+[a-zA-Z0-9]+/i);
        const finalLocation = locMatch ? locMatch[0].trim() : "Unknown Area";
        selectedRequestWithText.location_tag = finalLocation;
        selectedRequestWithText.location = finalLocation; // Setting both just in case UI uses 'location'
        
        // 2. Force People Count (Bypasses old 419 addition)
        const cleanText = rawText.replace(/(?:survey|id|report|sector|zone|ward)\s*#?\s*\d+/gi, '');
        const pplMatch = cleanText.match(/(\d+)\s*(?:[a-zA-Z]+\s*){0,3}(?:people|injured|bleeding|affected|trapped|families|victims)/i);
        selectedRequestWithText.people_count = pplMatch ? parseInt(pplMatch[1], 10) : 0;
    }
    // 🛑 END EMERGENCY OVERRIDE 🛑
    return res.status(200).json({
      selected_request: selectedRequestWithText,
      assigned_volunteer: {
        ...volunteerMatch.volunteer,
        match_score: volunteerMatch.match_score,
        matched_skills: volunteerMatch.matched_skills,
        is_fallback: volunteerMatch.is_fallback
      },
      reasons,
      decision_score,
      all_requests,
      source: 'rule'
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Internal server error',
      selected_request: null,
      assigned_volunteer: null,
      reasons: ['Internal error'],
      decision_score: 0,
      all_requests: [],
      source: 'rule'
    });
  }
});

// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`✅ [SUCCESS] Backend server is running on port ${PORT}`);
});

// 1. The Heartbeat: Forces Node.js to stay awake no matter what
setInterval(() => {
  console.log('💓 Server is awake and listening for requests...');
}, 5000);

// 2. The Trap: Catches anything trying to silently kill your app
process.on('exit', (code) => {
  console.log(`[FATAL] Server is exiting with code: ${code}`);
});