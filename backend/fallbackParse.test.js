/**
 * DRDIS — fallbackParse Tests
 * Covers: empty input, malformed text, large input, Gemini-failure simulation,
 * urgency detection, people_count extraction, needs detection,
 * has_medical, has_vulnerable, safe defaults, and no-crash guarantees.
 */

const { fallbackParse } = require('./fallbackParse');

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

  if (typeof result.people_count !== 'number' || !Number.isFinite(result.people_count) || result.people_count < 0)
    throw new Error(`people_count must be a finite number ≥ 0, got: ${result.people_count}`);

  if (result.location !== null && typeof result.location !== 'string')
    throw new Error(`location must be null or a string, got: ${typeof result.location}`);

  if (typeof result.severity_reason !== 'string' || result.severity_reason.trim().length === 0)
    throw new Error(`severity_reason must be a non-empty string`);

  if (typeof result.has_medical !== 'boolean')
    throw new Error(`has_medical must be boolean, got: ${typeof result.has_medical}`);

  if (typeof result.has_vulnerable !== 'boolean')
    throw new Error(`has_vulnerable must be boolean, got: ${typeof result.has_vulnerable}`);
}

function assertUrgency(text, expected) {
  const result = fallbackParse(text);
  if (result.urgency !== expected)
    throw new Error(`Expected urgency="${expected}" for "${text}" but got "${result.urgency}"`);
}

function assertNeedsContain(text, ...expectedNeeds) {
  const result = fallbackParse(text);
  for (const need of expectedNeeds) {
    if (!result.needs.includes(need))
      throw new Error(`Expected needs to contain "${need}" for "${text}" but got: [${result.needs.join(', ')}]`);
  }
}

function assertNeedsExclude(text, ...excludedNeeds) {
  const result = fallbackParse(text);
  for (const need of excludedNeeds) {
    if (result.needs.includes(need))
      throw new Error(`Expected needs NOT to contain "${need}" for "${text}" but it did`);
  }
}

