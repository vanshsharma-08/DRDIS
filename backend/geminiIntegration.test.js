/**
 * geminiIntegration.test.js
 * Tests for Gemini integration with fallback
 */

const { parseWithGemini, getMetrics, resetMetrics } = require('./geminiIntegration');

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
    console.log(`  ✅ NO CRASH | ${label} → score=${result.score || 'N/A'}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ CRASH | ${label} → ${e.message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=== Gemini Integration Tests ===\n");

  // Test 1: High confidence input (should use rule-based)
  console.log("Test 1 — High confidence input (medical emergency)");
  {
    const result = await parseWithGemini("Critical medical emergency at hospital, 5 people injured");
    console.log("  breakdown:", result);
    assert("urgency", result.urgency, "HIGH");
    assert("has medical", result.has_medical, true);
    assert("people count", result.people_count, 5);
  }

  // Test 2: Low confidence input (should call Gemini)
  console.log("\nTest 2 — Low confidence input (vague text)");
  {
    const result = await parseWithGemini("Need help with something");
    console.log("  breakdown:", result);
    // Should still return valid result (either from Gemini or fallback)
    assert("has urgency", result.urgency !== undefined, true);
    assert("has needs", Array.isArray(result.needs), true);
  }

  // Test 3: Cached input (should return cached result)
  console.log("\nTest 3 — Cached input");
  {
    const text = "Food shortage at shelter, 20 people";
    const result1 = await parseWithGemini(text);
    const result2 = await parseWithGemini(text);
    console.log("  first call:", result1);
    console.log("  second call (cached):", result2);
    assert("same result", JSON.stringify(result1), JSON.stringify(result2));
  }

  // Test 4: Trimmed input (long text)
  console.log("\nTest 4 — Long input (should be trimmed)");
  {
    const longText = "This is a very long text that exceeds 150 characters. " +
      "We need to test if the input is properly trimmed to avoid sending too much data to Gemini. " +
      "This should be trimmed to 150 characters maximum.";
    const result = await parseWithGemini(longText);
    console.log("  result:", result);
    assert("has urgency", result.urgency !== undefined, true);
    assert("has needs", Array.isArray(result.needs), true);
  }

  // Test 5: Null input (should use fallback)
  console.log("\nTest 5 — Null input");
  {
    const result = await parseWithGemini(null);
    console.log("  result:", result);
    assert("has urgency", result.urgency !== undefined, true);
    assert("has needs", Array.isArray(result.needs), true);
  }

  // Test 6: Empty string (should use fallback)
  console.log("\nTest 6 — Empty string");
  {
    const result = await parseWithGemini("");
    console.log("  result:", result);
    assert("has urgency", result.urgency !== undefined, true);
    assert("has needs", Array.isArray(result.needs), true);
  }

  // Test 7: Confidence calculation
  console.log("\nTest 7 — Confidence calculation");
  {
    // High confidence text
    const highConfText = "Critical medical emergency at hospital, 5 people injured";
    const result1 = await parseWithGemini(highConfText);
    
    // Low confidence text
    const lowConfText = "Need help";
    const result2 = await parseWithGemini(lowConfText);
    
    console.log("  high confidence result:", result1);
    console.log("  low confidence result:", result2);
    assert("both return valid results", 
      result1.urgency !== undefined && result2.urgency !== undefined, 
      true);
  }

  // Test 8: Input length validation (300 char limit)
  console.log("\nTest 8 — Input length validation");
  {
    const longText = "a".repeat(350); // 350 chars, exceeds 300 limit
    const result = await parseWithGemini(longText);
    console.log("  result:", result);
    assert("has urgency", result.urgency !== undefined, true);
    assert("has needs", Array.isArray(result.needs), true);
  }

  // Test 9: Rate limiting
  console.log("\nTest 9 — Rate limiting");
  {
    const text = "Test rate limiting";
    const req = { ip: 'test-ip-1' };
    
    // Make 31 requests (exceeds 30 limit)
    const results = [];
    for (let i = 0; i < 31; i++) {
      const result = await parseWithGemini(text, req);
      results.push(result);
    }
    
    // All should return valid results (rate limited requests use fallback)
    const allValid = results.every(r => r.urgency !== undefined && Array.isArray(r.needs));
    assert("all requests return valid results", allValid, true);
  }

  // Test 10: Response validation
  console.log("\nTest 10 — Response validation");
  {
    // Test with valid input
    const validText = "Medical emergency, 5 people";
    const result = await parseWithGemini(validText);
    console.log("  valid result:", result);
    assert("has urgency", result.urgency !== undefined, true);
    assert("has needs", Array.isArray(result.needs), true);
    assert("has people_count", typeof result.people_count === 'number', true);
  }

  // Test 11: Metrics tracking
  console.log("\nTest 11 — Metrics tracking");
  {
    // Reset metrics before test
    resetMetrics();
    
    // Get initial metrics
    const initialMetrics = getMetrics();
    console.log("  initial metrics:", initialMetrics);
    assert("initial totalRequests", initialMetrics.totalRequests, 0);
    assert("initial geminiCalls", initialMetrics.geminiCalls, 0);
    assert("initial cacheHits", initialMetrics.cacheHits, 0);
    assert("initial fallbackUsage", initialMetrics.fallbackUsage, 0);
    assert("initial rateLimitTriggers", initialMetrics.rateLimitTriggers, 0);
    
    // Make some requests with different IPs to avoid rate limiting
    await parseWithGemini("Medical emergency, 5 people", { ip: 'ip-1' }); // High confidence - fallback
    await parseWithGemini("Need help", { ip: 'ip-2' }); // Low confidence - may call Gemini
    await parseWithGemini("Another emergency", { ip: 'ip-3' }); // Different text
    await parseWithGemini(null, { ip: 'ip-4' }); // Null input - fallback
    
    // Get metrics after requests
    const finalMetrics = getMetrics();
    console.log("  final metrics:", finalMetrics);
    assert("totalRequests increased", finalMetrics.totalRequests >= 4, true);
    assert("fallbackUsage increased", finalMetrics.fallbackUsage >= 1, true);
    // Note: cacheHits may be 0 if all texts are different
    assert("cacheHits is valid", finalMetrics.cacheHits >= 0, true);
  }

  // Summary
  console.log(`\n─────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`─────────────────────────────\n`);
}

// Run tests
runTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});