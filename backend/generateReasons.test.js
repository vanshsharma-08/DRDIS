/**
 * generateReasons.test.js
 * Manual tests for generateReasons — no external libraries required.
 * Run: node backend/generateReasons.test.js
 */

const { generateReasons } = require("./reasoner");

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
// Test 1: high score + matching volunteer
// ---------------------------------------------------------------------------
console.log("\nTest 1 — high score + matching volunteer (3+ reasons)");
{
  const req = {
    urgency: "HIGH",
    has_medical: true,
    has_vulnerable: true,
    scale: 30,
    needs: ["first_aid", "search_rescue"],
  };
  const vol = { name: "Alice", skills: ["first_aid", "search_rescue"] };
  const result = generateReasons(req, 14, vol);
  assert("reasons length >= 2", result.reasons.length >= 2, true);
  assert("reasons is array", Array.isArray(result.reasons), true);
  console.log("  Reasons:");
  result.reasons.forEach((r) => console.log("   -", r));
}

// ---------------------------------------------------------------------------
// Test 2: moderate score + partial skill match
// ---------------------------------------------------------------------------
console.log("\nTest 2 — moderate score + partial skill match");
{
  const req = {
    urgency: "MEDIUM",
    has_medical: false,
    has_vulnerable: true,
    scale: 10,
    needs: ["first_aid", "cooking"],
  };
  const vol = { name: "Bob", skills: ["first_aid"] };
  const result = generateReasons(req, 9, vol);
  assert("reasons length >= 2", result.reasons.length >= 2, true);
  console.log("  Reasons:");
  result.reasons.forEach((r) => console.log("   -", r));
}

// ---------------------------------------------------------------------------
// Test 3: low score + fallback volunteer (empty object)
// ---------------------------------------------------------------------------
console.log("\nTest 3 — low score + fallback volunteer");
{
  const req = { urgency: "LOW", scale: 2, needs: ["surgery"] };
  const result = generateReasons(req, 3, {});
  assert("reasons length >= 2", result.reasons.length >= 2, true);
  console.log("  Reasons:");
  result.reasons.forEach((r) => console.log("   -", r));
}

// ---------------------------------------------------------------------------
// Test 4: null inputs → no crash, reasons still returned
// ---------------------------------------------------------------------------
console.log("\nTest 4 — null inputs (no crash)");
assertNoThrow("null inputs", () => {
  const result = generateReasons(null, null, null);
  assert("reasons length >= 2", result.reasons.length >= 2, true);
  console.log("  Reasons:");
  result.reasons.forEach((r) => console.log("   -", r));
});

// ---------------------------------------------------------------------------
// Test 5: undefined inputs → no crash
// ---------------------------------------------------------------------------
console.log("\nTest 5 — undefined inputs (no crash)");
assertNoThrow("undefined inputs", () => {
  const result = generateReasons(undefined, undefined, undefined);
  assert("reasons length >= 2", result.reasons.length >= 2, true);
});

// ---------------------------------------------------------------------------
// Test 6: no needs field → fallback reason about first available volunteer
// ---------------------------------------------------------------------------
console.log("\nTest 6 — request with no needs field");
{
  const req = { urgency: "LOW", scale: 5 };
  const vol = { name: "Carol", skills: ["driving"] };
  const result = generateReasons(req, 3, vol);
  assert("reasons length >= 2", result.reasons.length >= 2, true);
  console.log("  Reasons:");
  result.reasons.forEach((r) => console.log("   -", r));
}

// ---------------------------------------------------------------------------
// Test 7: string input for score → no crash
// ---------------------------------------------------------------------------
console.log("\nTest 7 — string input for score (no crash)");
assertNoThrow("string score", () => {
  const result = generateReasons({ urgency: "LOW" }, "not-a-number", { name: "Dan" });
  assert("reasons length >= 2", result.reasons.length >= 2, true);
});

// ---------------------------------------------------------------------------
// Test 8: all fields always defined
// ---------------------------------------------------------------------------
console.log("\nTest 8 — all fields always defined");
{
  const result = generateReasons(null, 3, null);
  assert("reasons defined", result.reasons !== undefined, true);
  assert("reasons is array", Array.isArray(result.reasons), true);
}

// ---------------------------------------------------------------------------
// Test 9: deterministic output — same input → same output
// ---------------------------------------------------------------------------
console.log("\nTest 9 — deterministic output");
{
  const req = { urgency: "HIGH", needs: ["first_aid"] };
  const vol = { name: "Eve", skills: ["first_aid"] };
  const r1 = generateReasons(req, 9, vol);
  const r2 = generateReasons(req, 9, vol);
  assert("same reasons", JSON.stringify(r1.reasons) === JSON.stringify(r2.reasons), true);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n─────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`─────────────────────────────\n`);
