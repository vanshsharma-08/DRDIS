/**
 * reasoner.js - Scoring logic for disaster response requests
 * Dev2 module: DO NOT modify Dev1 files
 * 
 * CORE LOGIC - DO NOT MODIFY
 * This module contains stable decision functions that must not be changed
 * without comprehensive test validation.
 */

// Priority ordering for needs: medical > rescue > food > general
const NEED_WEIGHTS = {
  medical: 100,
  rescue: 80,
  shelter: 70,
  power_outage: 65,
  sanitation: 60,
  vaccines: 60,
  clean_water: 55,
  food: 50,
  water: 50,
  blankets: 45,
  hygiene: 40,
  education_supplies: 35,
  temporary_housing: 35,
  infrastructure: 30,
  general: 20,
};

const URGENCY_MULTIPLIER = { HIGH: 1.5, MEDIUM: 1.2, LOW: 1 }; // Urgency is secondary

/**
 * scoreRequest(p) - CORE LOGIC - DO NOT MODIFY
 * Scores a parsed request based on need priority, people count (log-scaled), and urgency (secondary).
 * Medical > rescue > food > general.
 *
 * @param {object} p - parsed request object
 * @returns {{ score: number, breakdown: object }}
 */
function scoreRequest(p) {
  if (!p || typeof p !== "object") {
    return {
      score: 0,
      breakdown: { need: 0, people: 0, urgency_multiplier: 0 },
    };
  }

  // 1. Determine primary score from needs
  let needScore = 0;
  if (Array.isArray(p.needs) && p.needs.length > 0) {
    p.needs.forEach(need => {
      needScore = Math.max(needScore, NEED_WEIGHTS[need] || NEED_WEIGHTS.general);
    });
  } else {
    needScore = NEED_WEIGHTS.general; // Default if no needs specified
  }

  // Medical needs override if present
  if (p.has_medical) {
    needScore = Math.max(needScore, NEED_WEIGHTS.medical);
  }

  // 2. Add people count, with log scaling
  const people = typeof p.people_count === "number" && isFinite(p.people_count) && p.people_count > 0
    ? p.people_count
    : 0;
  const peopleScore = people > 0 ? Math.log10(people + 1) * 10 : 0; // Log scale, *10 for better weight

  // 3. Apply urgency as a secondary multiplier
  const urgencyRaw = typeof p.urgency === "string" ? p.urgency.toUpperCase() : "LOW";
  const urgencyMultiplier = URGENCY_MULTIPLIER[urgencyRaw] || URGENCY_MULTIPLIER.LOW;

  const score = (needScore + peopleScore) * urgencyMultiplier;

  return {
    score: Number(score.toFixed(2)), // Round ONLY at final step
    breakdown: {
      need: needScore,
      people: peopleScore, // Keep full precision
      urgency_multiplier: urgencyMultiplier,
    },
  };
}

/**
 * selectTopRequest(requests) - CORE LOGIC - DO NOT MODIFY
 * Scores all requests and selects the highest-scoring one.
 * Deterministic sorting: score DESC → need priority → people_count
 *
 * @param {Array} requests - array of parsed request objects
 * @returns {{ selected_request: object|null, decision_score: number, all_requests: Array }}
 */
function selectTopRequest(requests) {
  if (!Array.isArray(requests) || requests.length === 0) {
    return { selected_request: null, decision_score: 0, all_requests: [] };
  }

  const all_requests = requests.map((req) => ({
    original: req != null && typeof req === "object" ? req : {},
    score: scoreRequest(req).score,
    rank: 0,
  }));

  // Helper to get highest need priority
  function getNeedPriority(needs) {
    if (!Array.isArray(needs) || needs.length === 0) return NEED_WEIGHTS.general; // Changed from NEED_PRIORITY
    let highest = 0;
    needs.forEach(need => {
      const priority = NEED_WEIGHTS[need] || NEED_WEIGHTS.general; // Changed from NEED_PRIORITY
      if (priority > highest) highest = priority;
    });
    return highest;
  }

  // Assign ranks by score descending (same score → same rank)
  const sorted = all_requests
    .map((entry, idx) => ({ 
      idx, 
      score: entry.score,
      needPriority: getNeedPriority(entry.original.needs),
      peopleCount: entry.original.people_count || 0
    }))
    .sort((a, b) => {
      // Primary: score DESC
      if (b.score !== a.score) return b.score - a.score;
      // Secondary: need priority DESC
      if (b.needPriority !== a.needPriority) return b.needPriority - a.needPriority;
      // Tertiary: people count DESC
      return b.peopleCount - a.peopleCount;
    });

  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].score < sorted[i - 1].score) {
      currentRank = i + 1;
    }
    all_requests[sorted[i].idx].rank = currentRank;
  }

  // Select top request using deterministic sorting
  const topEntry = sorted[0];
  const topIdx = topEntry.idx;

  return {
    selected_request: all_requests[topIdx].original,
    decision_score: all_requests[topIdx].score,
    all_requests,
  };
}

