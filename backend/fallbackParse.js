/**
 * DRDIS — Fallback Parser
 * Pure keyword-based text parser. No external API. No crashes.
 * Used when Gemini is unavailable or returns invalid output.
 *
 * Always returns a fully-populated object with safe defaults.
 * Deterministic: same input → same output, every time.
 */

// ─── Keyword Maps ─────────────────────────────────────────────────────────────

const URGENCY_KEYWORDS = {
  HIGH: [
    'critical', 'urgent', 'emergency', 'immediately', 'immediate',
    'dying', 'died', 'death', 'fatal', 'life-threatening', 'life threatening',
    'trapped', 'collapse', 'collapsed', 'fire', 'explosion', 'flood',
    'drowning', 'unconscious', 'bleeding', 'severe', 'serious', 'sos',
    'mayday', 'help now', 'need help now', 'right now', 'asap',
    'heart attack', 'cardiac arrest', 'stroke',
  ],
  MEDIUM: [
    'injured', 'hurt', 'sick', 'ill', 'need help', 'need assistance',
    'require', 'required', 'shortage', 'running out', 'limited',
    'stranded', 'stuck', 'displaced', 'shelter', 'missing',
    'damage', 'damaged', 'broken', 'no power', 'no water', 'no food',
  ],
  LOW: [
    'minor', 'stable', 'okay', 'manageable', 'small', 'slight',
    'request', 'would like', 'if possible', 'when available',
    'non-urgent', 'not urgent', 'low priority',
  ],
};

const NEEDS_KEYWORDS = {
  food:    ['food', 'hungry', 'hunger', 'starving', 'starvation', 'meal', 'meals', 'eat', 'eating', 'ration', 'rations', 'supplies'],
  water:   ['water', 'drinking', 'thirsty', 'thirst', 'dehydrated', 'dehydration', 'fluid', 'fluids'],
  rescue:  ['rescue', 'trapped', 'stuck', 'stranded', 'evacuate', 'evacuation', 'extract', 'extraction', 'save', 'help', 'support', 'assistance'],
  medical: ['medical', 'medicine', 'doctor', 'nurse', 'hospital', 'ambulance', 'injured', 'injury', 'wound', 'wounded',
            'bleeding', 'unconscious', 'sick', 'ill', 'illness', 'treatment', 'first aid', 'paramedic'],
};

const MEDICAL_KEYWORDS = [
  'medical', 'medicine', 'doctor', 'nurse', 'hospital', 'ambulance',
  'injured', 'injury', 'wound', 'wounded', 'bleeding', 'unconscious',
  'sick', 'ill', 'illness', 'treatment', 'first aid', 'paramedic',
  'surgery', 'oxygen', 'diabetic', 'cardiac', 'heart attack', 'stroke',
];

const VULNERABLE_KEYWORDS = [
  'child', 'children', 'kid', 'kids', 'baby', 'babies', 'infant', 'infants',
  'toddler', 'toddlers', 'elderly', 'elder', 'elders', 'old man', 'old woman',
  'senior', 'seniors', 'pregnant', 'pregnancy', 'disabled', 'disability',
  'wheelchair', 'blind', 'deaf', 'special needs', 'vulnerable',
];

