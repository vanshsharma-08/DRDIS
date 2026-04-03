/**
 * matcher.js - Volunteer matching logic for disaster response requests
 * Dev2 module: DO NOT modify Dev1 files
 */

/**
 * matchVolunteer(request, volunteers)
 * Matches the best volunteer to a request based on skill overlap.
 * Tie-breaking: earlier index in the array wins.
 * If no skills match, returns the first available volunteer as fallback.
 *
 * @param {object} request    - parsed request object with a `needs` array
 * @param {Array}  volunteers - array of volunteer objects with a `skills` array
 * @returns {{ volunteer: object, match_score: number, matched_skills: Array, is_fallback: boolean }}
 */
function matchVolunteer(request, volunteers) {
  const FALLBACK = {
    volunteer: {},
    match_score: 0,
    matched_skills: [],
    is_fallback: true,
  };

  const validVolunteers = Array.isArray(volunteers)
    ? volunteers.filter((v) => v != null && typeof v === "object")
    : [];

  if (validVolunteers.length === 0) {
    return FALLBACK;
  }

  const needs =
    request != null &&
    typeof request === "object" &&
    Array.isArray(request.needs)
      ? request.needs.filter((n) => typeof n === "string")
      : [];

  const needsSet = new Set(needs.map((n) => n.toLowerCase()));

  let bestIdx = 0;
  let bestScore = 0;
  let bestMatched = [];

  for (let i = 0; i < validVolunteers.length; i++) {
    const v = validVolunteers[i];
    const skills = Array.isArray(v.skills)
      ? v.skills.filter((s) => typeof s === "string")
      : [];

    const matched = skills.filter((s) => needsSet.has(s.toLowerCase()));

    if (matched.length > bestScore) {
      bestScore = matched.length;
      bestMatched = matched;
      bestIdx = i;
    }
    // equal score → earlier index (bestIdx) wins; no update
  }

  return {
    volunteer: validVolunteers[bestIdx],
    match_score: bestScore,
    matched_skills: bestMatched,
    is_fallback: bestScore === 0,
  };
}

module.exports = { matchVolunteer };
