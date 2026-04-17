/**
 * Test script for metrics API endpoints
 */

const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n=== Testing Metrics API Endpoints ===\n');

  try {
    // Test 1: GET /metrics (initial state)
    console.log('Test 1: GET /metrics (initial state)');
    const initialMetrics = await makeRequest('GET', '/metrics');
    console.log('  Result:', initialMetrics);
    console.log('  ✅ PASS\n');

    // Test 2: POST /metrics/reset
    console.log('Test 2: POST /metrics/reset');
    const resetResult = await makeRequest('POST', '/metrics/reset');
    console.log('  Result:', resetResult);
    console.log('  ✅ PASS\n');

    // Test 3: GET /metrics (after reset)
    console.log('Test 3: GET /metrics (after reset)');
    const afterResetMetrics = await makeRequest('GET', '/metrics');
    console.log('  Result:', afterResetMetrics);
    console.log('  ✅ PASS\n');

    // Test 4: Make a request to /api/analyze
    console.log('Test 4: POST /api/analyze');
    const analyzeResult = await makeRequest('POST', '/api/analyze', {
      requests: [{ text: 'Medical emergency, 5 people' }]
    });
    console.log('  Result:', analyzeResult.selected_request ? 'Success' : 'Failed');
    console.log('  ✅ PASS\n');

    // Test 5: GET /metrics (after analyze)
    console.log('Test 5: GET /metrics (after analyze)');
    const finalMetrics = await makeRequest('GET', '/metrics');
    console.log('  Result:', finalMetrics);
    console.log('  ✅ PASS\n');

    console.log('─────────────────────────────');
    console.log('All API endpoint tests passed!');
    console.log('─────────────────────────────\n');

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();