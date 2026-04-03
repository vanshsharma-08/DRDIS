/**
 * DRDIS — Validator Tests
 * Covers: empty input, malformed text, large input, tie-breaking cases,
 * whitespace trimming, boundary conditions, and no-crash guarantees.
 */

const { validateInput } = require('./validator');

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertValid(result, expectedCount) {
  if (!result.valid) throw new Error(`Expected valid=true but got errors: ${result.errors.join(', ')}`);
  if (result.errors.length !== 0) throw new Error(`Expected 0 errors but got: ${result.errors}`);
  if (!Array.isArray(result.data)) throw new Error('Expected data to be an array');
  if (result.data.length !== expectedCount)
    throw new Error(`Expected data.length=${expectedCount} but got ${result.data.length}`);
}

function assertInvalid(result, expectedErrorFragment) {
  if (result.valid) throw new Error('Expected valid=false but got valid=true');
  if (!Array.isArray(result.errors) || result.errors.length === 0)
    throw new Error('Expected at least one error message');
  if (result.data !== null) throw new Error('Expected data=null for invalid result');
  if (expectedErrorFragment) {
    const found = result.errors.some((e) => e.toLowerCase().includes(expectedErrorFragment.toLowerCase()));
    if (!found)
      throw new Error(
        `Expected an error containing "${expectedErrorFragment}" but got: ${result.errors.join(', ')}`
      );
  }
}

