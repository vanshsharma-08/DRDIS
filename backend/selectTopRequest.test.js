/**
 * selectTopRequest.test.js
 * Manual tests for selectTopRequest — no external libraries required.
 * Run: node backend/selectTopRequest.test.js
 */

const { selectTopRequest } = require("./reasoner");

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
// Test 1: highest score wins
// req A: HIGH + medical + 30 people → 172.37
// req B: MEDIUM + vulnerable + 10 people → 55.61
// ---------------------------------------------------------------------------
console.log("\nTest 1 — highest score selected (expect score=172.37)");
{
  const A = { urgency: "HIGH", has_medical: true, has_vulnerable: false, scale: 30, people_count: 30 };
  const B = { urgency: "MEDIUM", has_medical: false, has_vulnerable: true, scale: 10, people_count: 10 };
  const result = selectTopRequest([A, B]);
  assert("decision_score", result.decision_score, 172.37);
  assert("selected is A", result.selected_request === A, true);
  assert("all_requests length", result.all_requests.length, 2);
}

// ---------------------------------------------------------------------------
// Test 2: tie-breaking by people_count — higher wins
// A: HIGH urgency + people_count=5 → score = 30 (scale=0)
// B: HIGH urgency + people_count=50 → score = 55.61 (scale=2)
// B wins because higher score
// ---------------------------------------------------------------------------
console.log("\nTest 2 — higher people_count wins (expect B selected)");
{
  const A = { urgency: "HIGH", has_medical: false, has_vulnerable: false, people_count: 5 };
  const B = { urgency: "HIGH", has_medical: false, has_vulnerable: false, people_count: 50 };
  const result = selectTopRequest([A, B]);
  assert("decision_score", result.decision_score, 55.61);
  assert("selected is B", result.selected_request === B, true);
}

// ---------------------------------------------------------------------------
// Test 3: full tie (same score, same people_count) → earlier index wins
// ---------------------------------------------------------------------------
console.log("\nTest 3 — full tie → earlier index wins (expect A selected)");
{
  const A = { urgency: "HIGH", has_medical: false, has_vulnerable: false, scale: 0, people_count: 10 };
  const B = { urgency: "HIGH", has_medical: false, has_vulnerable: false, scale: 0, people_count: 10 };
  const result = selectTopRequest([A, B]);
  assert("selected is A (index 0)", result.selected_request === A, true);
}

// ---------------------------------------------------------------------------
// Test 4: single request → that request is selected
// ---------------------------------------------------------------------------
console.log("\nTest 4 — single request selected");
{
  const only = { urgency: "MEDIUM", has_medical: true, has_vulnerable: false, scale: 5, people_count: 5 };
  const result = selectTopRequest([only]);
  assert("selected is only", result.selected_request === only, true);
  assert("all_requests length", result.all_requests.length, 1);
}

// ---------------------------------------------------------------------------
// Test 5: empty array → safe defaults
// ---------------------------------------------------------------------------
console.log("\nTest 5 — empty array (safe defaults)");
{
  const result = selectTopRequest([]);
  assert("selected_request is null", result.selected_request, null);
  assert("decision_score is 0", result.decision_score, 0);
  assert("all_requests length", result.all_requests.length, 0);
}

// ---------------------------------------------------------------------------
// Test 6: null input → safe defaults, no crash
// ---------------------------------------------------------------------------
console.log("\nTest 6 — null input (no crash, safe defaults)");
assertNoThrow("null input", () => {
  const result = selectTopRequest(null);
  assert("selected_request is null", result.selected_request, null);
  assert("decision_score is 0", result.decision_score, 0);
});

// ---------------------------------------------------------------------------
// Test 7: array with invalid entries (null, string) — no crash
// Valid entry should still win
// ---------------------------------------------------------------------------
console.log("\nTest 7 — mixed valid + invalid entries (valid wins)");
assertNoThrow("mixed array", () => {
  const valid = { urgency: "HIGH", has_medical: true, has_vulnerable: true, scale: 25, people_count: 25 };
  const result = selectTopRequest([null, "bad", valid]);
  assert("selected is valid", result.selected_request === valid, true);
  assert("all_requests length", result.all_requests.length, 3);
});

// ---------------------------------------------------------------------------
// Test 8: all_requests contains original + score for each entry
// ---------------------------------------------------------------------------
console.log("\nTest 8 — all_requests structure check");
{
  const A = { urgency: "LOW", has_medical: false, has_vulnerable: false, scale: 0, people_count: 0 };
  const B = { urgency: "HIGH", has_medical: false, has_vulnerable: false, scale: 0, people_count: 0 };
  const result = selectTopRequest([A, B]);
  assert("all_requests[0].score", result.all_requests[0].score, 20);
  assert("all_requests[1].score", result.all_requests[1].score, 30);
  assert("all_requests[0].original === A", result.all_requests[0].original === A, true);
}

// ---------------------------------------------------------------------------
// Test 9: rank field — distinct scores get distinct ranks
// A: score=172.37 → rank 1, B: score=55.61 → rank 2, C: score=20 → rank 3
// ---------------------------------------------------------------------------
console.log("\nTest 9 — rank field with distinct scores");
{
  const A = { urgency: "HIGH", has_medical: true, has_vulnerable: false, scale: 30, people_count: 30 };
  const B = { urgency: "MEDIUM", has_medical: false, has_vulnerable: true, scale: 10, people_count: 10 };
  const C = { urgency: "LOW", has_medical: false, has_vulnerable: false, scale: 0, people_count: 0 };
  const result = selectTopRequest([A, B, C]);
  const rankA = result.all_requests.find((r) => r.original === A).rank;
  const rankB = result.all_requests.find((r) => r.original === B).rank;
  const rankC = result.all_requests.find((r) => r.original === C).rank;
  assert("rank of A (score=172.37)", rankA, 1);
  assert("rank of B (score=55.61)", rankB, 2);
  assert("rank of C (score=20)", rankC, 3);
}

// ---------------------------------------------------------------------------
// Test 10: rank field — tied scores share the same rank
// A and B: both HIGH urgency + people_count=5 → score=30 → both rank 1
// C: LOW urgency → score=20 → rank 3
// ---------------------------------------------------------------------------
console.log("\nTest 10 — rank field with tied scores");
{
  const A = { urgency: "HIGH", has_medical: false, has_vulnerable: false, people_count: 5 };
  const B = { urgency: "HIGH", has_medical: false, has_vulnerable: false, people_count: 5 };
  const C = { urgency: "LOW", has_medical: false, has_vulnerable: false, people_count: 0 };
  const result = selectTopRequest([A, B, C]);
  const rankA = result.all_requests.find((r) => r.original === A).rank;
  const rankB = result.all_requests.find((r) => r.original === B).rank;
  const rankC = result.all_requests.find((r) => r.original === C).rank;
  assert("rank of A (tied score=30)", rankA, 1);
  assert("rank of B (tied score=30)", rankB, 1);
  assert("rank of C (score=20) → rank 3", rankC, 3);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n─────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`─────────────────────────────\n`);
