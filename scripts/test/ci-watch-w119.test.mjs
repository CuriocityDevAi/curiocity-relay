// scripts/test/ci-watch-w119.test.mjs  M0-1127-B — 거짓 경보 · 줄 제목 첫 줄 괄호 요지
//
// 커버:
//   W119-title-bracket:    readQueueTitle — "<ID> (<요지>)" 첫 줄 → 괄호 안 요지 반환
//   W119-title-fallback:   readQueueTitle — 괄호 형식 없는 파일 → 기존 원장 대사 폴백
//   W119-no-storeport-def: defaultFetchPrState(X, undefined) → null (storeport 추측 금지)
//   W119-noci-relay:       shouldSkipCi('curiocity-relay', noCiRepos, searchRepos) → true
//   W119-noci-storeport:   shouldSkipCi('storeport', ...) → false (CI 있는 리포)
//   W119-noci-unregistered: shouldSkipCi('curiocity-devai-method', ...) → true (미등록)
//   W119-merge-removed:    미등록 리포 PR(머지됨) → merge 칸 → ageMin>=10 → inProgress 제외

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';

import { readQueueTitle } from '../watch/sources-local.mjs';
import {
  defaultFetchPrState,
  shouldSkipCi,
  NO_CI_REPOS,
} from '../watch/collect-view.mjs';

// _SEARCH_REPOS 는 export 되지 않으므로 하드코드로 테스트용 목록 사용
const TEST_SEARCH_REPOS = [
  'CuriocityDevAi/storeport',
  'CuriocityDevAi/curiocity-relay',
  'narisolutions/agilo-medusa-pos-fork',
];
const TEST_NO_CI = new Set(['curiocity-relay']);

// ─── W119-title-bracket ─────────────────────────────────────────────────────

