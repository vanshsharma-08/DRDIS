/**
 * DRDIS — safeGeminiCall Tests
 * Covers: simulated API response, timeout, fallback, JSON parsing,
 * schema validation, safe defaults, no-crash guarantees, determinism.
 */

const { safeGeminiCall } = require('./safeGeminiCall');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REQUIRED_KEYS = ['urgency', 'needs', 'people_count', 'location', 'severity_reason', 'has_medical', 'has_vulnerable'];
const VALID_URGENCIES = ['HIGH', 'MEDIUM', 'LOW'];

function assertShape(result) {
  if (result === null || typeof result !== 'object' || Array.isArray(result))
    throw new Error(`Expected a plain object but got: ${typeof result}`);

  for (const key of REQUIRED_KEYS) {
    if (!(key in result))
      throw new Error(`Missing required key: "${key}"`);
    if (result[key] === undefined)
      throw new Error(`Key "${key}" is undefined — must have a defined value`);
  }

  if (!VALID_URGENCIES.includes(result.urgency))
    throw new Error(`urgency must be HIGH/MEDIUM/LOW, got: "${result.urgency}"`);

  if (!Array.isArray(result.needs))
    throw new Error(`needs must be an array, got: ${typeof result.needs}`);

  if (typeof result.people_count !== 'number' || !Number.isFinite(result.people_count) || result.people_count < 1)
    throw new Error(`people_count must be a finite number ≥ 1, got: ${result.people_count}`);

  if (result.location !== null && typeof result.location !== 'string')
    throw new Error(`location must be null or a string, got: ${typeof result.location}`);

  if (typeof result.severity_reason !== 'string' || result.severity_reason.trim().length === 0)
    throw new Error(`severity_reason must be a non-empty string`);

  if (typeof result.has_medical !== 'boolean')
    throw new Error(`has_medical must be boolean, got: ${typeof result.has_medical}`);

  if (typeof result.has_vulnerable !== 'boolean')
    throw new Error(`has_vulnerable must be boolean, got: ${typeof result.has_vulnerable}`);
}

// ─── Test Runner ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌  ${name}`);
    console.error(`       → ${err.message}`);
    failed++;
  }
}

// ─── Test Suites ─────────────────────────────────────────────────────────────

