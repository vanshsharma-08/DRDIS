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
// Test 1: HIGH urgency + medical + 30 people → score = 14
// (3×3) + (1×3) + (0×2) + (2×1) = 9+3+0+2 = 14
// ---------------------------------------------------------------------------
console.log("\nTest 1 — HIGH urgency + medical + 30 people (expect 14)");
{
  const result = scoreRequest({ urgency: "HIGH", has_medical: true, has_vulnerable: false, scale: 30 });
  console.log("  breakdown:", result.breakdown);
  assert("score", result.score, 14);
}

// ---------------------------------------------------------------------------
// Test 2: MEDIUM urgency + vulnerable + 10 people → score = 9
// (2×3) + (0×3) + (1×2) + (1×1) = 6+0+2+1 = 9
// ---------------------------------------------------------------------------
console.log("\nTest 2 — MEDIUM urgency + vulnerable + 10 people (expect 9)");
{
  const result = scoreRequest({ urgency: "MEDIUM", has_medical: false, has_vulnerable: true, scale: 10 });
  console.log("  breakdown:", result.breakdown);
  assert("score", result.score, 9);
}

// ---------------------------------------------------------------------------
// Test 3: LOW urgency, no medical, no vulnerable, ≤5 people → score = 3
// (1×3) + (0×3) + (0×2) + (0×1) = 3
// ---------------------------------------------------------------------------
console.log("\nTest 3 — LOW urgency only (expect 3)");
{
  const result = scoreRequest({ urgency: "LOW", has_medical: false, has_vulnerable: false, scale: 3 });
  console.log("  breakdown:", result.breakdown);
  assert("score", result.score, 3);
}

// ---------------------------------------------------------------------------
// Test 4: empty object → must not crash
// ---------------------------------------------------------------------------
console.log("\nTest 4 — empty object (no crash expected)");
assertNoThrow("empty object", () => scoreRequest({}));

// ---------------------------------------------------------------------------
// Test 5: null input → must not crash, score = 3 (LOW baseline)
// ---------------------------------------------------------------------------
console.log("\nTest 5 — null input (no crash, score=3 expected)");
assertNoThrow("null", () => {
  const result = scoreRequest(null);
  assert("score on null", result.score, 3);
  return result;
});

// ---------------------------------------------------------------------------
// Test 6: string input → must not crash, score = 3 (LOW baseline)
// ---------------------------------------------------------------------------
console.log("\nTest 6 — string input (no crash, score=3 expected)");
assertNoThrow("string", () => {
  const result = scoreRequest("disaster area");
  assert("score on string", result.score, 3);
  return result;
});

// ---------------------------------------------------------------------------
// Test 7: negative scale → treated as 0, scaleScore = 0
// ---------------------------------------------------------------------------
console.log("\nTest 7 — negative scale → scaleScore=0");
{
  const result = scoreRequest({ urgency: "HIGH", has_medical: false, has_vulnerable: false, scale: -10 });
  console.log("  breakdown:", result.breakdown);
  assert("scaleScore for negative", result.breakdown.scale, 0);
  // score = (3×3)+(0×3)+(0×2)+(0×1) = 9
  assert("score with negative scale", result.score, 9);
}

// ---------------------------------------------------------------------------
// Test 8: unknown urgency → fallback to LOW (urgencyScore = 1)
// ---------------------------------------------------------------------------
console.log("\nTest 8 — unknown urgency → fallback LOW (urgencyScore=1)");
{
  const result = scoreRequest({ urgency: "CRITICAL", has_medical: false, has_vulnerable: false, scale: 0 });
  console.log("  breakdown:", result.breakdown);
  assert("urgencyScore for unknown", result.breakdown.urgency, 1);
  // score = (1×3) = 3
  assert("score with unknown urgency", result.score, 3);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n─────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`─────────────────────────────\n`);
