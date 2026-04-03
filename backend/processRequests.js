/**
 * DRDIS — Request Processor
 * Orchestrates: validate → parse → assign priority → return results.
 * No exceptions. No crashes. No external API. Deterministic.
 *
 * Flow:
 *   1. validateInput(requests)
 *   2. normalize to [{ text }]
 *   3. parseAllRequests (fallbackParse for each)
 *   4. assignPriority for each parsed result
 *   5. return processed array
 */

const { validateInput } = require('./validator');
const { fallbackParse } = require('./fallbackParse');

// ─── Priority Constants ───────────────────────────────────────────────────────

const PRIORITY_MAP = {
  HIGH:   'HIGH',
  MEDIUM: 'MEDIUM',
  LOW:    'LOW',
};

const PRIORITY_REASON_MAP = {
  HIGH:   'critical/urgent situation detected',
  MEDIUM: 'moderate situation detected',
  LOW:    'low-priority situation detected',
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Parses all validated requests using fallbackParse.
 * Always returns an array of the same length as input.
 * Never throws.
 *
 * @param {Array<{ text: string }>} requests - Validated request objects
 * @returns {Array<object>} - Parsed results from fallbackParse
 */
function parseAllRequests(requests) {
  if (!Array.isArray(requests)) return [];

  const results = [];
  for (let i = 0; i < requests.length; i++) {
    const text = requests[i] && typeof requests[i].text === 'string' ? requests[i].text : '';
    results.push(fallbackParse(text));
  }
  return results;
}

/**
 * Assigns a priority level (P1/P2/P3) based on parsed urgency.
 * Always returns a valid priority object. Never throws.
 *
 * @param {object} parsed - A parsed request object with `urgency` field
 * @returns {{ priority: string, priority_reason: string }}
 */
function assignPriority(parsed) {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      priority: 'MEDIUM',
      priority_reason: 'unable to determine priority, defaulting to moderate',
    };
  }

  const urgency = parsed.urgency;

  if (urgency === 'HIGH') {
    return {
      priority: PRIORITY_MAP.HIGH,
      priority_reason: PRIORITY_REASON_MAP.HIGH,
    };
  }

  if (urgency === 'LOW') {
    return {
      priority: PRIORITY_MAP.LOW,
      priority_reason: PRIORITY_REASON_MAP.LOW,
    };
  }

  // Default to MEDIUM (P2)
  return {
    priority: PRIORITY_MAP.MEDIUM,
    priority_reason: PRIORITY_REASON_MAP.MEDIUM,
  };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Processes an array of disaster response requests.
 * Validates, parses, assigns priority, and returns structured results.
 *
 * On validation failure → returns { error, details }.
 * On success → returns { processed: [...] }.
 *
 * Never throws. Deterministic. No external API.
 *
 * @param {any} requests - Input array of request objects
 * @returns {{
 *   error?: string,
 *   details?: string[],
 *   processed?: Array<{
 *     original_text: string,
 *     parsed: object,
 *     priority: string,
 *     priority_reason: string
 *   }>
 * }}
 */
function processRequests(requests) {
  // Step 1: Validate input
  const validation = validateInput(requests);

  if (!validation.valid) {
    return {
      error: 'Validation failed',
      details: validation.errors,
    };
  }

  // Step 2: Normalize — validation.data is already [{ text: trimmedText }]
  const normalized = validation.data;

  // Step 3: Parse all requests
  const parsedResults = parseAllRequests(normalized);

  // Step 4: Assign priority for each parsed result
  const processed = [];
  for (let i = 0; i < normalized.length; i++) {
    const originalText = normalized[i].text;
    const parsed = parsedResults[i];
    const { priority, priority_reason } = assignPriority(parsed);

    processed.push({
      original_text: originalText,
      parsed,
      priority,
      priority_reason,
    });
  }

  // Step 5: Return
  return { processed };
}

module.exports = { processRequests, parseAllRequests, assignPriority };