/**
 * DRDIS — Safe Gemini Call
 * Simulates Gemini API response with timeout + fallback.
 * No real API. No API key. No process.env. No crashes.
 *
 * Architecture:
 *   Input text → simulated Gemini call → JSON parse → schema validation → output
 *   If timeout/error/invalid → fallbackParse(text) is used
 *
 * Always returns a fully-populated object with safe defaults.
 * Deterministic: same input → same output, every time.
 */

const { fallbackParse } = require('./fallbackParse');

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 4000;

const VALID_URGENCIES = ['HIGH', 'MEDIUM', 'LOW'];

// ─── System Prompt for Gemini ──────────────────────────────────────────────────

/**
 * System prompt for Gemini to act as a Senior Triage Dispatcher
 * Instructs the LLM to output forensic explainability reasons
 */
const GEMINI_SYSTEM_PROMPT = `You are a Senior Triage Dispatcher for disaster response. Your role is to analyze incoming requests and output structured JSON with forensic explainability.

Analyze the input for:
1. Emotional state indicators (e.g., "please help", "urgent", "critical")
2. Ambiguity and contradictions (e.g., "low urgency but immediate rescue")
3. Concrete disaster indicators (e.g., "trapped", "flood", "injured")

Rules for contradiction handling:
- If input says "low urgency but immediate rescue", prioritize "rescue" as a life-threat anomaly
- If emotional distress is high but concrete indicators are low, categorize as LOW priority to conserve critical rescue teams
- Always prioritize life-threat keywords over stated urgency

Output format:
{
  "urgency": "HIGH|MEDIUM|LOW",
  "needs": ["array", "of", "needs"],
  "people_count": number,
  "location_tag": "extracted spatial/location context (e.g., 'Sector 5', 'Shelter Camp A', 'Unknown Area')",
  "severity_reason": " forensic explanation of analysis",
  "has_medical": boolean,
  "has_vulnerable": boolean
}

Location extraction rules:
- Look for area keywords: sector, shelter, street, village, district, zone, area, block, ward, camp, colony, town, city, hospital, school, bridge, road, lane, market, station, airport, port, park, plaza, square
- Extract the keyword and 2-3 succeeding words as the location_tag
- If no location is found, set location_tag to "Unknown Area"

Example output for ambiguous input:
"Input lacks concrete disaster indicators but contains high emotional distress ('please help'). Categorizing as LOW priority to conserve critical rescue teams, while routing to general dispatch for human verification."`;

// ─── Simulated Gemini Response ────────────────────────────────────────────────

/**
 * Simulates a Gemini API call. Returns a Promise that resolves with
 * a JSON string representing a parsed disaster response.
 *
 * This is deterministic — same input always produces the same simulated response.
 * No real API call is made.
 *
 * @param {string} text - The input text to parse
 * @returns {Promise<string>} - A JSON string (simulated Gemini output)
 */
function simulateGeminiCall(text) {
  // Normalize for deterministic processing
  const normalized = typeof text === 'string' ? text.toLowerCase().trim() : '';

  // Simulate Gemini-style JSON output based on keyword analysis
  const urgency = detectSimulatedUrgency(normalized);
  const needs = detectSimulatedNeeds(normalized);
  const peopleCount = extractSimulatedPeopleCount(text);
  const hasMedical = detectSimulatedMedical(normalized);
  const hasVulnerable = detectSimulatedVulnerable(normalized);
  const location = extractSimulatedLocation(normalized);
  const severityReason = buildSimulatedReason(urgency, needs, hasMedical, hasVulnerable, peopleCount);

  const response = {
    urgency,
    needs,
    people_count: peopleCount,
    location_tag: location,
    severity_reason: severityReason,
    has_medical: hasMedical,
    has_vulnerable: hasVulnerable,
  };

  // Enforce determinism settings (simulated)
  // In a real API call, these would be passed as parameters:
  // temperature: 0.0, topK: 1, topP: 0.1
  // For simulation, we just ensure the output is deterministic
  return Promise.resolve(JSON.stringify(response));
}