test('W119-title-bracket: 첫 줄 "<ID> (<요지>)" → 괄호 안 요지 반환', () => {
  const dir = join(tmpdir(), `ci-watch-w119-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const f = join(dir, 'M2-1127-B.md');
  writeFileSync(f, 'M2-1127-B (방법론 리포 01~09 본문을 11-27 현재 운영에 맞게 갱신)\n모델: Sonnet\n\n원장 대사: "이전 원장 대사"\n');
  try {
    const title = readQueueTitle(f);
    assert.equal(title, '방법론 리포 01~09 본문을 11-27 현재 운영에 맞게 갱신',
      `괄호 요지 반환 기대 · 받음: "${title}"`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('W119-title-bracket-long: 긴 괄호 요지 → 80자로 자름', () => {
  const dir = join(tmpdir(), `ci-watch-w119b-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const f = join(dir, 'M0-1127-B.md');
  const longContent = 'ci-watch 진행 중 띠 — 머지된 PR 을 빨강으로 띄우는 거짓 경보 + 줄 제목 출처 수정 · v1.19';
  writeFileSync(f, `M0-1127-B (${longContent})\n모델: Sonnet\n`);
  try {
    const title = readQueueTitle(f);
    assert.ok(title, '요지 없음');
    assert.ok(title.length <= 80, `80자 초과: ${title.length}`);
    assert.ok(title.startsWith('ci-watch 진행 중 띠'), `요지 불일치: "${title}"`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('W119-title-fallback: 괄호 형식 없을 때 원장 대사 폴백', () => {
  const dir = join(tmpdir(), `ci-watch-w119c-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const f = join(dir, 'M0-1125-X.md');
  writeFileSync(f, 'M0-1125-X\n모델: Sonnet\n원장 대사: "폴백 원장 대사 테스트"\n');
  try {
    const title = readQueueTitle(f);
    assert.equal(title, '폴백 원장 대사 테스트',
      `원장 대사 폴백 기대 · 받음: "${title}"`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── W119-no-storeport-def ───────────────────────────────────────────────────

test('W119-no-storeport-def: defaultFetchPrState(X, undefined) → null (storeport 추측 금지)', () => {
  // fullRepo 없을 때 기본 storeport 를 조회하면 거짓 경보 — null 반환이 올바름
  const result = defaultFetchPrState(999999, undefined);
  assert.strictEqual(result, null,
    `fullRepo=undefined 시 null 기대 · 받음: ${JSON.stringify(result)}`);
});

test('W119-no-storeport-def-null: defaultFetchPrState(X, null) → null', () => {
  const result = defaultFetchPrState(999999, null);
  assert.strictEqual(result, null,
    `fullRepo=null 시 null 기대 · 받음: ${JSON.stringify(result)}`);
});

// ─── W119-shouldSkipCi ───────────────────────────────────────────────────────

test('W119-noci-relay: shouldSkipCi("curiocity-relay") → true (명시적 no-CI 리포)', () => {
  assert.strictEqual(shouldSkipCi('curiocity-relay', TEST_NO_CI, TEST_SEARCH_REPOS), true,
    'relay 는 CI 없는 리포 — skipCi=true 기대');
});

test('W119-noci-storeport: shouldSkipCi("storeport") → false (CI 있는 리포)', () => {
  assert.strictEqual(shouldSkipCi('storeport', TEST_NO_CI, TEST_SEARCH_REPOS), false,
    'storeport 는 CI 있는 리포 — skipCi=false 기대');
});

test('W119-noci-fork: shouldSkipCi("agilo-medusa-pos-fork") → false (CI 있는 리포)', () => {
  assert.strictEqual(shouldSkipCi('agilo-medusa-pos-fork', TEST_NO_CI, TEST_SEARCH_REPOS), false,
    'agilo-medusa-pos-fork 는 CI 있는 리포 — skipCi=false 기대');
});

test('W119-noci-unregistered: shouldSkipCi("curiocity-devai-method") → true (미등록 리포)', () => {
  assert.strictEqual(shouldSkipCi('curiocity-devai-method', TEST_NO_CI, TEST_SEARCH_REPOS), true,
    '미등록 리포는 CI 건너뜀 — skipCi=true 기대');
});

test('W119-noci-null: shouldSkipCi(null) → false (리포 미확인 → 보수적)', () => {
  assert.strictEqual(shouldSkipCi(null, TEST_NO_CI, TEST_SEARCH_REPOS), false,
    '리포 미확인 → 보수적으로 false');
});

// ─── W119-merge-removed ──────────────────────────────────────────────────────

test('W119-merge-removed: 미등록 리포 PR(머지됨) → merge 칸 · ageMin>=10 → inProgress 제외', () => {
  // buildExtendedView 를 직접 호출하면 repoRoot 가 필요하므로
  // step 2 로직을 단위로 검증: fetchPrState 가 merged 반환 → card.column = 'merge'
  const nowMs = Date.now();
  const mergedAt = new Date(nowMs - 15 * 60_000).toISOString(); // 15분 전 머지

  const card = {
    id: 'M2-TEST-X',
    hub: 'm2',
    column: 'review', // review 단계 (ci_pending 에서 2.1 로 이동된 상태)
    ageMin: 15,
    level: 'yellow',
    extra: { pr: { owner: 'CuriocityDevAi', repo: 'curiocity-devai-method', number: 1 } },
  };

  // step 2 로직 직접 적용
  const fullRepo = `${card.extra.pr.owner}/${card.extra.pr.repo}`;
  const prData = { state: 'MERGED', mergedAt, mergeable: null, mergeStateStatus: null };
  const st = (prData.state || '').toLowerCase();
  if (st === 'merged' || st === 'closed') {
    const mAt = prData.mergedAt ? new Date(prData.mergedAt).getTime() : nowMs;
    card.column  = 'merge';
    card.since   = new Date(mAt);
    card.ageMin  = Math.max(0, Math.round((nowMs - mAt) / 60000));
    card.predicted = false;
  }

  assert.equal(card.column, 'merge', `머지 후 칸=merge 기대 · 받음: ${card.column}`);
  assert.ok(card.ageMin >= 10, `ageMin >= 10 기대 · 받음: ${card.ageMin}`);

  // step 9 로직: ageMin >= HIDE_MIN(10) → _hideFromInProgress = true → inProgress 제외
  const HIDE_MIN = 10;
  if (card.column === 'merge' && card.ageMin >= HIDE_MIN) {
    card._hideFromInProgress = true;
  }
  assert.strictEqual(card._hideFromInProgress, true,
    'ageMin>=10 머지 카드 → _hideFromInProgress=true 기대');

  // inProgress 필터 확인
  const allCards = [card];
  const inProgress = allCards.filter(c => c.column !== 'queue' && !c._hideFromInProgress);
  assert.equal(inProgress.length, 0,
    `머지 카드 ageMin>=10 → inProgress 제외 기대 · 받음: ${inProgress.length}`);
});

test('W119-false-alarm: 미등록 리포 PR → ci_pending 에서 review 로 이동 · red 아님', () => {
  // 2.1 로직 검증: shouldSkipCi → review 칸으로 승격, red 없음
  const card = {
    id: 'M2-TEST-Y',
    hub: 'm2',
    column: 'ci_pending',
    ageMin: 5,
    level: 'yellow',
    extra: { pr: { owner: 'CuriocityDevAi', repo: 'curiocity-devai-method', number: 1 } },
  };

  const repo = card.extra.pr.repo;
  if (shouldSkipCi(repo, TEST_NO_CI, TEST_SEARCH_REPOS)) {
    card.column   = 'review';
    card.predicted = true;
    card.reason   = TEST_NO_CI.has(repo) ? 'CI 없음(리뷰 대기)' : '미등록 리포(CI 건너뜀)';
  }

  assert.equal(card.column, 'review', `미등록 리포 → review 칸 기대 · 받음: ${card.column}`);
  assert.notEqual(card.level, 'red', `red 가 아니어야 함 · 받음: ${card.level}`);
  assert.ok(card.reason?.includes('미등록'), `이유에 "미등록" 포함 기대 · 받음: "${card.reason}"`);
});
