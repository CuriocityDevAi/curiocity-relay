import assert from 'node:assert/strict';
import { extractPromptId } from '../ci-watch.mjs';

const cases = [
  { input: 'feat/M3-1123-E-ci-watch',          expected: 'M3-1123-E' },
  { input: 'feat/M3-1123-A-sell-chips',         expected: 'M3-1123-A' },
  { input: 'fix/M1-1120-B-bug',                 expected: 'M1-1120-B' },
  { input: 'M2-1105-N-task',                    expected: 'M2-1105-N' },
  { input: 'feature/T0-0906-C-todo',            expected: 'T0-0906-C' },
  { input: 'K1-0914-A',                         expected: 'K1-0914-A' },
  { input: 'feat/N0-1012-XY-grownest',          expected: 'N0-1012-XY' },
  { input: 'main',                              expected: null },
  { input: 'release/v1.0',                      expected: null },
  { input: 'chore/cleanup',                     expected: null },
];

let pass = 0;
let fail = 0;
for (const { input, expected } of cases) {
  const got = extractPromptId(input);
  try {
    assert.equal(got, expected);
    console.log(`PASS  ${input.padEnd(40)} → ${got ?? 'null'}`);
    pass++;
  } catch {
    console.error(`FAIL  ${input.padEnd(40)} → got=${got} expected=${expected}`);
    fail++;
  }
}

console.log(`\n${pass} passed · ${fail} failed`);
if (fail > 0) process.exit(1);
