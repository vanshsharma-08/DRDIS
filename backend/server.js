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
          .map(r => ({ text: r.text.trim() }))
          .filter(r => r.text.length > 0)
      : [];

    console.log("[DRDIS] SAFE INPUT:", safeRequests);

    if (safeRequests.length === 0) {
      return res.status(200).json({
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
    const anyVague = safeRequests.some(r => isVague(r.text));

    console.log("[DRDIS] ANY VAGUE:", anyVague);

    // ─── HARD STOP (NO RULE ENGINE) ─────────────────
    if (anyVague) {
      console.log("🔥 GEMINI PATH (HARD STOP)");

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
    console.log("🚨 ENTERING RULE ENGINE");

    incrementTotalRequests();

    const processResult = await processRequests(safeRequests);

    incrementFallbackUsage();

    if (processResult.error) {
      return res.status(200).json({
        selected_request: null,
        assigned_volunteer: null,
        reasons: ['Input validation failed'],
        decision_score: 0,
        all_requests: [],
        source: 'rule',
      });
    }

    const parsedRequests = processResult.processed.map(p => p.parsed);

    const { selected_request, decision_score, all_requests } =
      selectTopRequest(parsedRequests);

    if (!selected_request) {
      return res.status(200).json({
        selected_request: null,
        assigned_volunteer: null,
        reasons: ['No valid requests'],
        decision_score: 0,
        all_requests: [],
        source: 'rule'
      });
    }

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

    return res.status(200).json({
      selected_request,
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
    console.error("ERROR:", err.message);
    return res.status(200).json({
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

app.listen(3001, () => {
  console.log("DRDIS running on port 3001");
});