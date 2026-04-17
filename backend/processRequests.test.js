/**
 * DRDIS — processRequests Tests
 * Covers: validation failure, successful processing, priority assignment,
 * parseAllRequests, assignPriority, safe defaults, no-crash guarantees, determinism.
 */

const { processRequests, parseAllRequests, assignPriority } = require('./processRequests');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REQUIRED_PROCESSED_KEYS = ['original_text', 'parsed', 'priority', 'priority_reason'];
const VALID_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];

function assertProcessedItem(item) {
  if (item === null || typeof item !== 'object' || Array.isArray(item))
    throw new Error(`Expected a plain object but got: ${typeof item}`);

  for (const key of REQUIRED_PROCESSED_KEYS) {
    if (!(key in item))
      throw new Error(`Missing required key: "${key}"`);
    if (item[key] === undefined)
      throw new Error(`Key "${key}" is undefined — must have a defined value`);
  }

  if (typeof item.original_text !== 'string')
    throw new Error(`original_text must be a string, got: ${typeof item.original_text}`);

  if (item.parsed === null || typeof item.parsed !== 'object' || Array.isArray(item.parsed))
    throw new Error(`parsed must be a plain object`);

  if (!VALID_PRIORITIES.includes(item.priority))
    throw new Error(`priority must be HIGH/MEDIUM/LOW, got: "${item.priority}"`);

  if (typeof item.priority_reason !== 'string' || item.priority_reason.trim().length === 0)
    throw new Error(`priority_reason must be a non-empty string`);
}

function assertSuccessResult(result) {
  if (result === null || typeof result !== 'object' || Array.isArray(result))
    throw new Error(`Expected a plain object but got: ${typeof result}`);

  if ('error' in result)
    throw new Error(`Expected success but got error: ${result.error}`);

  if (!('processed' in result))
    throw new Error(`Missing "processed" key`);

  if (!Array.isArray(result.processed))
    throw new Error(`processed must be an array`);

  for (const item of result.processed) {
    assertProcessedItem(item);
  }
}

function assertErrorResult(result, expectedErrorFragment) {
  if (result === null || typeof result !== 'object' || Array.isArray(result))
    throw new Error(`Expected a plain object but got: ${typeof result}`);

  if (!('error' in result))
    throw new Error(`Expected "error" key but it's missing`);

  if (typeof result.error !== 'string')
    throw new Error(`error must be a string`);

  if (!('details' in result))
    throw new Error(`Missing "details" key`);

  if (!Array.isArray(result.details))
    throw new Error(`details must be an array`);

  if (expectedErrorFragment) {
    // Check if the fragment appears in the error message OR in any detail message
    const inError = result.error.toLowerCase().includes(expectedErrorFragment.toLowerCase());
    const inDetails = result.details.some((d) =>
      typeof d === 'string' && d.toLowerCase().includes(expectedErrorFragment.toLowerCase())
    );
    if (!inError && !inDetails)
      throw new Error(
        `Expected error/detail containing "${expectedErrorFragment}" but got error: "${result.error}", details: [${result.details.join(', ')}]`
      );
  }
}

// ─── Test Runner ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌  ${name}`);
    console.error(`       → ${err.message}`);
    failed++;
  }
}

// ─── Test Suites ─────────────────────────────────────────────────────────────

console.log('\n📦 processRequests — Test Suite\n');

// ── 1. Validation failure paths ───────────────────────────────────────────────
console.log('1. Validation failure paths');

test('null input → error', () => {
  const r = processRequests(null);
  assertErrorResult(r, 'array');
});

test('undefined input → error', () => {
  const r = processRequests(undefined);
  assertErrorResult(r, 'array');
});

test('string input → error', () => {
  const r = processRequests('hello');
  assertErrorResult(r, 'array');
});

test('number input → error', () => {
  const r = processRequests(42);
  assertErrorResult(r, 'array');
});

test('object input → error', () => {
  const r = processRequests({ text: 'hi' });
  assertErrorResult(r, 'array');
});

test('empty array → error', () => {
  const r = processRequests([]);
  assertErrorResult(r, '1');
});