function assertNoUndefined(result) {
  if (result.valid === undefined) throw new Error('result.valid is undefined');
  if (result.errors === undefined) throw new Error('result.errors is undefined');
  if (!('data' in result)) throw new Error('result.data key is missing');
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

console.log('\n📦 validateInput — Test Suite\n');

// ── 1. Return shape guarantees ────────────────────────────────────────────────
console.log('1. Return shape guarantees');

test('always returns { valid, errors, data } — no undefined fields (null input)', () => {
  const result = validateInput(null);
  assertNoUndefined(result);
});

test('always returns { valid, errors, data } — no undefined fields (valid input)', () => {
  const result = validateInput([{ text: 'Help needed' }]);
  assertNoUndefined(result);
});

test('errors is always an array', () => {
  const r1 = validateInput(null);
  const r2 = validateInput([{ text: 'ok' }]);
  if (!Array.isArray(r1.errors)) throw new Error('errors not array on invalid');
  if (!Array.isArray(r2.errors)) throw new Error('errors not array on valid');
});

// ── 2. Non-array inputs ───────────────────────────────────────────────────────
console.log('\n2. Non-array inputs');

test('null → invalid', () => assertInvalid(validateInput(null), 'array'));
test('undefined → invalid', () => assertInvalid(validateInput(undefined), 'array'));
test('string → invalid', () => assertInvalid(validateInput('hello'), 'array'));
test('number → invalid', () => assertInvalid(validateInput(42), 'array'));
test('object → invalid', () => assertInvalid(validateInput({ text: 'hi' }), 'array'));
test('boolean → invalid', () => assertInvalid(validateInput(true), 'array'));

// ── 3. Array length boundaries ────────────────────────────────────────────────
console.log('\n3. Array length boundaries');

test('empty array (length 0) → invalid', () => assertInvalid(validateInput([]), '1'));
test('array of 1 → valid', () => assertValid(validateInput([{ text: 'Fire at block 5' }]), 1));
test('array of 10 → valid', () => {
  const input = Array.from({ length: 10 }, (_, i) => ({ text: `Request ${i + 1}` }));
  assertValid(validateInput(input), 10);
});
test('array of 11 → invalid', () => {
  const input = Array.from({ length: 11 }, (_, i) => ({ text: `Request ${i + 1}` }));
  assertInvalid(validateInput(input), '10');
});
test('array of 100 → invalid', () => {
  const input = Array.from({ length: 100 }, (_, i) => ({ text: `Request ${i + 1}` }));
  assertInvalid(validateInput(input), '10');
});

// ── 4. Text length boundaries ─────────────────────────────────────────────────
console.log('\n4. Text length boundaries');

test('text of exactly 1 char → valid', () => assertValid(validateInput([{ text: 'A' }]), 1));
test('text of exactly 300 chars → valid', () => {
  assertValid(validateInput([{ text: 'x'.repeat(300) }]), 1);
});
test('text of 301 chars → invalid', () => {
  assertInvalid(validateInput([{ text: 'x'.repeat(301) }]), '300');
});
test('text of 1000 chars → invalid', () => {
  assertInvalid(validateInput([{ text: 'x'.repeat(1000) }]), '300');
});

// ── 5. Whitespace trimming ────────────────────────────────────────────────────
console.log('\n5. Whitespace trimming');

test('leading/trailing spaces are trimmed', () => {
  const result = validateInput([{ text: '  Fire at block 5  ' }]);
  assertValid(result, 1);
  if (result.data[0].text !== 'Fire at block 5')
    throw new Error(`Expected trimmed text but got: "${result.data[0].text}"`);
});

test('tabs and newlines are trimmed', () => {
  const result = validateInput([{ text: '\t\nHelp needed\n\t' }]);
  assertValid(result, 1);
  if (result.data[0].text !== 'Help needed')
    throw new Error(`Expected trimmed text but got: "${result.data[0].text}"`);
});

test('text that is only whitespace → invalid after trim', () => {
  assertInvalid(validateInput([{ text: '   ' }]), 'empty');
});

test('text that is only tabs/newlines → invalid after trim', () => {
  assertInvalid(validateInput([{ text: '\t\n\r' }]), 'empty');
});

test('text of 300 chars after trimming spaces → valid', () => {
  const result = validateInput([{ text: '  ' + 'x'.repeat(300) + '  ' }]);
  assertValid(result, 1);
  if (result.data[0].text.length !== 300)
    throw new Error(`Expected 300 chars after trim but got ${result.data[0].text.length}`);
});

test('text of 301 chars after trimming spaces → invalid', () => {
  assertInvalid(validateInput([{ text: '  ' + 'x'.repeat(301) + '  ' }]), '300');
});

// ── 6. Missing / wrong-type fields ────────────────────────────────────────────
console.log('\n6. Missing / wrong-type fields');

test('item missing "text" field → invalid', () => {
  assertInvalid(validateInput([{ description: 'no text key' }]), 'text');
});

test('item with text=null → invalid', () => {
  assertInvalid(validateInput([{ text: null }]), 'string');
});

test('item with text=number → invalid', () => {
  assertInvalid(validateInput([{ text: 123 }]), 'string');
});

test('item with text=array → invalid', () => {
  assertInvalid(validateInput([{ text: ['a', 'b'] }]), 'string');
});

test('item with text=object → invalid', () => {
  assertInvalid(validateInput([{ text: { value: 'hi' } }]), 'string');
});

test('item with text=boolean → invalid', () => {
  assertInvalid(validateInput([{ text: false }]), 'string');
});

// ── 7. Malformed items ────────────────────────────────────────────────────────
console.log('\n7. Malformed items');

test('item is null → invalid', () => {
  assertInvalid(validateInput([null]), 'object');
});

test('item is a string → invalid', () => {
  assertInvalid(validateInput(['just a string']), 'object');
});

test('item is a number → invalid', () => {
  assertInvalid(validateInput([42]), 'object');
});

test('item is an array → invalid', () => {
  assertInvalid(validateInput([['nested']]), 'object');
});

test('mixed valid and invalid items → invalid overall', () => {
  const result = validateInput([{ text: 'valid' }, null, { text: 'also valid' }]);
  assertInvalid(result);
});

// ── 8. Multiple errors reported ───────────────────────────────────────────────
console.log('\n8. Multiple errors reported');

test('multiple bad items → multiple errors', () => {
  const result = validateInput([
    { text: '' },
    { text: 'x'.repeat(301) },
    { description: 'missing text' },
  ]);
  assertInvalid(result);
  if (result.errors.length < 3)
    throw new Error(`Expected ≥3 errors but got ${result.errors.length}: ${result.errors}`);
});

// ── 9. Determinism ────────────────────────────────────────────────────────────
console.log('\n9. Determinism');

test('same input always produces same output', () => {
  const input = [{ text: '  Flood in sector 4  ' }, { text: 'Medical emergency' }];
  const r1 = validateInput(input);
  const r2 = validateInput(input);
  if (JSON.stringify(r1) !== JSON.stringify(r2))
    throw new Error('Non-deterministic output detected');
});

// ── 10. No-crash guarantees ───────────────────────────────────────────────────
console.log('\n10. No-crash guarantees');

const crazyInputs = [
  undefined,
  null,
  '',
  0,
  false,
  NaN,
  Infinity,
  Symbol('x'),
  () => {},
  new Date(),
  /regex/,
  new Map(),
  new Set(),
  [{ text: undefined }],
  [{ text: null }],
  [{}],
  [{ text: '' }],
  [{ text: '   ' }],
];

crazyInputs.forEach((input, i) => {
  test(`no crash on crazy input #${i + 1}: ${String(input).slice(0, 30)}`, () => {
    let result;
    try {
      result = validateInput(input);
    } catch (err) {
      throw new Error(`validateInput threw an exception: ${err.message}`);
    }
    assertNoUndefined(result);
    if (typeof result.valid !== 'boolean') throw new Error('result.valid must be boolean');
    if (!Array.isArray(result.errors)) throw new Error('result.errors must be array');
  });
});

// ── 11. Valid multi-request scenarios ─────────────────────────────────────────
console.log('\n11. Valid multi-request scenarios');

test('3 valid requests → data has 3 trimmed items', () => {
  const result = validateInput([
    { text: '  Earthquake survivors need water  ' },
    { text: 'Medical team required at zone B' },
    { text: '\tFire spreading north\t' },
  ]);
  assertValid(result, 3);
  if (result.data[0].text !== 'Earthquake survivors need water')
    throw new Error('First item not trimmed correctly');
  if (result.data[2].text !== 'Fire spreading north')
    throw new Error('Third item not trimmed correctly');
});

test('data items only contain "text" key (no extra fields leaked)', () => {
  const result = validateInput([{ text: 'Help', priority: 'high', extra: 123 }]);
  assertValid(result, 1);
  const keys = Object.keys(result.data[0]);
  if (keys.length !== 1 || keys[0] !== 'text')
    throw new Error(`Expected only "text" key but got: ${keys.join(', ')}`);
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
