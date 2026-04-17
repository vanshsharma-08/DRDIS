/**
 * scoreRequest.test.js
 * Manual tests for scoreRequest — no external libraries required.
 * Run: node backend/scoreRequest.test.js
 */

const { scoreRequest } = require("./reasoner");

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
    const result = fn();
    console.log(`  ✅ NO CRASH | ${label} → score=${result.score}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ CRASH | ${label} → ${e.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Test 1: Medical, 30 people, HIGH urgency
// Expected: (100 + log10(31)*10) * 1.5 = (100 + 14.91) * 1.5 = 172.37
// ---------------------------------------------------------------------------
console.log("\nTest 1 — Medical, 30 people, HIGH urgency (expect 172.37)");
{
  const result = scoreRequest({ urgency: "HIGH", needs: ["medical"], people_count: 30 });
  console.log("  breakdown:", result.breakdown);
  assert("score", result.score, 172.37);
}

// ---------------------------------------------------------------------------
// Test 2: Rescue, 10 people, MEDIUM urgency
// Expected: (80 + log10(11)*10) * 1.2 = (80 + 10.41) * 1.2 = 108.50
// ---------------------------------------------------------------------------
console.log("\nTest 2 — Rescue, 10 people, MEDIUM urgency (expect 108.50)");
{
  const result = scoreRequest({ urgency: "MEDIUM", needs: ["rescue"], people_count: 10 });
  console.log("  breakdown:", result.breakdown);
  assert("score", result.score, 108.50);
}

// ---------------------------------------------------------------------------
// Test 3: Food, 3 people, LOW urgency
// Expected: (50 + log10(4)*10) * 1 = (50 + 6.02) * 1 = 56.02
// ---------------------------------------------------------------------------
console.log("\nTest 3 — Food, 3 people, LOW urgency (expect 56.02)");
{
  const result = scoreRequest({ urgency: "LOW", needs: ["food"], people_count: 3 });
  console.log("  breakdown:", result.breakdown);
  assert("score", result.score, 56.02);
}

// ---------------------------------------------------------------------------
// Test 4: empty object → must not crash
// ---------------------------------------------------------------------------
console.log("\nTest 4 — empty object (no crash expected)");
assertNoThrow("empty object", () => scoreRequest({}));

// ---------------------------------------------------------------------------
// Test 5: null input → must not crash, score = 0 (default baseline)
// ---------------------------------------------------------------------------
console.log("\nTest 5 — null input (no crash, score=0 expected)");
assertNoThrow("null", () => {
  const result = scoreRequest(null);
  assert("score on null", result.score, 0);
  return result;
});

// ---------------------------------------------------------------------------
// Test 6: string input → must not crash, score = 0 (default baseline)
// ---------------------------------------------------------------------------
console.log("\nTest 6 — string input (no crash, score=0 expected)");
assertNoThrow("string", () => {
  const result = scoreRequest("disaster area");
  assert("score on string", result.score, 0);
  return result;
});

// ---------------------------------------------------------------------------
// Test 7: negative people_count → treated as 0, peopleScore = 0
// Expected: (20 + 0) * 1.5 = 30
// ---------------------------------------------------------------------------
console.log("\nTest 7 — negative people_count → peopleScore=0");
{
  const result = scoreRequest({ urgency: "HIGH", needs: ["general"], people_count: -10 });
  console.log("  breakdown:", result.breakdown);
  assert("people for negative", result.breakdown.people, 0);
  assert("score with negative people_count", result.score, 30);
}

// ---------------------------------------------------------------------------
// Test 8: unknown urgency → fallback to LOW multiplier (1)
// Expected: (20 + 0) * 1 = 20
// ---------------------------------------------------------------------------
console.log("\nTest 8 — unknown urgency → fallback LOW (multiplier=1)");
{
  const result = scoreRequest({ urgency: "CRITICAL", needs: ["general"], people_count: 0 });
  console.log("  breakdown:", result.breakdown);
  assert("urgency_multiplier for unknown", result.breakdown.urgency_multiplier, 1);
  assert("score with unknown urgency", result.score, 20);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n─────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`─────────────────────────────\n`);
