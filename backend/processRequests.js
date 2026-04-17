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
    // DO NOT SPLIT. Parse the whole text at once.
    const parsed = fallbackParse(text);
    if (parsed.needs.length === 0) parsed.needs = ['general'];
    results.push(parsed);
  }
  return results;
}

/**
 * Merges multiple parsed segments into a single parsed object.
 * Combines needs, takes highest urgency, sums people_count, etc.
 * @param {Array<object>} segments
 * @returns {object}
 */
function mergeParsedSegments(segments) {
  if (segments.length === 0) {
    return fallbackParse('');
  }
  
  if (segments.length === 1) {
    return segments[0];
  }
  
  // Merge logic
  const merged = {
    urgency: 'LOW',
    needs: [],
    people_count: 0,
    location_tag: 'Unknown Area',
    severity_reason: '',
    has_medical: false,
    has_vulnerable: false,
  };
  
  // Priority: HIGH > MEDIUM > LOW
  const urgencyOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  let highestUrgency = 'LOW';
  
  segments.forEach(seg => {
    // Merge urgency (highest wins)
    if (urgencyOrder[seg.urgency] > urgencyOrder[highestUrgency]) {
      highestUrgency = seg.urgency;
    }
    
    // Merge needs (unique)
    seg.needs.forEach(need => {
      if (!merged.needs.includes(need)) {
        merged.needs.push(need);
      }
    });
    
    // Use max people_count instead of summing to avoid aggregation bugs
    merged.people_count = Math.max(merged.people_count, seg.people_count || 0);
    
    // Merge medical/vulnerable flags (OR logic)
    merged.has_medical = merged.has_medical || seg.has_medical;
    merged.has_vulnerable = merged.has_vulnerable || seg.has_vulnerable;
    
    // Merge location (use first non-Unknown Area)
    if (seg.location_tag && seg.location_tag !== 'Unknown Area' && merged.location_tag === 'Unknown Area') {
      merged.location_tag = seg.location_tag;
    }
  });
  
  merged.urgency = highestUrgency;
  
  // Ensure needs array is not empty
  if (merged.needs.length === 0) {
    merged.needs = ['general'];
  }
  
  // Rebuild severity reason
  merged.severity_reason = buildSeverityReason(
    merged.urgency,
    merged.needs,
    merged.has_medical,
    merged.has_vulnerable,
    merged.people_count
  );
  
  return merged;
}

// Helper function (copied from fallbackParse.js for use in merge)
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
  
  return `Detected ${urgency} urgency ${needType} situation affecting ${peopleText}. Prioritized due to ${needReason}.`;
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
 *     priority_reason: string,
 *     source: string
 *   }>
 * }}
 */
function processRequests(requests) {
  try {
    // Guard Clause (Input Type): First, check if the input is truthy and is an Array.
    if (!requests || !Array.isArray(requests)) {
      return {
        error: 'Validation failed',
        details: ['Input must be a non-empty array'],
      };
    }

    // Step 1: Validate input
    const validation = validateInput(requests);

    if (!validation.valid) {
      return {
        error: 'Validation failed',
        details: validation.errors || [],
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
        source: 'rule',
      });
    }

    // Step 5: Return
    return { processed };
  } catch (err) {
    return {
      error: 'Validation failed',
      details: [err.message || 'Internal processing error'],
    };
  }
}

module.exports = { processRequests, parseAllRequests, assignPriority };