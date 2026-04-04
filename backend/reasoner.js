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
  food: 50,
  water: 50, // Assuming water is similar to food in priority
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
 * Produces human-readable reasons explaining why a request was selected
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
  if (safeScore >= 9) {
    reasons.push(
      "This request scored " +
        safeScore +
        " out of 18, driven by high urgency and critical factors such as medical needs or vulnerable populations."
    );
  } else if (safeScore >= 6) {
    reasons.push(
      "This request scored " +
        safeScore +
        " out of 18, reflecting moderate urgency that places it ahead of lower-priority requests."
    );
  } else {
    reasons.push(
      "This request scored " +
        safeScore +
        " out of 18, indicating a baseline priority with minimal urgency indicators."
    );
  }

  const urgency = typeof r.urgency === "string" && r.urgency !== "" ? r.urgency : null;
  if (urgency) {
    reasons.push(
      "The request urgency level is set to " +
        urgency +
        ", which carries the heaviest weight in the scoring formula."
    );
  }

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
    reasons.push(
      "No volunteer with the required skills was available, so an untrained volunteer was assigned as a fallback to maintain response coverage."
    );
  } else if (skills.length > 0) {
    const matched = needs.filter((n) =>
      skills.some((s) => s.toLowerCase() === n.toLowerCase())
    );
    if (matched.length > 0) {
      const name = volName || "The selected volunteer";
      reasons.push(
        name +
          " was assigned because their skills (" +
          skills.join(", ") +
          ") directly cover " +
          matched.length +
          " of " +
          needs.length +
          " required needs for this request."
      );
    } else {
      const name = volName || "The selected volunteer";
      reasons.push(
        name +
          " was assigned as the closest available match, though no direct skill overlap was found for the required needs."
      );
    }
  }

  // Ensure at least 2 reasons
  if (reasons.length < 2) {
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