// ─── Simulated Detection Helpers ──────────────────────────────────────────────

function detectSimulatedUrgency(text) {
  const highWords = ['critical', 'urgent', 'emergency', 'trapped', 'fire', 'flood', 'dying', 'bleeding', 'unconscious', 'sos', 'immediately', 'asap', 'heart attack', 'stroke', 'explosion', 'drowning', 'severe'];
  const mediumWords = ['injured', 'hurt', 'sick', 'stranded', 'shelter', 'shortage', 'displaced', 'missing', 'damage', 'no water', 'no food'];
  const lowWords = ['minor', 'stable', 'okay', 'manageable', 'if possible', 'when available', 'low priority', 'not urgent'];

  for (const w of highWords) {
    if (text.includes(w)) return 'HIGH';
  }
  for (const w of mediumWords) {
    if (text.includes(w)) return 'MEDIUM';
  }
  for (const w of lowWords) {
    if (text.includes(w)) return 'LOW';
  }
  return 'MEDIUM';
}

function detectSimulatedNeeds(text) {
  const needs = [];
  if (/food|hungry|starving|meal|ration/.test(text)) needs.push('food');
  if (/water|thirsty|dehydrated|fluid/.test(text)) needs.push('water');
  if (/rescue|trapped|stranded|evacuate|help/.test(text)) needs.push('rescue');
  if (/medical|doctor|injured|ambulance|bleeding|unconscious/.test(text)) needs.push('medical');
  return needs;
}

