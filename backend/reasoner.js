/**
 * reasoner.js - Scoring logic for disaster response requests
 * Dev2 module: DO NOT modify Dev1 files
 */

const URGENCY_MAP = { HIGH: 3, MEDIUM: 2, LOW: 1 };

/**
 * scoreRequest(p)
 * Scores a parsed request using:
 *   (urgency × 3) + (medical × 3) + (vulnerable × 2) + (scale × 1)
 *
 * @param {object} p - parsed request object
 * @returns {{ score: number, breakdown: object }}
 */
function scoreRequest(p) {
  if (!p || typeof p !== "object") {
    return {
      score: 3,
      breakdown: { urgency: 1, medical: 0, vulnerable: 0, scale: 0 },
    };
  }

  const urgencyRaw =
    typeof p.urgency === "string" ? p.urgency.toUpperCase() : "";
  const urgencyScore =
    urgencyRaw in URGENCY_MAP ? URGENCY_MAP[urgencyRaw] : 1;

  const medicalScore = p.has_medical ? 1 : 0;

  const vulnerableScore = p.has_vulnerable ? 1 : 0;

  const people =
    typeof p.people_count === "number" && isFinite(p.people_count) ? p.people_count : 0;
  const scaleScore = people > 20 ? 2 : people > 5 ? 1 : 0;

  const score =
    urgencyScore * 3 +
    medicalScore * 3 +
    vulnerableScore * 2 +
    scaleScore * 1;

  return {
    score,
    breakdown: {
      urgency: urgencyScore,
      medical: medicalScore,
      vulnerable: vulnerableScore,
      scale: scaleScore,
    },
  };
}

/**
 * selectTopRequest(requests)
 * Scores all requests and selects the highest-scoring one.
 * Tie-breaking: higher people_count wins → earlier index wins.
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

  // Assign ranks by score descending (same score → same rank)
  const sorted = all_requests
    .map((entry, idx) => ({ idx, score: entry.score }))
    .sort((a, b) => b.score - a.score);

  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].score < sorted[i - 1].score) {
      currentRank = i + 1;
    }
    all_requests[sorted[i].idx].rank = currentRank;
  }

  let topIdx = 0;
  for (let i = 1; i < all_requests.length; i++) {
    const curr = all_requests[i];
    const best = all_requests[topIdx];

    if (curr.score > best.score) {
      topIdx = i;
    } else if (curr.score === best.score) {
      const currPeople =
        typeof curr.original.people_count === "number" &&
        isFinite(curr.original.people_count)
          ? curr.original.people_count
          : 0;
      const bestPeople =
        typeof best.original.people_count === "number" &&
        isFinite(best.original.people_count)
          ? best.original.people_count
          : 0;
      if (currPeople > bestPeople) {
        topIdx = i;
      }
      // equal people_count → earlier index (topIdx) wins; no update
    }
  }

  return {
    selected_request: all_requests[topIdx].original,
    decision_score: all_requests[topIdx].score,
    all_requests,
  };
}

/**
 * generateReasons(request, score, volunteer)
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