test('array of 11 → error', () => {
  const input = Array.from({ length: 11 }, (_, i) => ({ text: `Request ${i + 1}` }));
  const r = processRequests(input);
  assertErrorResult(r, '10');
});

test('item missing "text" → error', () => {
  const r = processRequests([{ description: 'no text' }]);
  assertErrorResult(r, 'text');
});

test('item with text=null → error', () => {
  const r = processRequests([{ text: null }]);
  assertErrorResult(r, 'string');
});

test('item with text=number → error', () => {
  const r = processRequests([{ text: 123 }]);
  assertErrorResult(r, 'string');
});

test('item is null → error', () => {
  const r = processRequests([null]);
  assertErrorResult(r, 'object');
});

test('text too long (301 chars) → error', () => {
  const r = processRequests([{ text: 'x'.repeat(301) }]);
  assertErrorResult(r, '300');
});

test('whitespace-only text → error', () => {
  const r = processRequests([{ text: '   ' }]);
  assertErrorResult(r, 'empty');
});

test('error result has "Validation failed" message', () => {
  const r = processRequests(null);
  if (r.error !== 'Validation failed')
    throw new Error(`Expected "Validation failed" but got: "${r.error}"`);
});

test('error result has details array', () => {
  const r = processRequests(null);
  if (!Array.isArray(r.details)) throw new Error('details must be an array');
  if (r.details.length === 0) throw new Error('details must not be empty');
});

test('error result has no "processed" key', () => {
  const r = processRequests(null);
  if ('processed' in r) throw new Error('Expected no "processed" key on error');
});

// ── 2. Successful processing — single request ────────────────────────────────
console.log('\n2. Successful processing — single request');

test('single valid request → success with 1 processed item', () => {
  const r = processRequests([{ text: 'Flood in sector 4, need rescue' }]);
  assertSuccessResult(r);
  if (r.processed.length !== 1)
    throw new Error(`Expected 1 processed item but got ${r.processed.length}`);
});

test('processed item has correct original_text', () => {
  const r = processRequests([{ text: '  Flood in sector 4  ' }]);
  assertSuccessResult(r);
  if (r.processed[0].original_text !== 'Flood in sector 4')
    throw new Error(`Expected trimmed text but got: "${r.processed[0].original_text}"`);
});

test('processed item has parsed object', () => {
  const r = processRequests([{ text: 'Critical emergency, 50 people trapped' }]);
  assertSuccessResult(r);
  const parsed = r.processed[0].parsed;
  if (parsed.urgency !== 'HIGH') throw new Error(`Expected HIGH urgency but got ${parsed.urgency}`);
  if (parsed.people_count !== 50) throw new Error(`Expected 50 people but got ${parsed.people_count}`);
});

test('processed item has priority', () => {
  const r = processRequests([{ text: 'Critical emergency' }]);
  assertSuccessResult(r);
  if (r.processed[0].priority !== 'HIGH')
    throw new Error(`Expected HIGH but got ${r.processed[0].priority}`);
});

test('processed item has priority_reason', () => {
  const r = processRequests([{ text: 'Critical emergency' }]);
  assertSuccessResult(r);
  if (typeof r.processed[0].priority_reason !== 'string' || r.processed[0].priority_reason.length === 0)
    throw new Error('priority_reason must be a non-empty string');
});

// ── 3. Successful processing — multiple requests ─────────────────────────────
console.log('\n3. Successful processing — multiple requests');

test('3 valid requests → 3 processed items', () => {
  const r = processRequests([
    { text: 'Critical emergency, people trapped' },
    { text: 'Injured people need medical help' },
    { text: 'Stable situation, minor issue' },
  ]);
  assertSuccessResult(r);
  if (r.processed.length !== 3)
    throw new Error(`Expected 3 processed items but got ${r.processed.length}`);
});

test('10 valid requests → 10 processed items', () => {
  const input = Array.from({ length: 10 }, (_, i) => ({ text: `Request ${i + 1}` }));
  const r = processRequests(input);
  assertSuccessResult(r);
  if (r.processed.length !== 10)
    throw new Error(`Expected 10 processed items but got ${r.processed.length}`);
});