function extractSimulatedPeopleCount(text) {
  if (typeof text !== 'string') return 1;
  const match = text.match(/(\d+)\s*(?:people|persons?|survivors?|victims?|families|individuals?|residents?|civilians?|refugees?)/i);
  if (match) {
    const n = parseInt(match[1], 10);
    if (!isNaN(n) && n > 0) return n;
  }
  const groupMatch = text.match(/(?:group\s+of|about|around|approximately|over|nearly|at\s+least)\s+(\d+)/i);
  if (groupMatch) {
    const n = parseInt(groupMatch[1], 10);
    if (!isNaN(n) && n > 0) return n;
  }
  const bareMatch = text.match(/\b(\d+)\b/);
  if (bareMatch) {
    const n = parseInt(bareMatch[1], 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return 1;
}

function detectSimulatedMedical(text) {
  return /medical|doctor|hospital|ambulance|injured|bleeding|unconscious|heart attack|stroke|oxygen/.test(text);
}

function detectSimulatedVulnerable(text) {
  return /child|children|elderly|pregnant|baby|infant|disabled|wheelchair|senior|toddler/.test(text);
}

function extractSimulatedLocation(text) {
  if (!text) return "Unknown Area";
  let match = text.match(/\b(sector|zone|ward|shelter|district|street|village|hospital|camp)\s+([a-zA-Z0-9]+)\b/i);
  return match ? match[0] : "Unknown Area";
}

function buildSimulatedReason(urgency, needs, hasMedical, hasVulnerable, peopleCount) {
  const needType = needs.includes('medical') ? 'medical' :
                   needs.includes('rescue') ? 'rescue' :
                   needs.includes('food') || needs.includes('water') ? 'food' : 'general';
  
  const needReason = needType === 'medical' ? 'critical medical need and immediate risk' :
                     needType === 'rescue' ? 'people being trapped and requiring immediate rescue' :
                     needType === 'food' ? 'basic survival needs' : 'general assistance needed';
  
  const peopleText =
    peopleCount === 1
      ? "1 person"
      : peopleCount > 1
      ? `${peopleCount} people`
      : "unknown number of people";
  
  return `Detected ${urgency} urgency ${needType} situation affecting ${peopleText}. Prioritized due to ${needReason}.`;
}

// ─── Schema Validation ────────────────────────────────────────────────────────

/**
 * Validates and normalizes a parsed object against the expected schema.
 * Fills missing fields with safe defaults. Never throws.
 *
 * @param {any} parsed - The parsed object to validate
 * @param {string} originalText - The original input text (for fallback)
 * @returns {{ urgency, needs, people_count, location, severity_reason, has_medical, has_vulnerable }}
 */
function validateAndFill(parsed, originalText) {
  // If parsed is not a plain object, fall back entirely
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return fallbackParse(originalText);
  }

  const result = {};

  // urgency
  if (VALID_URGENCIES.includes(parsed.urgency)) {
    result.urgency = parsed.urgency;
  } else {
    result.urgency = 'MEDIUM';
  }

  // needs
  if (Array.isArray(parsed.needs)) {
    result.needs = parsed.needs.filter((n) => typeof n === 'string' && n.trim().length > 0);
  } else {
    result.needs = [];
  }

  // people_count
  if (typeof parsed.people_count === 'number' && Number.isFinite(parsed.people_count) && parsed.people_count >= 1) {
    result.people_count = Math.floor(parsed.people_count);
  } else {
    result.people_count = 1;
  }

  // location_tag
  if (typeof parsed.location_tag === 'string' && parsed.location_tag.trim().length > 0) {
    result.location_tag = parsed.location_tag.trim();
  } else {
    result.location_tag = 'Unknown Area';
  }

  // severity_reason
  if (typeof parsed.severity_reason === 'string' && parsed.severity_reason.trim().length > 0) {
    result.severity_reason = parsed.severity_reason.trim();
  } else {
    result.severity_reason = 'unable to determine severity';
  }

  // has_medical
  if (typeof parsed.has_medical === 'boolean') {
    result.has_medical = parsed.has_medical;
  } else {
    result.has_medical = false;
  }

  // has_vulnerable
  if (typeof parsed.has_vulnerable === 'boolean') {
    result.has_vulnerable = parsed.has_vulnerable;
  } else {
    result.has_vulnerable = false;
  }

  return result;
}

// ─── Safe JSON Parse ──────────────────────────────────────────────────────────

/**
 * Safely parses a JSON string. Returns null on failure (never throws).
 *
 * @param {string} jsonString
 * @returns {any | null}
 */
function safeJsonParse(jsonString) {
  if (typeof jsonString !== 'string') return null;
  try {
    return JSON.parse(jsonString);
  } catch (_err) {
    return null;
  }
}

// ─── Timeout Wrapper ──────────────────────────────────────────────────────────

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the specified time, rejects with a timeout error.
 *
 * @param {Promise<any>} promise
 * @param {number} ms
 * @returns {Promise<any>}
 */
function withTimeout(promise, ms) {
  let timeoutId;
  const timeoutPromise = new Promise((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Gemini call timed out')), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Safely calls the (simulated) Gemini API with a 4-second timeout.
 * On timeout, error, invalid JSON, or schema mismatch → falls back to fallbackParse.
 *
 * Never throws. Always returns a fully-populated object.
 * Deterministic: same input → same output.
 *
 * @param {any} text - The input text to parse
 * @returns {Promise<{ urgency, needs, people_count, location, severity_reason, has_medical, has_vulnerable }>}
 */
async function safeGeminiCall(text) {
  try {
    // Simulate Gemini API call
    const geminiPromise = simulateGeminiCall(text);

    // Race against 4s timeout
    const rawResponse = await withTimeout(geminiPromise, TIMEOUT_MS);

    // Safely parse JSON
    const parsed = safeJsonParse(rawResponse);
    if (parsed === null) {
      // Invalid JSON → fallback
      return fallbackParse(text);
    }

    // Validate schema and fill defaults
    return validateAndFill(parsed, text);
  } catch (_err) {
    // Timeout or any other error → fallback
    return fallbackParse(text);
  }
}

module.exports = { safeGeminiCall };