const LOCATION_KEYWORDS = [
  'sector', 'shelter', 'street', 'village', 'district', 'zone',
  'area', 'block', 'ward', 'camp', 'colony', 'town', 'city',
  'hospital', 'school', 'bridge', 'road', 'lane', 'market',
  'station', 'airport', 'port', 'park', 'plaza', 'square',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalizes text to lowercase, trimmed string.
 * Always returns a string — never throws.
 *
 * @param {any} text
 * @returns {string}
 */
function normalizeText(text) {
  if (typeof text !== 'string') return '';
  return text.toLowerCase().trim();
}

/**
 * Checks whether any keyword from the list appears in the normalized text.
 * Uses whole-word boundary matching to avoid false positives.
 * Skips keywords preceded by negation words ("not", "non-", "no ").
 *
 * @param {string} normalizedText
 * @param {string[]} keywords
 * @returns {boolean}
 */
function containsAnyKeyword(normalizedText, keywords) {
  for (const keyword of keywords) {
    // Escape special regex chars in keyword, then wrap in word boundaries
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?<![a-z])${escaped}(?![a-z])`, 'i');
    if (pattern.test(normalizedText)) {
      // Check if the keyword is preceded by a negation word
      const negPattern = new RegExp(`(?:not|non-)\\s+${escaped}(?![a-z])`, 'i');
      if (negPattern.test(normalizedText)) continue;
      return true;
    }
  }
  return false;
}

// ─── Detection Functions ──────────────────────────────────────────────────────

/**
 * Detects urgency level from text.
 * Priority order: HIGH > MEDIUM > LOW > default MEDIUM.
 *
 * @param {string} normalizedText
 * @returns {'HIGH' | 'MEDIUM' | 'LOW'}
 */
function detectUrgency(normalizedText) {
  if (containsAnyKeyword(normalizedText, URGENCY_KEYWORDS.HIGH))   return 'HIGH';
  if (containsAnyKeyword(normalizedText, URGENCY_KEYWORDS.MEDIUM)) return 'MEDIUM';
  if (containsAnyKeyword(normalizedText, URGENCY_KEYWORDS.LOW))    return 'LOW';
  return 'LOW'; // safe default — no meaningful keywords found
}

function safeExtractPeople(text) {
    if (!text) return 0;
    const cleanText = text.replace(/(?:survey|id|report|sector|zone|ward)\s*#?\s*\d+/gi, '');
    const match = cleanText.match(/(\d+)\s*(?:[a-zA-Z]+\s*){0,3}(?:people|injured|bleeding|affected|trapped|families|victims)/i);
    return match ? parseInt(match[1], 10) : 0;
}

/**
 * Detects which needs are present in the text.
 * Always returns an array (may be empty).
 *
 * @param {string} normalizedText
 * @returns {string[]}
 */
function detectNeeds(normalizedText) {
  const detected = [];
  for (const [need, keywords] of Object.entries(NEEDS_KEYWORDS)) {
    if (containsAnyKeyword(normalizedText, keywords)) {
      detected.push(need);
    }
  }
  return detected;
}

/**
 * Detects whether the situation involves a medical emergency.
 *
 * @param {string} normalizedText
 * @returns {boolean}
 */
function detectHasMedical(normalizedText) {
  return containsAnyKeyword(normalizedText, MEDICAL_KEYWORDS);
}

/**
 * Detects whether vulnerable individuals (children, elderly, pregnant, etc.) are present.
 *
 * @param {string} normalizedText
 * @returns {boolean}
 */
function detectHasVulnerable(normalizedText) {
  return containsAnyKeyword(normalizedText, VULNERABLE_KEYWORDS);
}

function safeExtractLocation(text) {
    if (!text) return "Unknown Area";
    const match = text.match(/(?:sector|zone|ward|shelter|district|street|village|hospital|camp)\s+[a-zA-Z0-9]+/i);
    return match ? match[0].trim() : "Unknown Area";
}

/**
 * Builds a human-readable severity reason from detected signals.
 * Always returns a non-empty string.
 *
 * @param {string} urgency
 * @param {string[]} needs
 * @param {boolean} hasMedical
 * @param {boolean} hasVulnerable
 * @param {number} peopleCount
 * @returns {string}
 */
function buildSeverityReason(urgency, needs, hasMedical, hasVulnerable, peopleCount) {
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
  
  const flags = [];
  if (hasMedical) flags.push('medical');
  if (hasVulnerable) flags.push('vulnerable');
  const flagText = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
  
  return `Detected ${urgency} urgency ${needType} situation affecting ${peopleText}. Prioritized due to ${needReason}.${flagText}`;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Parses a disaster response text using keyword-based heuristics.
 * No external API. No crashes. Always returns a fully-populated object.
 *
 * @param {any} text - Raw input text (expected: string)
 * @returns {{
 *   urgency: 'HIGH' | 'MEDIUM' | 'LOW',
 *   needs: string[],
 *   people_count: number,
 *   location: string | null,
 *   severity_reason: string,
 *   has_medical: boolean,
 *   has_vulnerable: boolean
 * }}
 */
function fallbackParse(text) {
  // Normalize — safe even if text is null/undefined/non-string
  const normalized = normalizeText(text);

  const urgency      = detectUrgency(normalized);
  const needs        = detectNeeds(normalized);
  const people_count = safeExtractPeople(text);   // pass original to preserve digit casing
  const has_medical  = detectHasMedical(normalized);
  const has_vulnerable = detectHasVulnerable(normalized);

  // Location: extract from area keywords
  const location_tag = safeExtractLocation(text);

  const severity_reason = buildSeverityReason(urgency, needs, has_medical, has_vulnerable, people_count);

  return {
    urgency,
    needs,
    people_count,
    location_tag,
    severity_reason,
    has_medical,
    has_vulnerable,
  };
}

module.exports = { fallbackParse };