function assertPeopleCount(text, expected) {
  const result = fallbackParse(text);
  if (result.people_count !== expected)
    throw new Error(`Expected people_count=${expected} for "${text}" but got ${result.people_count}`);
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

console.log('\n📦 fallbackParse — Test Suite\n');

// ── 1. Return shape guarantees ────────────────────────────────────────────────
console.log('1. Return shape guarantees');

test('returns all 7 required keys for a normal string', () => {
  assertShape(fallbackParse('50 people trapped, need rescue and water urgently'));
});

test('no key is undefined on valid input', () => {
  const result = fallbackParse('Flood in sector 4, children need food');
  for (const key of REQUIRED_KEYS) {
    if (result[key] === undefined) throw new Error(`Key "${key}" is undefined`);
  }
});

test('urgency is always HIGH | MEDIUM | LOW', () => {
  ['critical emergency', 'need help', 'minor issue', '', null, undefined, 42].forEach((input) => {
    const r = fallbackParse(input);
    if (!VALID_URGENCIES.includes(r.urgency))
      throw new Error(`Invalid urgency "${r.urgency}" for input: ${input}`);
  });
});

test('needs is always an array', () => {
  ['food and water needed', '', null, 42].forEach((input) => {
    const r = fallbackParse(input);
    if (!Array.isArray(r.needs)) throw new Error(`needs is not an array for input: ${input}`);
  });
});

test('people_count is always a finite number ≥ 0', () => {
  ['30 people', 'no number here', '', null].forEach((input) => {
    const r = fallbackParse(input);
    if (typeof r.people_count !== 'number' || !Number.isFinite(r.people_count) || r.people_count < 0)
      throw new Error(`Invalid people_count "${r.people_count}" for input: ${input}`);
  });
});

test('location is always null (safe default — no NLP)', () => {
  ['near the river', 'sector 4', ''].forEach((input) => {
    const r = fallbackParse(input);
    if (r.location !== null) throw new Error(`Expected location=null but got: ${r.location}`);
  });
});

test('severity_reason is always a non-empty string', () => {
  ['', null, undefined, 'critical emergency'].forEach((input) => {
    const r = fallbackParse(input);
    if (typeof r.severity_reason !== 'string' || r.severity_reason.trim().length === 0)
      throw new Error(`severity_reason is empty/invalid for input: ${input}`);
  });
});

test('has_medical is always boolean', () => {
  ['doctor needed', 'no medical', ''].forEach((input) => {
    const r = fallbackParse(input);
    if (typeof r.has_medical !== 'boolean')
      throw new Error(`has_medical is not boolean for input: ${input}`);
  });
});

test('has_vulnerable is always boolean', () => {
  ['elderly people', 'no vulnerable', ''].forEach((input) => {
    const r = fallbackParse(input);
    if (typeof r.has_vulnerable !== 'boolean')
      throw new Error(`has_vulnerable is not boolean for input: ${input}`);
  });
});

// ── 2. Urgency — HIGH ─────────────────────────────────────────────────────────
console.log('\n2. Urgency detection — HIGH');

test('"critical" → HIGH', () => assertUrgency('Critical situation at the bridge', 'HIGH'));
test('"urgent" → HIGH', () => assertUrgency('Urgent help needed', 'HIGH'));
test('"emergency" → HIGH', () => assertUrgency('Medical emergency at zone B', 'HIGH'));
test('"trapped" → HIGH', () => assertUrgency('People are trapped under rubble', 'HIGH'));
test('"fire" → HIGH', () => assertUrgency('Fire spreading in block 3', 'HIGH'));
test('"flood" → HIGH', () => assertUrgency('Flood has hit the village', 'HIGH'));
test('"bleeding" → HIGH', () => assertUrgency('Victim is bleeding heavily', 'HIGH'));
test('"unconscious" → HIGH', () => assertUrgency('Patient is unconscious', 'HIGH'));
test('"SOS" → HIGH', () => assertUrgency('SOS from the mountain camp', 'HIGH'));
test('"immediately" → HIGH', () => assertUrgency('Need help immediately', 'HIGH'));
test('"asap" → HIGH', () => assertUrgency('Send rescue team asap', 'HIGH'));
test('"dying" → HIGH', () => assertUrgency('People are dying here', 'HIGH'));
test('"explosion" → HIGH', () => assertUrgency('Gas explosion at factory', 'HIGH'));
test('"drowning" → HIGH', () => assertUrgency('Child is drowning in the river', 'HIGH'));
test('"severe" → HIGH', () => assertUrgency('Severe injuries reported', 'HIGH'));

// ── 3. Urgency — MEDIUM ───────────────────────────────────────────────────────
console.log('\n3. Urgency detection — MEDIUM');

test('"injured" → MEDIUM', () => assertUrgency('Several people are injured', 'MEDIUM'));
test('"hurt" → MEDIUM', () => assertUrgency('Many residents are hurt', 'MEDIUM'));
test('"sick" → MEDIUM', () => assertUrgency('People are getting sick', 'MEDIUM'));
test('"stranded" → MEDIUM', () => assertUrgency('Families are stranded on the roof', 'MEDIUM'));
test('"shelter" → MEDIUM', () => assertUrgency('We need shelter for the night', 'MEDIUM'));
test('"shortage" → MEDIUM', () => assertUrgency('Food shortage in the camp', 'MEDIUM'));
test('"displaced" → MEDIUM', () => assertUrgency('Hundreds of displaced families', 'MEDIUM'));
test('"no water" → MEDIUM', () => assertUrgency('There is no water available', 'MEDIUM'));
test('"missing" → MEDIUM', () => assertUrgency('Three people are missing', 'MEDIUM'));
test('no keywords → defaults to LOW', () => assertUrgency('Situation at the camp', 'LOW'));
test('empty string → defaults to LOW', () => assertUrgency('', 'LOW'));

// ── 4. Urgency — LOW ──────────────────────────────────────────────────────────
console.log('\n4. Urgency detection — LOW');

test('"minor" → LOW (but "damage" is MEDIUM, so MEDIUM wins)', () => assertUrgency('Minor damage to the fence', 'MEDIUM'));
test('"stable" → LOW', () => assertUrgency('Situation is stable for now', 'LOW'));
test('"if possible" → LOW', () => assertUrgency('Send supplies if possible', 'LOW'));
test('"when available" → LOW', () => assertUrgency('Please send blankets when available', 'LOW'));
test('"low priority" → LOW', () => assertUrgency('This is a low priority request', 'LOW'));
test('"not urgent" → LOW', () => assertUrgency('This is not urgent', 'LOW'));
test('"manageable" → LOW', () => assertUrgency('The situation is manageable', 'LOW'));

// ── 5. Urgency — HIGH overrides MEDIUM/LOW ────────────────────────────────────
console.log('\n5. Urgency priority (HIGH > MEDIUM > LOW)');

test('HIGH + MEDIUM keywords → HIGH wins', () => {
  assertUrgency('Critical emergency, people are injured and stranded', 'HIGH');
});
test('HIGH + LOW keywords → HIGH wins', () => {
  assertUrgency('Urgent but minor damage', 'HIGH');
});
test('MEDIUM + LOW keywords → MEDIUM wins', () => {
  assertUrgency('Injured people, situation is stable', 'MEDIUM');
});

// ── 6. people_count extraction ────────────────────────────────────────────────
console.log('\n6. people_count extraction');

test('"50 people" → 50', () => assertPeopleCount('50 people need rescue', 50));
test('"12 persons" → 12', () => assertPeopleCount('12 persons are trapped', 12));
test('"3 survivors" → 3', () => assertPeopleCount('3 survivors found', 3));
test('"100 victims" → 100', () => assertPeopleCount('100 victims need food', 100));
test('"group of 20" → 20', () => assertPeopleCount('A group of 20 is stranded', 20));
test('"about 30" → 30', () => assertPeopleCount('About 30 people are missing', 30));
test('"around 15" → 15', () => assertPeopleCount('Around 15 families displaced', 15));
test('"approximately 200" → 200', () => assertPeopleCount('Approximately 200 residents affected', 200));
test('"over 40" → 40', () => assertPeopleCount('Over 40 people need water', 40));
test('"at least 5" → 5', () => assertPeopleCount('At least 5 children are missing', 5));
test('bare number "7" → 7', () => assertPeopleCount('7 injured at the site', 7));
test('no number → defaults to 0', () => assertPeopleCount('People need help urgently', 0));
test('empty string → defaults to 0', () => assertPeopleCount('', 0));
test('explicit count beats bare number', () => assertPeopleCount('Zone 3 has 25 survivors', 25));

// ── 7. Needs detection ────────────────────────────────────────────────────────
console.log('\n7. Needs detection');

test('"food" detected', () => assertNeedsContain('We need food urgently', 'food'));
test('"hungry" → food', () => assertNeedsContain('People are hungry', 'food'));
test('"starving" → food', () => assertNeedsContain('Children are starving', 'food'));
test('"meal" → food', () => assertNeedsContain('No meals for 2 days', 'food'));
test('"rations" → food', () => assertNeedsContain('Send rations immediately', 'food'));

test('"water" detected', () => assertNeedsContain('No water available', 'water'));
test('"thirsty" → water', () => assertNeedsContain('People are thirsty', 'water'));
test('"dehydrated" → water', () => assertNeedsContain('Victims are dehydrated', 'water'));
test('"fluids" → water', () => assertNeedsContain('Need IV fluids', 'water'));

test('"rescue" detected', () => assertNeedsContain('Need rescue team', 'rescue'));
test('"trapped" → rescue', () => assertNeedsContain('People are trapped', 'rescue'));
test('"evacuate" → rescue', () => assertNeedsContain('Need to evacuate the area', 'rescue'));
test('"stranded" → rescue', () => assertNeedsContain('Families are stranded', 'rescue'));
test('"help" → rescue', () => assertNeedsContain('Please help us', 'rescue'));

test('"medical" detected', () => assertNeedsContain('Medical team required', 'medical'));
test('"doctor" → medical', () => assertNeedsContain('Need a doctor now', 'medical'));
test('"injured" → medical', () => assertNeedsContain('Many injured people', 'medical'));
test('"ambulance" → medical', () => assertNeedsContain('Send an ambulance', 'medical'));
test('"first aid" → medical', () => assertNeedsContain('First aid needed', 'medical'));

test('multiple needs detected', () => {
  assertNeedsContain('Trapped people need food, water, and medical help', 'food', 'water', 'rescue', 'medical');
});

test('no needs → empty array', () => {
  const result = fallbackParse('Situation is stable');
  if (result.needs.length !== 0)
    throw new Error(`Expected empty needs array but got: [${result.needs.join(', ')}]`);
});

test('unrelated text → no false positives in needs', () => {
  assertNeedsExclude('The weather is nice today', 'food', 'water', 'rescue', 'medical');
});

// ── 8. has_medical detection ──────────────────────────────────────────────────
console.log('\n8. has_medical detection');

test('"medical" → has_medical=true', () => {
  if (!fallbackParse('Medical team needed').has_medical) throw new Error('Expected has_medical=true');
});
test('"doctor" → has_medical=true', () => {
  if (!fallbackParse('Need a doctor').has_medical) throw new Error('Expected has_medical=true');
});
test('"bleeding" → has_medical=true', () => {
  if (!fallbackParse('Patient is bleeding').has_medical) throw new Error('Expected has_medical=true');
});
test('"hospital" → has_medical=true', () => {
  if (!fallbackParse('Take them to hospital').has_medical) throw new Error('Expected has_medical=true');
});
test('"heart attack" → has_medical=true', () => {
  if (!fallbackParse('Someone had a heart attack').has_medical) throw new Error('Expected has_medical=true');
});
test('"stroke" → has_medical=true', () => {
  if (!fallbackParse('Stroke victim needs help').has_medical) throw new Error('Expected has_medical=true');
});
test('"oxygen" → has_medical=true', () => {
  if (!fallbackParse('Need oxygen supply').has_medical) throw new Error('Expected has_medical=true');
});
test('no medical keywords → has_medical=false', () => {
  if (fallbackParse('Food and water needed').has_medical) throw new Error('Expected has_medical=false');
});

// ── 9. has_vulnerable detection ───────────────────────────────────────────────
console.log('\n9. has_vulnerable detection');

test('"children" → has_vulnerable=true', () => {
  if (!fallbackParse('Children are trapped').has_vulnerable) throw new Error('Expected has_vulnerable=true');
});
test('"elderly" → has_vulnerable=true', () => {
  if (!fallbackParse('Elderly people need help').has_vulnerable) throw new Error('Expected has_vulnerable=true');
});
test('"pregnant" → has_vulnerable=true', () => {
  if (!fallbackParse('Pregnant woman needs evacuation').has_vulnerable) throw new Error('Expected has_vulnerable=true');
});
test('"baby" → has_vulnerable=true', () => {
  if (!fallbackParse('A baby is missing').has_vulnerable) throw new Error('Expected has_vulnerable=true');
});
test('"disabled" → has_vulnerable=true', () => {
  if (!fallbackParse('Disabled residents cannot evacuate').has_vulnerable) throw new Error('Expected has_vulnerable=true');
});
test('"wheelchair" → has_vulnerable=true', () => {
  if (!fallbackParse('Wheelchair user needs rescue').has_vulnerable) throw new Error('Expected has_vulnerable=true');
});
test('"infant" → has_vulnerable=true', () => {
  if (!fallbackParse('Infant needs medical care').has_vulnerable) throw new Error('Expected has_vulnerable=true');
});
test('"senior" → has_vulnerable=true', () => {
  if (!fallbackParse('Seniors are stranded').has_vulnerable) throw new Error('Expected has_vulnerable=true');
});
test('no vulnerable keywords → has_vulnerable=false', () => {
  if (fallbackParse('Adults need food and water').has_vulnerable) throw new Error('Expected has_vulnerable=false');
});

// ── 10. severity_reason content ───────────────────────────────────────────────
console.log('\n10. severity_reason content');

test('HIGH urgency reflected in severity_reason', () => {
  const r = fallbackParse('Critical emergency');
  if (!r.severity_reason.toLowerCase().includes('high'))
    throw new Error(`Expected "high" in severity_reason but got: "${r.severity_reason}"`);
});

test('LOW urgency reflected in severity_reason', () => {
  const r = fallbackParse('Situation is stable, minor issue');
  if (!r.severity_reason.toLowerCase().includes('low'))
    throw new Error(`Expected "low" in severity_reason but got: "${r.severity_reason}"`);
});

test('detected needs appear in severity_reason', () => {
  const r = fallbackParse('People need food and water');
  if (!r.severity_reason.toLowerCase().includes('food') && !r.severity_reason.toLowerCase().includes('needs'))
    throw new Error(`Expected needs in severity_reason but got: "${r.severity_reason}"`);
});

test('medical flag appears in severity_reason', () => {
  const r = fallbackParse('Doctor needed urgently');
  if (!r.severity_reason.toLowerCase().includes('medical'))
    throw new Error(`Expected "medical" in severity_reason but got: "${r.severity_reason}"`);
});

test('vulnerable flag appears in severity_reason', () => {
  const r = fallbackParse('Elderly people are stranded');
  if (!r.severity_reason.toLowerCase().includes('vulnerable'))
    throw new Error(`Expected "vulnerable" in severity_reason but got: "${r.severity_reason}"`);
});

test('people_count > 1 appears in severity_reason', () => {
  const r = fallbackParse('50 people need rescue');
  if (!r.severity_reason.includes('50'))
    throw new Error(`Expected "50" in severity_reason but got: "${r.severity_reason}"`);
});

// ── 11. Safe defaults on bad input ────────────────────────────────────────────
console.log('\n11. Safe defaults on bad / empty input');

test('empty string → valid shape with safe defaults', () => {
  const r = fallbackParse('');
  assertShape(r);
  if (r.urgency !== 'LOW') throw new Error(`Expected LOW default but got ${r.urgency}`);
  if (r.people_count !== 0)   throw new Error(`Expected people_count=0 but got ${r.people_count}`);
  if (r.location !== null)    throw new Error(`Expected location=null but got ${r.location}`);
  if (r.needs.length !== 0)   throw new Error(`Expected empty needs but got [${r.needs.join(', ')}]`);
  if (r.has_medical !== false) throw new Error('Expected has_medical=false');
  if (r.has_vulnerable !== false) throw new Error('Expected has_vulnerable=false');
});

test('null input → valid shape, no crash', () => {
  assertShape(fallbackParse(null));
});

test('undefined input → valid shape, no crash', () => {
  assertShape(fallbackParse(undefined));
});

test('number input → valid shape, no crash', () => {
  assertShape(fallbackParse(42));
});

test('boolean input → valid shape, no crash', () => {
  assertShape(fallbackParse(true));
});

test('array input → valid shape, no crash', () => {
  assertShape(fallbackParse(['help', 'needed']));
});

test('object input → valid shape, no crash', () => {
  assertShape(fallbackParse({ text: 'emergency' }));
});

// ── 12. No-crash guarantees (crazy inputs) ────────────────────────────────────
console.log('\n12. No-crash guarantees');

const crazyInputs = [
  undefined, null, '', 0, false, NaN, Infinity, -Infinity,
  Symbol('x'), () => {}, new Date(), /regex/, new Map(), new Set(),
  '   ', '\t\n\r', '!@#$%^&*()', '🔥💧🏥', 'x'.repeat(10000),
  '<script>alert("xss")</script>', '{"key":"value"}', '[]',
];

crazyInputs.forEach((input, i) => {
  test(`no crash on crazy input #${i + 1}: ${String(input).slice(0, 40)}`, () => {
    let result;
    try {
      result = fallbackParse(input);
    } catch (err) {
      throw new Error(`fallbackParse threw an exception: ${err.message}`);
    }
    assertShape(result);
  });
});

// ── 13. Determinism ───────────────────────────────────────────────────────────
console.log('\n13. Determinism');

test('same input always produces identical output', () => {
  const input = '50 people trapped, need rescue and medical help urgently, children present';
  const r1 = fallbackParse(input);
  const r2 = fallbackParse(input);
  if (JSON.stringify(r1) !== JSON.stringify(r2))
    throw new Error('Non-deterministic output detected');
});

test('different inputs produce different outputs', () => {
  const r1 = fallbackParse('Critical emergency, 100 people trapped');
  const r2 = fallbackParse('Minor damage, stable situation');
  if (r1.urgency === r2.urgency && r1.people_count === r2.people_count)
    throw new Error('Expected different outputs for different inputs');
});

test('calling 100 times returns same result', () => {
  const input = 'Flood in sector 4, elderly people need water and food';
  const baseline = JSON.stringify(fallbackParse(input));
  for (let i = 0; i < 100; i++) {
    if (JSON.stringify(fallbackParse(input)) !== baseline)
      throw new Error(`Non-deterministic output on iteration ${i + 1}`);
  }
});

// ── 14. Real-world scenario tests ─────────────────────────────────────────────
console.log('\n14. Real-world scenarios');

test('earthquake scenario', () => {
  const r = fallbackParse('Earthquake hit sector 7. 200 people trapped under rubble. Need rescue and medical help immediately. Many children and elderly.');
  assertShape(r);
  if (r.urgency !== 'HIGH') throw new Error(`Expected HIGH but got ${r.urgency}`);
  if (r.people_count !== 200) throw new Error(`Expected 200 but got ${r.people_count}`);
  if (!r.needs.includes('rescue')) throw new Error('Expected rescue need');
  if (!r.needs.includes('medical')) throw new Error('Expected medical need');
  if (!r.has_medical) throw new Error('Expected has_medical=true');
  if (!r.has_vulnerable) throw new Error('Expected has_vulnerable=true');
});

test('flood scenario', () => {
  const r = fallbackParse('Flood has submerged the village. About 50 families stranded. No food or water. Pregnant women and infants present.');
  assertShape(r);
  if (r.urgency !== 'HIGH') throw new Error(`Expected HIGH but got ${r.urgency}`);
  if (r.people_count !== 50) throw new Error(`Expected 50 but got ${r.people_count}`);
  if (!r.needs.includes('food')) throw new Error('Expected food need');
  if (!r.needs.includes('water')) throw new Error('Expected water need');
  if (!r.has_vulnerable) throw new Error('Expected has_vulnerable=true');
});

test('medical emergency scenario', () => {
  const r = fallbackParse('Heart attack victim at the market. Need ambulance urgently. 1 person affected.');
  assertShape(r);
  if (r.urgency !== 'HIGH') throw new Error(`Expected HIGH but got ${r.urgency}`);
  if (!r.has_medical) throw new Error('Expected has_medical=true');
  if (!r.needs.includes('medical')) throw new Error('Expected medical need');
});

test('low-priority supply request scenario', () => {
  const r = fallbackParse('Stable situation at camp. Send blankets when available.');
  assertShape(r);
  if (r.urgency !== 'LOW') throw new Error(`Expected LOW but got ${r.urgency}`);
  if (r.has_medical) throw new Error('Expected has_medical=false');
  if (r.has_vulnerable) throw new Error('Expected has_vulnerable=false');
});

test('Gemini-failure simulation: parse raw unstructured text', () => {
  const r = fallbackParse('pls hlp us!!! fire fire fire 30 ppl stuck no wtr no fd kids here!!!');
  assertShape(r);
  if (r.urgency !== 'HIGH') throw new Error(`Expected HIGH but got ${r.urgency}`);
  if (r.people_count !== 30) throw new Error(`Expected 30 but got ${r.people_count}`);
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
