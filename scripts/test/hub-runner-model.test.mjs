import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseModelLine } from '../lib/parse-model-line.mjs';

test('모델: Opus → opus', () => {
  assert.equal(parseModelLine('모델: Opus\n나머지 내용'), 'opus');
});

test('모델: Sonnet → sonnet', () => {
  assert.equal(parseModelLine('모델: Sonnet\n내용'), 'sonnet');
});

test('model: opus → opus (소문자)', () => {
  assert.equal(parseModelLine('model: opus\n내용'), 'opus');
});

test('MODEL： Opus (전각 콜론) → opus', () => {
  assert.equal(parseModelLine('MODEL： Opus\n내용'), 'opus');
});

test('모델 줄 없음 → null (기본값 사용)', () => {
  assert.equal(parseModelLine('M2-1105-AK 큐 파일\n내용\n내용'), null);
});

test('11번째 줄 이후 모델 줄은 무시', () => {
  const lines = Array.from({ length: 15 }, (_, i) => `줄 ${i + 1}`);
  lines[11] = '모델: Opus';
  assert.equal(parseModelLine(lines.join('\n')), null);
});

test('알 수 없는 값 → null (기본값 사용)', () => {
  assert.equal(parseModelLine('모델: gpt\n내용'), null);
});

test('앞뒤 공백이 있어도 파싱', () => {
  assert.equal(parseModelLine('  모델 :  Haiku  \n내용'), 'haiku');
});

test('대소문자 혼용 MODEL: OPUS → opus', () => {
  assert.equal(parseModelLine('MODEL: OPUS\n내용'), 'opus');
});