test('each processed item has all required keys', () => {
  const r = processRequests([
    { text: 'Critical emergency' },
    { text: 'Injured people' },
    { text: 'Stable situation' },
  ]);
  assertSuccessResult(r);
  for (const item of r.processed) {
    assertProcessedItem(item);
  }
});

// ── 4. Priority assignment ────────────────────────────────────────────────────
console.log('\n4. Priority assignment');

test('HIGH urgency → HIGH', () => {
  const r = processRequests([{ text: 'Critical emergency, people trapped' }]);
  assertSuccessResult(r);
  if (r.processed[0].priority !== 'HIGH')
    throw new Error(`Expected HIGH but got ${r.processed[0].priority}`);
});

test('MEDIUM urgency → MEDIUM', () => {
  const r = processRequests([{ text: 'Injured people need help' }]);
  assertSuccessResult(r);
  if (r.processed[0].priority !== 'MEDIUM')
    throw new Error(`Expected MEDIUM but got ${r.processed[0].priority}`);
});

test('LOW urgency → LOW', () => {
  const r = processRequests([{ text: 'Stable situation, minor issue' }]);
  assertSuccessResult(r);
  if (r.processed[0].priority !== 'LOW')
    throw new Error(`Expected LOW but got ${r.processed[0].priority}`);
});

test('default (no keywords) → LOW', () => {
  const r = processRequests([{ text: 'Situation at the camp' }]);
  assertSuccessResult(r);
  if (r.processed[0].priority !== 'LOW')
    throw new Error(`Expected LOW but got ${r.processed[0].priority}`);
});

test('priority_reason reflects urgency level', () => {
  const r1 = processRequests([{ text: 'Critical emergency' }]);
  const r2 = processRequests([{ text: 'Injured people' }]);
  const r3 = processRequests([{ text: 'Stable situation' }]);

  if (!r1.processed[0].priority_reason.includes('critical'))
    throw new Error(`Expected "critical" in reason but got: "${r1.processed[0].priority_reason}"`);
  if (!r2.processed[0].priority_reason.includes('moderate'))
    throw new Error(`Expected "moderate" in reason but got: "${r2.processed[0].priority_reason}"`);
  if (!r3.processed[0].priority_reason.includes('low'))
    throw new Error(`Expected "low" in reason but got: "${r3.processed[0].priority_reason}"`);
});

test('mixed priorities in batch', () => {
  const r = processRequests([
    { text: 'Critical emergency, fire spreading' },
    { text: 'Injured people stranded' },
    { text: 'Stable situation, minor issue' },
  ]);
  assertSuccessResult(r);
  if (r.processed[0].priority !== 'HIGH') throw new Error(`Expected HIGH for first`);
  if (r.processed[1].priority !== 'MEDIUM') throw new Error(`Expected MEDIUM for second`);
  if (r.processed[2].priority !== 'LOW') throw new Error(`Expected LOW for third`);
});

// ── 5. parseAllRequests ───────────────────────────────────────────────────────
console.log('\n5. parseAllRequests');

test('returns array of same length', () => {
  const result = parseAllRequests([{ text: 'A' }, { text: 'B' }, { text: 'C' }]);
  if (!Array.isArray(result)) throw new Error('Expected array');
  if (result.length !== 3) throw new Error(`Expected 3 but got ${result.length}`);
});

test('empty array → empty array', () => {
  const result = parseAllRequests([]);
  if (!Array.isArray(result)) throw new Error('Expected array');
  if (result.length !== 0) throw new Error(`Expected 0 but got ${result.length}`);
});

test('null input → empty array', () => {
  const result = parseAllRequests(null);
  if (!Array.isArray(result)) throw new Error('Expected array');
  if (result.length !== 0) throw new Error(`Expected 0 but got ${result.length}`);
});

