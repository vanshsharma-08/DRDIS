/**
 * matchVolunteer.test.js
 * Manual tests for matchVolunteer — no external libraries required.
 * Run: node backend/matchVolunteer.test.js
 */

const { matchVolunteer } = require("./matcher");

let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    console.log(`  ✅ PASS | ${label} → ${actual}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL | ${label} → got ${actual}, expected ${expected}`);
    failed++;
  }
}

function assertNoThrow(label, fn) {
  try {
    fn();
    console.log(`  ✅ NO CRASH | ${label}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ CRASH | ${label} → ${e.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Test 1: best match selected — volunteer with most overlapping skills wins
// ---------------------------------------------------------------------------
console.log("\nTest 1 — best skill match selected");
{
  const request = { needs: ["first_aid", "search_rescue", "communication"] };
  const V1 = { name: "Alice", skills: ["first_aid"] };
  const V2 = { name: "Bob",   skills: ["first_aid", "search_rescue", "communication"] };
  const V3 = { name: "Carol", skills: ["driving"] };
  const result = matchVolunteer(request, [V1, V2, V3]);
  assert("volunteer is V2", result.volunteer === V2, true);
  assert("match_score", result.match_score, 3);
  assert("matched_skills length", result.matched_skills.length, 3);
  assert("is_fallback", result.is_fallback, false);
}

// ---------------------------------------------------------------------------
// Test 2: tie-breaking — earlier index wins
// ---------------------------------------------------------------------------
console.log("\nTest 2 — tie-breaking: earlier index wins");
{
  const request = { needs: ["first_aid"] };
  const V1 = { name: "Alice", skills: ["first_aid"] };
  const V2 = { name: "Bob",   skills: ["first_aid"] };
  const result = matchVolunteer(request, [V1, V2]);
  assert("volunteer is V1 (index 0)", result.volunteer === V1, true);
  assert("match_score", result.match_score, 1);
}

// ---------------------------------------------------------------------------
// Test 3: no skill match → fallback (first valid volunteer, is_fallback=true)
// ---------------------------------------------------------------------------
console.log("\nTest 3 — no skill match → fallback");
{
  const request = { needs: ["surgery"] };
  const V1 = { name: "Alice", skills: ["driving"] };
  const V2 = { name: "Bob",   skills: ["cooking"] };
  const result = matchVolunteer(request, [V1, V2]);
  assert("volunteer is V1 (fallback)", result.volunteer === V1, true);
  assert("match_score", result.match_score, 0);
  assert("matched_skills length", result.matched_skills.length, 0);
  assert("is_fallback", result.is_fallback, true);
}

// ---------------------------------------------------------------------------
// Test 4: empty volunteers array → FALLBACK with empty volunteer object
// ---------------------------------------------------------------------------
console.log("\nTest 4 — empty volunteers array (safe fallback)");
{
  const request = { needs: ["first_aid"] };
  const result = matchVolunteer(request, []);
  assert("volunteer is empty obj", JSON.stringify(result.volunteer), "{}");
  assert("match_score", result.match_score, 0);
  assert("matched_skills length", result.matched_skills.length, 0);
  assert("is_fallback", result.is_fallback, true);
}

// ---------------------------------------------------------------------------
// Test 5: null volunteers → safe fallback, no crash
// ---------------------------------------------------------------------------
console.log("\nTest 5 — null volunteers (no crash, safe fallback)");
assertNoThrow("null volunteers", () => {
  const result = matchVolunteer({ needs: ["first_aid"] }, null);
  assert("is_fallback", result.is_fallback, true);
  assert("match_score", result.match_score, 0);
});

// ---------------------------------------------------------------------------
// Test 6: null request → treats needs as empty, fallback returned
// ---------------------------------------------------------------------------
console.log("\nTest 6 — null request (no crash, fallback)");
assertNoThrow("null request", () => {
  const V1 = { name: "Alice", skills: ["first_aid"] };
  const result = matchVolunteer(null, [V1]);
  assert("is_fallback", result.is_fallback, true);
  assert("volunteer is V1", result.volunteer === V1, true);
});

// ---------------------------------------------------------------------------
// Test 7: request with no needs field → fallback
// ---------------------------------------------------------------------------
console.log("\nTest 7 — request with no needs field");
{
  const V1 = { name: "Alice", skills: ["first_aid"] };
  const result = matchVolunteer({}, [V1]);
  assert("is_fallback", result.is_fallback, true);
  assert("volunteer is V1", result.volunteer === V1, true);
}

// ---------------------------------------------------------------------------
// Test 8: case-insensitive skill matching
// ---------------------------------------------------------------------------
console.log("\nTest 8 — case-insensitive matching");
{
  const request = { needs: ["First_Aid", "SEARCH_RESCUE"] };
  const V1 = { name: "Alice", skills: ["first_aid", "search_rescue"] };
  const result = matchVolunteer(request, [V1]);
  assert("match_score", result.match_score, 2);
  assert("is_fallback", result.is_fallback, false);
}

// ---------------------------------------------------------------------------
// Test 9: array with invalid volunteer entries (null, string) filtered out
// Valid volunteer should still be matched
// ---------------------------------------------------------------------------
console.log("\nTest 9 — invalid volunteer entries filtered safely");
assertNoThrow("mixed volunteers", () => {
  const request = { needs: ["first_aid"] };
  const valid = { name: "Alice", skills: ["first_aid"] };
  const result = matchVolunteer(request, [null, "bad", valid]);
  assert("volunteer is valid", result.volunteer === valid, true);
  assert("match_score", result.match_score, 1);
  assert("is_fallback", result.is_fallback, false);
});

// ---------------------------------------------------------------------------
// Test 10: returned object always has all 4 fields defined
// ---------------------------------------------------------------------------
console.log("\nTest 10 — all fields always defined");
{
  const result = matchVolunteer(null, null);
  assert("volunteer defined", result.volunteer !== undefined, true);
  assert("match_score defined", result.match_score !== undefined, true);
  assert("matched_skills defined", result.matched_skills !== undefined, true);
  assert("is_fallback defined", result.is_fallback !== undefined, true);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n─────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`─────────────────────────────\n`);
