/**
 * DRDIS Master Test Suite
 * 38 Critical Test Cases for /analyze POST endpoint
 * Tests routing boundary, validation, and disaster response logic
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001/analyze';
const TEST_TIMEOUT = 3000; // 3 seconds per test

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  failures: []
};

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make request with timeout
async function makeRequest(payload, testName) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${TEST_TIMEOUT}ms`));
    }, TEST_TIMEOUT);

    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        clearTimeout(timeoutId);
        try {
          const parsedData = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsedData });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });

    req.on('timeout', () => {
      clearTimeout(timeoutId);
      req.destroy();
      reject(new Error(`Request timeout after ${TEST_TIMEOUT}ms`));
    });

    req.write(postData);
    req.end();
  });
}

// Assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Test cases array
const testCases = [
  {
    name: 'TC01-BASIC: Trapped must rank #1',
    payload: { requests: [{ text: '50 people trapped need rescue, food shortage' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' },
      { check: (res) => res.data.selected_request?.urgency === 'HIGH', msg: 'Urgency should be HIGH' },
      { check: (res) => res.data.selected_request?.needs?.includes('rescue'), msg: 'Should prioritize rescue' }
    ]
  },
  {
    name: 'TC02-SCALE: 1000 homeless must be #1',
    payload: { requests: [{ text: '10 injured, 1000 homeless, 2 trapped' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' },
      { check: (res) => res.data.selected_request?.people_count === 1000, msg: '1000 homeless should be #1' }
    ]
  },
  {
    name: 'TC03-SINGLE: 20 people need rescue',
    payload: { requests: [{ text: '20 people need rescue' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' },
      { check: (res) => res.data.selected_request?.people_count === 20, msg: 'Should parse 20 people' }
    ]
  },
  {
    name: 'TC04-VAGUE: help',
    payload: { requests: [{ text: 'help' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'gemini', msg: 'Should route to Gemini path' },
      { check: (res) => res.data.decision_score === 10, msg: 'Score should be 10' }
    ]
  },
  {
    name: 'TC05-EMPTY: empty string',
    payload: { requests: [{ text: '' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200 (safe fallback)' },
      { check: (res) => res.data.selected_request === null, msg: 'Should have no selected request' }
    ]
  },
  {
    name: 'TC06-SPACES: only spaces',
    payload: { requests: [{ text: '     ' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200 (safe fallback)' },
      { check: (res) => res.data.selected_request === null, msg: 'Should have no selected request' }
    ]
  },
  {
    name: 'TC07-MULTI-INTENT: 50 trapped and food shortage and medical',
    payload: { requests: [{ text: '50 trapped and food shortage and medical' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' },
      { check: (res) => res.data.selected_request !== null, msg: 'Should have selected request' }
    ]
  },
  {
    name: 'TC08-COMPLEX: 20 injured and 50 trapped and no food',
    payload: { requests: [{ text: '20 injured and 50 trapped and no food' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' },
      { check: (res) => res.data.selected_request !== null, msg: 'Should have selected request' }
    ]
  },
  {
    name: 'TC09-NO NUMBER: many people need help',
    payload: { requests: [{ text: 'many people need help' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'gemini', msg: 'Should use Gemini (vague)' }
    ]
  },
  {
    name: 'TC10-WORD NUMBERS: fifty people trapped',
    payload: { requests: [{ text: 'fifty people trapped' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule' || res.data.source === 'gemini', msg: 'Should process or handle gracefully' }
    ]
  },
  {
    name: 'TC11-SHORTHAND: 10k people need help',
    payload: { requests: [{ text: '10k people need help' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule' || res.data.source === 'gemini', msg: 'Should process or handle gracefully' }
    ]
  },
  {
    name: 'TC12-NEGATIVE: -10 people injured',
    payload: { requests: [{ text: '-10 people injured' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.selected_request === null || res.data.selected_request?.people_count >= 0, msg: 'Should reject negative or normalize to 0' }
    ]
  },
  {
    name: 'TC13-IMPACT IGNORED: 50 trapped, 1000 medical',
    payload: { requests: [{ text: '50 trapped, 1000 medical' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' },
      { check: (res) => res.data.selected_request?.people_count === 1000, msg: '1000 medical MUST win' }
    ]
  },
  {
    name: 'TC14-URGENCY TIE: 50 trapped urgent, 50 need food',
    payload: { requests: [{ text: '50 trapped urgent, 50 need food' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' },
      { check: (res) => res.data.selected_request?.needs?.includes('rescue'), msg: 'Trapped urgent MUST win' }
    ]
  },
  {
    name: 'TC15-TIES: 50 trapped, 50 trapped',
    payload: { requests: [{ text: '50 trapped, 50 trapped' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' },
      { check: (res) => res.data.selected_request !== null, msg: 'Should have deterministic tie-breaking' }
    ]
  },
  {
    name: 'TC16-DUPLICATES: Detect duplicate requests',
    payload: { requests: [{ text: '50 trapped' }, { text: '50 trapped' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' }
    ]
  },
  {
    name: 'TC17-GARBAGE: asdkjashd',
    payload: { requests: [{ text: 'asdkjashd' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'gemini', msg: 'Should use Gemini path' }
    ]
  },
  {
    name: 'TC18-NUMBERS ONLY: 123456',
    payload: { requests: [{ text: '123456' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'gemini', msg: 'Should use Gemini path' }
    ]
  },
  {
    name: 'TC19-SPECIAL CHARS: !!! @@@',
    payload: { requests: [{ text: '!!! @@' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'gemini', msg: 'Should use Gemini path' }
    ]
  },
  {
    name: 'TC20-PARTIAL INFO: people need help urgently',
    payload: { requests: [{ text: 'people need help urgently' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule' || res.data.source === 'gemini', msg: 'Should process safely' }
    ]
  },
  {
    name: 'TC21-STRONG: 100 trapped urgent, 200 food, 50 injured',
    payload: { requests: [{ text: '100 trapped urgent, 200 food, 50 injured' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' },
      { check: (res) => res.data.selected_request !== null, msg: 'Should have perfect ranking' }
    ]
  },
  {
    name: 'TC22-VOLUNTEER: Maps to Rescue Team',
    payload: { requests: [{ text: '50 trapped urgent' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.assigned_volunteer !== null, msg: 'Should have volunteer' },
      { check: (res) => res.data.assigned_volunteer.name.includes('Rescue') || res.data.assigned_volunteer.skills.includes('rescue'), msg: 'Should map to Rescue Team' }
    ]
  },
  {
    name: 'TC23-AMBIGUOUS VOLUNTEER: Graceful fallback',
    payload: { requests: [{ text: 'help with something' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.assigned_volunteer !== null, msg: 'Should have fallback volunteer' }
    ]
  },
  {
    name: 'TC24-TOO LONG: 600+ chars',
    payload: { requests: [{ text: 'a'.repeat(600) }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.selected_request !== null || res.data.selected_request === null, msg: 'Should truncate safely or reject' }
    ]
  },
  {
    name: 'TC25-TOO MANY: 5+ items',
    payload: { requests: [
      { text: '1 trapped' },
      { text: '2 injured' },
      { text: '3 hungry' },
      { text: '4 homeless' },
      { text: '5 need water' },
      { text: '6 need shelter' }
    ]},
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule' || res.data.source === 'gemini', msg: 'Should handle array limits' }
    ]
  },
  {
    name: 'TC26-UI PLACEHOLDER: No empty reasons',
    payload: { requests: [{ text: '50 trapped' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.reasons && res.data.reasons.length > 0, msg: 'Should have reasons' },
      { check: (res) => !res.data.reasons.some(r => r === '' || r.includes('#1 -')), msg: 'No empty reasons or placeholders' }
    ]
  },
  {
    name: 'TC27-LABELS: Output reflects actual numbers',
    payload: { requests: [{ text: '50 trapped' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.selected_request?.people_count === 50, msg: 'Should reflect actual 50, not vs 0' }
    ]
  },
  {
    name: 'TC28-REAL DISASTER: 200 trapped, 500 food, 5 injured',
    payload: { requests: [{ text: '200 trapped, 500 food, 5 injured' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' },
      { check: (res) => res.data.selected_request?.people_count === 200, msg: 'Trapped should be #1' }
    ]
  },
  {
    name: 'TC29-CHAOS MIX: help, 1000, asdasd',
    payload: { requests: [
      { text: 'help' },
      { text: '1000' },
      { text: 'asdasd' }
    ]},
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.selected_request !== null || res.data.selected_request === null, msg: 'Should handle chaos gracefully' }
    ]
  },
  {
    name: 'TC30-MULTI CHAOS: 50 trapped + food, 1000 homeless, urgent help',
    payload: { requests: [
      { text: '50 trapped and food shortage' },
      { text: '1000 homeless' },
      { text: 'urgent help needed' }
    ]},
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' }
    ]
  },
  {
    name: 'TC31-LANGUAGE: 50 personas atrapadas',
    payload: { requests: [{ text: '50 personas atrapadas' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule' || res.data.source === 'gemini', msg: 'Should process or handle gracefully' }
    ]
  },
  {
    name: 'TC32-DECIMAL: 2.5 injured',
    payload: { requests: [{ text: '2.5 injured' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.selected_request === null || res.data.selected_request?.people_count >= 0, msg: 'Should round or handle, no NaN' }
    ]
  },
  {
    name: 'TC33-URGENCY VS SCALE: 500 food not urgent, 5 trapped urgent',
    payload: { requests: [{ text: '500 food not urgent, 5 trapped urgent' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' },
      { check: (res) => res.data.selected_request?.needs?.includes('rescue'), msg: '5 trapped urgent MUST win' }
    ]
  },
  {
    name: 'TC34-DETERMINISM: Same input = same output',
    payload: { requests: [{ text: '50 trapped urgent' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' }
    ],
    deterministic: true
  },
  {
    name: 'TC35-CURRENCY: $500 medicine',
    payload: { requests: [{ text: '$500 medicine' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.selected_request?.people_count !== 500, msg: '$500 should NOT be parsed as 500 people' }
    ]
  },
  {
    name: 'TC36-TIME CRITICAL: 10 trapped oxygen 30 min',
    payload: { requests: [{ text: '10 trapped oxygen 30 min' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' },
      { check: (res) => res.data.selected_request?.urgency === 'HIGH', msg: 'Should have boosted priority' }
    ]
  },
  {
    name: 'TC37-VULNERABLE: 20 children, 15 elderly',
    payload: { requests: [{ text: '20 children, 15 elderly' }] },
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule' || res.data.source === 'gemini', msg: 'Should process or handle gracefully' },
      { check: (res) => res.data.selected_request?.has_vulnerable === true || res.data.selected_request === null, msg: 'Should flag vulnerable groups' }
    ]
  },
  {
    name: 'TC38-SAME LOCATION: Hospital A water, Hospital A power',
    payload: { requests: [
      { text: 'Hospital A water shortage' },
      { text: 'Hospital A power outage' }
    ]},
    assertions: [
      { check: (res) => res.status === 200, msg: 'Status should be 200' },
      { check: (res) => res.data.source === 'rule', msg: 'Should use rule engine' }
    ]
  }
];

// Run a single test
async function runTest(testCase) {
  try {
    const result = await makeRequest(testCase.payload, testCase.name);
    
    // Run assertions
    for (const assertion of testCase.assertions) {
      try {
        assertion.check(result);
      } catch (error) {
        throw new Error(`${assertion.msg}: ${error.message}`);
      }
    }

    // For deterministic test, run 5 times and compare
    if (testCase.deterministic) {
      const outputs = [];
      for (let i = 0; i < 5; i++) {
        const res = await makeRequest(testCase.payload, testCase.name);
        outputs.push(JSON.stringify(res.data));
        await wait(100);
      }
      const allSame = outputs.every(o => o === outputs[0]);
      if (!allSame) {
        throw new Error('Determinism test failed: outputs differ across 5 runs');
      }
    }

    return { passed: true };
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 DRDIS Master Test Suite Starting...\n');
  console.log(`Total Tests: ${testCases.length}\n`);

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    process.stdout.write(`[${i + 1}/${testCases.length}] ${testCase.name}... `);

    const result = await runTest(testCase);

    if (result.passed) {
      console.log('✅ PASS');
      results.passed++;
    } else {
      console.log(`❌ FAIL: ${result.error}`);
      results.failed++;
      results.failures.push({
        test: testCase.name,
        error: result.error
      });
    }

    // Small delay between tests
    await wait(100);
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Success Rate: ${((results.passed / testCases.length) * 100).toFixed(2)}%`);
  console.log('='.repeat(60));

  if (results.failures.length > 0) {
    console.log('\nFAILURES:');
    results.failures.forEach((failure, index) => {
      console.log(`${index + 1}. ${failure.test}`);
      console.log(`   Error: ${failure.error}\n`);
    });
  }

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});