test('each result has parsed shape', () => {
  const result = parseAllRequests([{ text: 'Emergency' }]);
  const parsed = result[0];
  if (!('urgency' in parsed)) throw new Error('Missing urgency');
  if (!('needs' in parsed)) throw new Error('Missing needs');
  if (!('people_count' in parsed)) throw new Error('Missing people_count');
});

// ── 6. assignPriority ─────────────────────────────────────────────────────────
console.log('\n6. assignPriority');

test('HIGH → HIGH', () => {
  const r = assignPriority({ urgency: 'HIGH' });
  if (r.priority !== 'HIGH') throw new Error(`Expected HIGH but got ${r.priority}`);
});

test('MEDIUM → MEDIUM', () => {
  const r = assignPriority({ urgency: 'MEDIUM' });
  if (r.priority !== 'MEDIUM') throw new Error(`Expected MEDIUM but got ${r.priority}`);
});

test('LOW → LOW', () => {
  const r = assignPriority({ urgency: 'LOW' });
  if (r.priority !== 'LOW') throw new Error(`Expected LOW but got ${r.priority}`);
});

test('null input → MEDIUM default', () => {
  const r = assignPriority(null);
  if (r.priority !== 'MEDIUM') throw new Error(`Expected MEDIUM but got ${r.priority}`);
});

test('undefined input → MEDIUM default', () => {
  const r = assignPriority(undefined);
  if (r.priority !== 'MEDIUM') throw new Error(`Expected MEDIUM but got ${r.priority}`);
});

test('string input → MEDIUM default', () => {
  const r = assignPriority('HIGH');
  if (r.priority !== 'MEDIUM') throw new Error(`Expected MEDIUM but got ${r.priority}`);
});

test('array input → MEDIUM default', () => {
  const r = assignPriority([]);
  if (r.priority !== 'MEDIUM') throw new Error(`Expected MEDIUM but got ${r.priority}`);
});

test('missing urgency → MEDIUM default', () => {
  const r = assignPriority({});
  if (r.priority !== 'MEDIUM') throw new Error(`Expected MEDIUM but got ${r.priority}`);
});

test('invalid urgency → MEDIUM default', () => {
  const r = assignPriority({ urgency: 'CRITICAL' });
  if (r.priority !== 'MEDIUM') throw new Error(`Expected MEDIUM but got ${r.priority}`);
});

test('always returns priority and priority_reason', () => {
  const inputs = [{ urgency: 'HIGH' }, { urgency: 'MEDIUM' }, { urgency: 'LOW' }, null, undefined, {}, 'x'];
  for (const input of inputs) {
    const r = assignPriority(input);
    if (!('priority' in r)) throw new Error('Missing priority');
    if (!('priority_reason' in r)) throw new Error('Missing priority_reason');
    if (typeof r.priority !== 'string') throw new Error('priority must be string');
    if (typeof r.priority_reason !== 'string') throw new Error('priority_reason must be string');
  }
});

// ── 7. No-crash guarantees ────────────────────────────────────────────────────
console.log('\n7. No-crash guarantees');

const crazyInputs = [
  undefined, null, '', 0, false, NaN, Infinity, -Infinity,
  Symbol('x'), () => {}, new Date(), /regex/, new Map(), new Set(),
  '   ', '\t\n\r', '!@#$%^&*()', '🔥💧🏥', 'x'.repeat(10000),
  '<script>alert("xss")</script>', '{"key":"value"}', '[]',
  [{ text: undefined }], [{ text: null }], [{}], [{ text: '' }], [{ text: '   ' }],
];

crazyInputs.forEach((input, i) => {
  test(`no crash on crazy input #${i + 1}: ${String(input).slice(0, 40)}`, () => {
    let result;
    try {
      result = processRequests(input);
    } catch (err) {
      throw new Error(`processRequests threw an exception: ${err.message}`);
    }
    if (result === null || typeof result !== 'object')
      throw new Error(`Expected object but got: ${typeof result}`);
    if (!('processed' in result) && !('error' in result))
      throw new Error(`Expected either "processed" or "error" key`);
  });
});

// ── 8. Determinism ────────────────────────────────────────────────────────────
console.log('\n8. Determinism');

