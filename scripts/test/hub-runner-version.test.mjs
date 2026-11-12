// scripts/test/hub-runner-version.test.mjs — M1-1105-BA(d): 러너 버전 상수화 회귀 방지.
// all.json 의 runner 칸이 실제 가동 버전과 어긋나지 않도록 — 소스에 'v7.N' 리터럴이 박히면
// 상수가 무용지물이 됨. 이 테스트는 현재 러너(v7.2) 소스에서 상수 선언과
// 과거 리터럴 부재를 검증한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const V72 = join(HERE, '..', 'hub-runner-v7.2.mjs');
const src = readFileSync(V72, 'utf8');

test('RUNNER_VERSION 상수가 v7.2 로 선언됨', () => {
  assert.match(src, /const RUNNER_VERSION = 'v7\.2';/);
});

test(`"runner: 'v7.0'" 리터럴이 소스에서 사라짐 (상수화 완료)`, () => {
  assert.doesNotMatch(src, /runner: 'v7\.0'/);
});

test(`"runner-v7.1" 리터럴이 소스에서 사라짐 (상수화 완료)`, () => {
  assert.doesNotMatch(src, /runner-v7\.1/);
});

test(`"hub-runner-v7.1" 리터럴이 소스에서 사라짐 (Usage/로그 헤더 제외)`, () => {
  // Usage 문자열은 scripts/hub-runner-v7.2.mjs 로 바뀜. 역사 코멘트("// v7.1 과의 차이") 는 OK.
  const lines = src.split('\n');
  const violations = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('//')) continue;        // 주석 — 역사 기록 허용
    if (/hub-runner-v7\.1/.test(l)) violations.push(`line ${i + 1}: ${l.trim()}`);
  }
  assert.equal(violations.length, 0, `v7.1 리터럴 잔존: ${violations.join(' | ')}`);
});

test('RELAY_INBOX 플래그가 정의됨', () => {
  assert.match(src, /RELAY_INBOX_ENABLED = process\.env\.RELAY_INBOX === '1'/);
  assert.match(src, /function postInboxIfEnabled\(/);
});