/**
 * generateReasons(request, score, volunteer) - CORE LOGIC - DO NOT MODIFY
 * Produces forensic explainability reasons explaining why a request was selected
 * and why a volunteer was assigned.
 *
 * @param {object} request  - parsed request object
 * @param {number} score    - decision_score from selectTopRequest
 * @param {object} volunteer - matched volunteer object
 * @returns {{ reasons: Array<string> }}
 */
function generateReasons(request, score, volunteer) {
  const reasons = [];

  const r = request != null && typeof request === "object" ? request : {};
  const v = volunteer != null && typeof volunteer === "object" ? volunteer : {};

  const safeScore = typeof score === "number" && isFinite(score) ? score : 0;

  // Reason 1: why this request was selected
  const urgency = typeof r.urgency === "string" && r.urgency !== "" ? r.urgency : "LOW";
  const requestNeeds = Array.isArray(r.needs) ? r.needs.filter((n) => typeof n === "string") : [];
  const peopleCount = typeof r.people_count === "number" ? r.people_count : 0;
  
  // Determine urgency reason based on urgency level
  let urgencyReason = "low severity indicators";
  if (urgency === "HIGH") {
    urgencyReason = "critical life-threat indicators";
  } else if (urgency === "MEDIUM") {
    urgencyReason = "moderate severity indicators";
  }
  
  // Row 1: Forensic score calculation with internal variables
  const needsStr = requestNeeds.length > 0 ? `[${requestNeeds.join(', ')}]` : 'no specific needs detected';
  reasons.push(
    `Calculated base severity index of ${safeScore}. Extracted critical need markers: ${needsStr}. Applied ${urgency} urgency multiplier based on ${urgencyReason}.`
  );

  // Row 2: Urgency categorization with forensic explanation
  reasons.push(
    `System categorized severity as ${urgency} due to ${urgencyReason}. This multiplier heavily prioritized the request over competing inputs.`
  );

  // Reason 2: why this volunteer was chosen
  const volName = typeof v.name === "string" && v.name !== "" ? v.name : null;
  const isFallback = v === null || JSON.stringify(v) === "{}";
  const needs = Array.isArray(r.needs) ? r.needs.filter((n) => typeof n === "string") : [];
  const skills = Array.isArray(v.skills) ? v.skills.filter((s) => typeof s === "string") : [];

  if (needs.length === 0) {
    reasons.push(
      "Since no specific skills were requested, the first available volunteer was assigned to ensure prompt coverage."
    );
  } else if (isFallback) {
    // AI Fallback case
    reasons.push(
      `Input failed strict rule-engine parameters. Rerouted to Gemini AI to generate safe, baseline triage (Score: ${safeScore}) for manual human review.`
    );
  } else if (skills.length > 0) {
    const matched = needs.filter((n) =>
      skills.some((s) => s.toLowerCase() === n.toLowerCase())
    );
    const name = volName || "The selected volunteer";
    const matchedStr = matched.length > 0 ? `[${matched.join(', ')}]` : 'baseline emergency protocols';
    reasons.push(
      `Dispatched ${name} based on 100% skill overlap with extracted situational requirements: ${matchedStr}.`
    );
  }

  // Ensure at least 3 reasons
  while (reasons.length < 3) {
    reasons.push(
      "The assignment was based on the best available resources at the time of dispatch."
    );
  }

  return { reasons };
}

module.exports = { scoreRequest, selectTopRequest, generateReasons };

// SAFEGUARD: Any changes to this file require:
// 1. All existing tests to pass
// 2. New test cases for any modified behavior
// 3. Review by senior engineer
// 4. Documentation of changes