test('same input always produces identical output', () => {
  const input = [
    { text: 'Critical emergency, 50 people trapped, children present' },
    { text: 'Injured people need medical help' },
    { text: 'Stable situation, minor issue' },
  ];
  const r1 = processRequests(input);
  const r2 = processRequests(input);
  if (JSON.stringify(r1) !== JSON.stringify(r2))
    throw new Error('Non-deterministic output detected');
});

test('calling 10 times returns same result', () => {
  const input = [{ text: 'Flood in sector 4, elderly people need water and food' }];
  const baseline = JSON.stringify(processRequests(input));
  for (let i = 0; i < 10; i++) {
    if (JSON.stringify(processRequests(input)) !== baseline)
      throw new Error(`Non-deterministic output on iteration ${i + 1}`);
  }
});

// ── 9. Real-world scenarios ───────────────────────────────────────────────────
console.log('\n9. Real-world scenarios');

test('earthquake + flood + medical batch', () => {
  const r = processRequests([
    { text: 'Earthquake hit sector 7. 200 people trapped under rubble. Need rescue and medical help immediately. Many children and elderly.' },
    { text: 'Flood has submerged the village. About 50 families stranded. No food or water. Pregnant women present.' },
    { text: 'Heart attack victim at the market. Need ambulance urgently.' },
  ]);
  assertSuccessResult(r);
  if (r.processed.length !== 3) throw new Error('Expected 3 items');
  if (r.processed[0].priority !== 'HIGH') throw new Error('Expected HIGH for earthquake');
  if (r.processed[1].priority !== 'HIGH') throw new Error('Expected HIGH for flood');
  if (r.processed[2].priority !== 'HIGH') throw new Error('Expected HIGH for heart attack');
});

test('mixed priority batch', () => {
  const r = processRequests([
    { text: 'Critical emergency, fire spreading' },
    { text: 'Injured people stranded' },
    { text: 'Stable situation, minor issue' },
    { text: 'Send blankets when available' },
  ]);
  assertSuccessResult(r);
  if (r.processed[0].priority !== 'HIGH') throw new Error('Expected HIGH');
  if (r.processed[1].priority !== 'MEDIUM') throw new Error('Expected MEDIUM');
  if (r.processed[2].priority !== 'LOW') throw new Error('Expected LOW');
  if (r.processed[3].priority !== 'LOW') throw new Error('Expected LOW');
});

test('whitespace trimming works end-to-end', () => {
  const r = processRequests([{ text: '  Critical emergency  ' }]);
  assertSuccessResult(r);
  if (r.processed[0].original_text !== 'Critical emergency')
    throw new Error(`Expected trimmed text but got: "${r.processed[0].original_text}"`);
});

// ── 10. Return shape guarantees ───────────────────────────────────────────────
console.log('\n10. Return shape guarantees');

test('success result has only "processed" key', () => {
  const r = processRequests([{ text: 'Emergency' }]);
  assertSuccessResult(r);
  const keys = Object.keys(r);
  if (keys.length !== 1 || keys[0] !== 'processed')
    throw new Error(`Expected only "processed" key but got: ${keys.join(', ')}`);
});

test('error result has only "error" and "details" keys', () => {
  const r = processRequests(null);
  assertErrorResult(r);
  const keys = Object.keys(r);
  if (keys.length !== 2 || !keys.includes('error') || !keys.includes('details'))
    throw new Error(`Expected "error" and "details" keys but got: ${keys.join(', ')}`);
});

test('no undefined fields in successful processed items', () => {
  const r = processRequests([
    { text: 'Critical emergency, 50 people trapped' },
    { text: 'Injured people need help' },
  ]);
  assertSuccessResult(r);
  for (const item of r.processed) {
    for (const key of REQUIRED_PROCESSED_KEYS) {
      if (item[key] === undefined)
        throw new Error(`Field "${key}" is undefined in processed item`);
    }
  }
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed > 0) {
  console.error('\n⚠️  Some tests failed. Fix the issues above.\n');
  process.exit(1);
} else {
  console.log('\n🎉  All tests passed!\n');
}