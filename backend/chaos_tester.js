/**
 * chaos_tester.js
 * Automated chaos testing for DRDIS backend
 * Run: node backend/chaos_tester.js
 */

const API_URL = "http://localhost:3001/analyze";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function logTest(name, passed, details = "") {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✅ PASS | ${name} ${details}`);
  } else {
    failedTests++;
    console.log(`❌ FAIL | ${name} ${details}`);
  }
}

async function testNullVoid() {
  console.log("\n--- Test 1: The 'Null Void' (Testing Unhandled Exceptions) ---");
  
  // Test 1a: null requests
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests: null }),
    });
    logTest("Null Void (null requests)", res.status === 400, `Status: ${res.status}`);
  } catch (e) {
    logTest("Null Void (null requests)", false, `Crashed: ${e.message}`);
  }

  // Test 1b: empty array
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [] }),
    });
    logTest("Null Void (empty array)", res.status === 400, `Status: ${res.status}`);
  } catch (e) {
    logTest("Null Void (empty array)", false, `Crashed: ${e.message}`);
  }

  // Test 1c: empty object
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    logTest("Null Void (empty object)", res.status === 400, `Status: ${res.status}`);
  } catch (e) {
    logTest("Null Void (empty object)", false, `Crashed: ${e.message}`);
  }
}

async function testWarAndPeace() {
  console.log("\n--- Test 2: The 'War and Peace' Attack (Testing Buffer/Regex Overload) ---");
  
  // Generate 10,000 character string
  const longText = "a".repeat(10000);
  
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ text: longText }] }),
    });
    const data = await res.json();
    logTest("War and Peace Attack", res.status === 200, `Status: ${res.status}, Source: ${data.source}`);
  } catch (e) {
    logTest("War and Peace Attack", false, `Crashed: ${e.message}`);
  }
}

async function testZalgoInjection() {
  console.log("\n--- Test 3: The 'Zalgo / Malicious Injection' (Testing Sanitization) ---");
  
  const maliciousText = "DROP TABLE volunteers; \n <script>alert(1)</script> \x00 ¥ÿï !";
  
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ text: maliciousText }] }),
    });
    const data = await res.json();
    const isSafe = res.status === 200 && 
                   (data.source === 'gemini' || data.source === 'rule') &&
                   (data.selected_request?.urgency === 'LOW' || !data.selected_request?.urgency);
    logTest("Zalgo Injection", isSafe, `Status: ${res.status}, Source: ${data.source}, Urgency: ${data.selected_request?.urgency || 'none'}`);
  } catch (e) {
    logTest("Zalgo Injection", false, `Crashed: ${e.message}`);
  }
}

async function testNGOParadox() {
  console.log("\n--- Test 4: The 'NGO Logic Paradox' (Testing Strict Prioritization) ---");
  
  const requests = [
    { text: "help" },
    { text: "Need 5 blankets for sector 2" },
    { text: "URGENT: 500 families stranded without clean water, disease spreading" }
  ];
  
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    });
    const data = await res.json();
    const selectedText = data.selected_request?.text || "";
    const isCorrect = selectedText.includes("500 families") && selectedText.includes("clean water");
    logTest("NGO Logic Paradox", isCorrect, `Selected: "${selectedText.substring(0, 50)}..."`);
  } catch (e) {
    logTest("NGO Logic Paradox", false, `Crashed: ${e.message}`);
  }
}

async function testConcurrentSpam() {
  console.log("\n--- Test 5: The 'Concurrent Spam' (Testing Race Conditions) ---");
  
  const validPayload = {
    requests: [{ text: "10 people need medical help" }]
  };
  
  const promises = Array(20).fill(null).map(() => 
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    }).then(res => res.json().then(data => ({ status: res.status, data })))
  );
  
  try {
    const results = await Promise.all(promises);
    const allSuccess = results.every(r => r.status === 200);
    const noCrashes = results.every(r => r.data && !r.data.error);
    logTest("Concurrent Spam (20 requests)", allSuccess && noCrashes, `Success: ${results.filter(r => r.status === 200).length}/20`);
  } catch (e) {
    logTest("Concurrent Spam (20 requests)", false, `Crashed: ${e.message}`);
  }
}

async function runAllTests() {
  console.log("🚀 Starting Chaos Tests for DRDIS Backend...\n");
  
  await testNullVoid();
  await testWarAndPeace();
  await testZalgoInjection();
  await testNGOParadox();
  await testConcurrentSpam();
  
  console.log("\n" + "=".repeat(50));
  console.log(`AUDIT REPORT: ${passedTests}/${totalTests} Tests Passed`);
  console.log("=".repeat(50));
  
  if (failedTests === 0) {
    console.log("✅ SYSTEM SURVIVED: All chaos tests passed.");
  } else {
    console.log(`❌ SYSTEM VULNERABLE: ${failedTests} test(s) failed.`);
  }
}

runAllTests().catch(err => {
  console.error("Fatal error in test runner:", err);
  process.exit(1);
});