(async () => {

console.log('\n📦 safeGeminiCall — Test Suite\n');

// ── 1. Return shape guarantees ────────────────────────────────────────────────
console.log('1. Return shape guarantees');

await asyncTest('returns all 7 required keys for a normal string', async () => {
  const result = await safeGeminiCall('50 people trapped, need rescue and water urgently');
  assertShape(result);
});

await asyncTest('no key is undefined on valid input', async () => {
  const result = await safeGeminiCall('Flood in sector 4, children need food');
  for (const key of REQUIRED_KEYS) {
    if (result[key] === undefined) throw new Error(`Key "${key}" is undefined`);
  }
});

await asyncTest('urgency is always HIGH | MEDIUM | LOW', async () => {
  const inputs = ['critical emergency', 'need help', 'minor issue', '', null, undefined, 42];
  for (const input of inputs) {
    const r = await safeGeminiCall(input);
    if (!VALID_URGENCIES.includes(r.urgency))
      throw new Error(`Invalid urgency "${r.urgency}" for input: ${input}`);
  }
});

await asyncTest('needs is always an array', async () => {
  const inputs = ['food and water needed', '', null, 42];
  for (const input of inputs) {
    const r = await safeGeminiCall(input);
    if (!Array.isArray(r.needs)) throw new Error(`needs is not an array for input: ${input}`);
  }
});

await asyncTest('people_count is always a finite number ≥ 1', async () => {
  const inputs = ['30 people', 'no number here', '', null];
  for (const input of inputs) {
    const r = await safeGeminiCall(input);
    if (typeof r.people_count !== 'number' || !Number.isFinite(r.people_count) || r.people_count < 1)
      throw new Error(`Invalid people_count "${r.people_count}" for input: ${input}`);
  }
});

await asyncTest('severity_reason is always a non-empty string', async () => {
  const inputs = ['', null, undefined, 'critical emergency'];
  for (const input of inputs) {
    const r = await safeGeminiCall(input);
    if (typeof r.severity_reason !== 'string' || r.severity_reason.trim().length === 0)
      throw new Error(`severity_reason is empty/invalid for input: ${input}`);
  }
});

await asyncTest('has_medical is always boolean', async () => {
  const inputs = ['doctor needed', 'no medical', ''];
  for (const input of inputs) {
    const r = await safeGeminiCall(input);
    if (typeof r.has_medical !== 'boolean')
      throw new Error(`has_medical is not boolean for input: ${input}`);
  }
});

await asyncTest('has_vulnerable is always boolean', async () => {
  const inputs = ['elderly people', 'no vulnerable', ''];
  for (const input of inputs) {
    const r = await safeGeminiCall(input);
    if (typeof r.has_vulnerable !== 'boolean')
      throw new Error(`has_vulnerable is not boolean for input: ${input}`);
  }
});

// ── 2. Simulated API response correctness ─────────────────────────────────────
console.log('\n2. Simulated API response correctness');

await asyncTest('HIGH urgency detected from simulated response', async () => {
  const r = await safeGeminiCall('Critical emergency, people trapped');
  if (r.urgency !== 'HIGH') throw new Error(`Expected HIGH but got ${r.urgency}`);
});

await asyncTest('MEDIUM urgency detected from simulated response', async () => {
  const r = await safeGeminiCall('People are injured and stranded');
  if (r.urgency !== 'MEDIUM') throw new Error(`Expected MEDIUM but got ${r.urgency}`);
});

await asyncTest('LOW urgency detected from simulated response', async () => {
  const r = await safeGeminiCall('Stable situation, minor issue');
  if (r.urgency !== 'LOW') throw new Error(`Expected LOW but got ${r.urgency}`);
});

await asyncTest('needs detected from simulated response', async () => {
  const r = await safeGeminiCall('People need food and water urgently');
  if (!r.needs.includes('food')) throw new Error('Expected food need');
  if (!r.needs.includes('water')) throw new Error('Expected water need');
});

await asyncTest('people_count extracted from simulated response', async () => {
  const r = await safeGeminiCall('50 people trapped under rubble');
  if (r.people_count !== 50) throw new Error(`Expected 50 but got ${r.people_count}`);
});

await asyncTest('has_medical detected from simulated response', async () => {
  const r = await safeGeminiCall('Doctor needed, patient is bleeding');
  if (!r.has_medical) throw new Error('Expected has_medical=true');
});

await asyncTest('has_vulnerable detected from simulated response', async () => {
  const r = await safeGeminiCall('Children and elderly are stranded');
  if (!r.has_vulnerable) throw new Error('Expected has_vulnerable=true');
});

await asyncTest('location extracted from simulated response', async () => {
  const r = await safeGeminiCall('Flood at the village market');
  if (r.location === null) throw new Error('Expected a location but got null');
});

// ── 3. Safe defaults on bad input ─────────────────────────────────────────────
console.log('\n3. Safe defaults on bad / empty input');

await asyncTest('empty string → valid shape with safe defaults', async () => {
  const r = await safeGeminiCall('');
  assertShape(r);
  if (r.urgency !== 'MEDIUM') throw new Error(`Expected MEDIUM default but got ${r.urgency}`);
  if (r.people_count !== 1) throw new Error(`Expected people_count=1 but got ${r.people_count}`);
  if (r.needs.length !== 0) throw new Error(`Expected empty needs but got [${r.needs.join(', ')}]`);
  if (r.has_medical !== false) throw new Error('Expected has_medical=false');
  if (r.has_vulnerable !== false) throw new Error('Expected has_vulnerable=false');
});

await asyncTest('null input → valid shape, no crash', async () => {
  const r = await safeGeminiCall(null);
  assertShape(r);
});

await asyncTest('undefined input → valid shape, no crash', async () => {
  const r = await safeGeminiCall(undefined);
  assertShape(r);
});

await asyncTest('number input → valid shape, no crash', async () => {
  const r = await safeGeminiCall(42);
  assertShape(r);
});

await asyncTest('boolean input → valid shape, no crash', async () => {
  const r = await safeGeminiCall(true);
  assertShape(r);
});

await asyncTest('array input → valid shape, no crash', async () => {
  const r = await safeGeminiCall(['help', 'needed']);
  assertShape(r);
});

await asyncTest('object input → valid shape, no crash', async () => {
  const r = await safeGeminiCall({ text: 'emergency' });
  assertShape(r);
});

// ── 4. No-crash guarantees (crazy inputs) ─────────────────────────────────────
console.log('\n4. No-crash guarantees');

const crazyInputs = [
  undefined, null, '', 0, false, NaN, Infinity, -Infinity,
  Symbol('x'), () => {}, new Date(), /regex/, new Map(), new Set(),
  '   ', '\t\n\r', '!@#$%^&*()', '🔥💧🏥', 'x'.repeat(10000),
  '<script>alert("xss")</script>', '{"key":"value"}', '[]',
];

for (let i = 0; i < crazyInputs.length; i++) {
  const input = crazyInputs[i];
  await asyncTest(`no crash on crazy input #${i + 1}: ${String(input).slice(0, 40)}`, async () => {
    let result;
    try {
      result = await safeGeminiCall(input);
    } catch (err) {
      throw new Error(`safeGeminiCall threw an exception: ${err.message}`);
    }
    assertShape(result);
  });
}

// ── 5. Determinism ────────────────────────────────────────────────────────────
console.log('\n5. Determinism');

await asyncTest('same input always produces identical output', async () => {
  const input = '50 people trapped, need rescue and medical help urgently, children present';
  const r1 = await safeGeminiCall(input);
  const r2 = await safeGeminiCall(input);
  if (JSON.stringify(r1) !== JSON.stringify(r2))
    throw new Error('Non-deterministic output detected');
});

await asyncTest('different inputs produce different outputs', async () => {
  const r1 = await safeGeminiCall('Critical emergency, 100 people trapped');
  const r2 = await safeGeminiCall('Minor damage, stable situation');
  if (r1.urgency === r2.urgency && r1.people_count === r2.people_count)
    throw new Error('Expected different outputs for different inputs');
});

await asyncTest('calling 10 times returns same result', async () => {
  const input = 'Flood in sector 4, elderly people need water and food';
  const baseline = JSON.stringify(await safeGeminiCall(input));
  for (let i = 0; i < 10; i++) {
    if (JSON.stringify(await safeGeminiCall(input)) !== baseline)
      throw new Error(`Non-deterministic output on iteration ${i + 1}`);
  }
});

// ── 6. Real-world scenarios ───────────────────────────────────────────────────
console.log('\n6. Real-world scenarios');

await asyncTest('earthquake scenario', async () => {
  const r = await safeGeminiCall('Earthquake hit sector 7. 200 people trapped under rubble. Need rescue and medical help immediately. Many children and elderly.');
  assertShape(r);
  if (r.urgency !== 'HIGH') throw new Error(`Expected HIGH but got ${r.urgency}`);
  if (r.people_count !== 200) throw new Error(`Expected 200 but got ${r.people_count}`);
  if (!r.needs.includes('rescue')) throw new Error('Expected rescue need');
  if (!r.needs.includes('medical')) throw new Error('Expected medical need');
  if (!r.has_medical) throw new Error('Expected has_medical=true');
  if (!r.has_vulnerable) throw new Error('Expected has_vulnerable=true');
});

await asyncTest('flood scenario', async () => {
  const r = await safeGeminiCall('Flood has submerged the village. About 50 families stranded. No food or water. Pregnant women and infants present.');
  assertShape(r);
  if (r.urgency !== 'HIGH') throw new Error(`Expected HIGH but got ${r.urgency}`);
  if (r.people_count !== 50) throw new Error(`Expected 50 but got ${r.people_count}`);
  if (!r.needs.includes('food')) throw new Error('Expected food need');
  if (!r.needs.includes('water')) throw new Error('Expected water need');
  if (!r.has_vulnerable) throw new Error('Expected has_vulnerable=true');
});

await asyncTest('low-priority supply request scenario', async () => {
  const r = await safeGeminiCall('Stable situation at camp. Send blankets when available.');
  assertShape(r);
  if (r.urgency !== 'LOW') throw new Error(`Expected LOW but got ${r.urgency}`);
  if (r.has_medical) throw new Error('Expected has_medical=false');
  if (r.has_vulnerable) throw new Error('Expected has_vulnerable=false');
});

// ── 7. Returns a Promise (async behavior) ─────────────────────────────────────
console.log('\n7. Async behavior');

await asyncTest('returns a Promise', () => {
  const result = safeGeminiCall('test');
  if (!(result instanceof Promise)) throw new Error('Expected a Promise');
  return result;
});

await asyncTest('resolves within reasonable time (< 5s)', async () => {
  const start = Date.now();
  await safeGeminiCall('50 people trapped, need rescue');
  const elapsed = Date.now() - start;
  if (elapsed > 5000) throw new Error(`Took ${elapsed}ms, expected < 5000ms`);
});

// ── 8. Schema validation edge cases ───────────────────────────────────────────
console.log('\n8. Schema validation edge cases');

await asyncTest('result has no undefined fields', async () => {
  const r = await safeGeminiCall('Emergency at the bridge');
  for (const key of REQUIRED_KEYS) {
    if (r[key] === undefined) throw new Error(`Field "${key}" is undefined`);
  }
});

await asyncTest('needs array contains only strings', async () => {
  const r = await safeGeminiCall('People need food, water, and medical help');
  for (const need of r.needs) {
    if (typeof need !== 'string') throw new Error(`Need "${need}" is not a string`);
  }
});

await asyncTest('people_count is an integer', async () => {
  const r = await safeGeminiCall('About 30 people need help');
  if (!Number.isInteger(r.people_count))
    throw new Error(`people_count ${r.people_count} is not an integer`);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed > 0) {
  console.error('\n⚠️  Some tests failed. Fix the issues above.\n');
  process.exit(1);
} else {
  console.log('\n🎉  All tests passed!\n');
}

})();