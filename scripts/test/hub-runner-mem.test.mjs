import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVmStat } from '../lib/mem-sample.mjs';

const SAMPLE = `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                                    10449.
Pages active:                                 257327.
Pages inactive:                               247174.
Pages speculative:                              9104.
Pages throttled:                                   0.
Pages wired down:                             309411.
Pages purgeable:                                1298.
"Translation faults":                    29777954407.
Pages copy-on-write:                      2326420903.
Pages zero filled:                       11498788283.
Pages reactivated:                        3966566111.
Pages purged:                              640960864.
File-backed pages:                            139710.
Anonymous pages:                              373895.
Pages stored in compressor:                  4048023.
Pages occupied by compressor:                 160848.
Decompressions:                           5275593561.
Compressions:                             6326211389.
Pageins:                                  1313024348.
Pageouts:                                   10955457.
Swapins:                                    42398534.
Swapouts:                                   47999177.
`;

test('parseVmStat: pageSize', () => {
  assert.equal(parseVmStat(SAMPLE).pageSize, 16384);
});

test('parseVmStat: free pages', () => {
  assert.equal(parseVmStat(SAMPLE).free, 10449);
});

test('parseVmStat: speculative pages', () => {
  assert.equal(parseVmStat(SAMPLE).speculative, 9104);
});

test('parseVmStat: wired pages', () => {
  assert.equal(parseVmStat(SAMPLE).wired, 309411);
});

test('parseVmStat: active pages', () => {
  assert.equal(parseVmStat(SAMPLE).active, 257327);
});

test('parseVmStat: compressorPhysical (Pages occupied by compressor)', () => {
  assert.equal(parseVmStat(SAMPLE).compressorPhysical, 160848);
});

test('parseVmStat: null on null input', () => {
  assert.equal(parseVmStat(null), null);
});

test('parseVmStat: null on input without page size line', () => {
  assert.equal(parseVmStat('Pages free: 1234.\n'), null);
});

test('parseVmStat: different page size', () => {
  const src = SAMPLE.replace('page size of 16384 bytes', 'page size of 4096 bytes');
  assert.equal(parseVmStat(src).pageSize, 4096);
});
