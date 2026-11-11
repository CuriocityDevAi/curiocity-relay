import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isCmuxUnknown,
  parseHubsWorkspaces,
  parseWorkspaceRefs,
  classifyHubsWorkspace,
  shouldAllowCreate,
  assessLayoutValidity,
  pickCreatedWorkspace,
} from '../lib/cmux-hubs.mjs';

// ── isCmuxUnknown ──────────────────────────────────────────────────────────

test('isCmuxUnknown: ok=true → false', () => {
  assert.equal(isCmuxUnknown({ ok: true }), false);
});

test('isCmuxUnknown: timeout (status=null) → true', () => {
  assert.equal(isCmuxUnknown({ ok: false, status: null }), true);
});

test('isCmuxUnknown: error (status=1) → true', () => {
  assert.equal(isCmuxUnknown({ ok: false, status: 1 }), true);
});

// ── parseHubsWorkspaces ───────────────────────────────────────────────────

test('parseHubsWorkspaces: 정상 파싱 · 오름차순 정렬', () => {
  const stdout = `
  workspace:17  Hubs
  workspace:16  Hubs
* workspace:1  ~/projects/curiocity-relay  [selected]
  workspace:3  Other
`;
  const list = parseHubsWorkspaces(stdout);
  assert.equal(list.length, 2);
  assert.equal(list[0].ref, 'workspace:16');
  assert.equal(list[1].ref, 'workspace:17');
});

test('parseHubsWorkspaces: 없으면 빈 배열', () => {
  const stdout = `  workspace:1  Other\n* workspace:2  Other2`;
  assert.deepEqual(parseHubsWorkspaces(stdout), []);
});

test('parseHubsWorkspaces: 빈 stdout → 빈 배열', () => {
  assert.deepEqual(parseHubsWorkspaces(''), []);
  assert.deepEqual(parseHubsWorkspaces(null), []);
});

test('parseHubsWorkspaces: 커스텀 hubsName', () => {
  const stdout = `  workspace:5  MyHub\n  workspace:6  Other`;
  const list = parseHubsWorkspaces(stdout, 'MyHub');
  assert.equal(list.length, 1);
  assert.equal(list[0].ref, 'workspace:5');
});

// ── parseWorkspaceRefs ────────────────────────────────────────────────────

test('parseWorkspaceRefs: 여러 워크스페이스 ref 추출', () => {
  const stdout = `
  workspace:17  Hubs
* workspace:1  relay
`;
  const refs = parseWorkspaceRefs(stdout);
  assert.deepEqual(refs, ['workspace:17', 'workspace:1']);
});

test('parseWorkspaceRefs: 빈 stdout → 빈 배열', () => {
  assert.deepEqual(parseWorkspaceRefs(''), []);
});

// ── classifyHubsWorkspace ─────────────────────────────────────────────────

test('classifyHubsWorkspace: surfaces 없음 → empty', () => {
  assert.equal(classifyHubsWorkspace([]), 'empty');
  assert.equal(classifyHubsWorkspace(null), 'empty');
});

test('classifyHubsWorkspace: hub pane 있음 → has-hub-pane', () => {
  const surfaces = [
    { surfaceRef: 'surface:1', title: 'M0 · idle', hub: 'm0' },
    { surfaceRef: 'surface:2', title: 'unknown', hub: null },
  ];
  assert.equal(classifyHubsWorkspace(surfaces), 'has-hub-pane');
});

test('classifyHubsWorkspace: surfaces 있지만 hub 없음 → unsure', () => {
  const surfaces = [
    { surfaceRef: 'surface:1', title: 'bash', hub: null },
    { surfaceRef: 'surface:2', title: 'zsh', hub: null },
  ];
  assert.equal(classifyHubsWorkspace(surfaces), 'unsure');
});

// ── shouldAllowCreate ─────────────────────────────────────────────────────

test('shouldAllowCreate: lastCreateAt null → 허용', () => {
  assert.equal(shouldAllowCreate({ lastCreateAt: null, now: Date.now() }), true);
});

test('shouldAllowCreate: 10분 미달 → 거부 (rate limit)', () => {
  const now = Date.now();
  const lastCreateAt = now - 5 * 60 * 1000; // 5분 전
  assert.equal(shouldAllowCreate({ lastCreateAt, now, windowMs: 10 * 60 * 1000 }), false);
});

test('shouldAllowCreate: 10분 경과 → 허용', () => {
  const now = Date.now();
  const lastCreateAt = now - 11 * 60 * 1000; // 11분 전
  assert.equal(shouldAllowCreate({ lastCreateAt, now, windowMs: 10 * 60 * 1000 }), true);
});

test('shouldAllowCreate: 정확히 10분 경과 → 허용 (경계값)', () => {
  const now = Date.now();
  const lastCreateAt = now - 10 * 60 * 1000;
  assert.equal(shouldAllowCreate({ lastCreateAt, now, windowMs: 10 * 60 * 1000 }), true);
});

// ── assessLayoutValidity ──────────────────────────────────────────────────

test('assessLayoutValidity: cmuxListOk=false → unknown (타임아웃에 흔들리지 않음)', () => {
  assert.equal(assessLayoutValidity({ cmuxListOk: false, workspaceFound: false, allPanesFound: false }), 'unknown');
  assert.equal(assessLayoutValidity({ cmuxListOk: false, workspaceFound: true, allPanesFound: true }), 'unknown');
});

test('assessLayoutValidity: cmuxListOk=true · workspace 없음 → invalid', () => {
  assert.equal(assessLayoutValidity({ cmuxListOk: true, workspaceFound: false, allPanesFound: false }), 'invalid');
});

test('assessLayoutValidity: cmuxListOk=true · workspace 있음 · pane 없음 → invalid', () => {
  assert.equal(assessLayoutValidity({ cmuxListOk: true, workspaceFound: true, allPanesFound: false }), 'invalid');
});

test('assessLayoutValidity: 모두 ok → valid', () => {
  assert.equal(assessLayoutValidity({ cmuxListOk: true, workspaceFound: true, allPanesFound: true }), 'valid');
});

// ── pickCreatedWorkspace ──────────────────────────────────────────────────

test('pickCreatedWorkspace: createdRef가 newList에 있음 → 채택', () => {
  const prevList = [];
  const newList = [{ ref: 'workspace:18', num: 18 }];
  const result = pickCreatedWorkspace({ prevList, newList, createdRef: 'workspace:18' });
  assert.equal(result, 'workspace:18');
});

test('pickCreatedWorkspace: 타임아웃 후 재조회 · 새 workspace 채택', () => {
  const prevList = [{ ref: 'workspace:17', num: 17 }];
  const newList = [{ ref: 'workspace:17', num: 17 }, { ref: 'workspace:18', num: 18 }];
  const result = pickCreatedWorkspace({ prevList, newList, createdRef: null });
  assert.equal(result, 'workspace:18');
});

test('pickCreatedWorkspace: prevList와 같고 createdRef null → 가장 최신 채택', () => {
  const prevList = [{ ref: 'workspace:17', num: 17 }];
  const newList = [{ ref: 'workspace:17', num: 17 }];
  const result = pickCreatedWorkspace({ prevList, newList, createdRef: null });
  assert.equal(result, 'workspace:17');
});

test('pickCreatedWorkspace: newList 빈 경우 → null', () => {
  const result = pickCreatedWorkspace({ prevList: [], newList: [], createdRef: null });
  assert.equal(result, null);
});

// ── 시나리오: 조회 타임아웃 시 생성 금지 ────────────────────────────────────

test('시나리오A: cmux 조회 타임아웃 → assessLayoutValidity unknown → 생성 금지', () => {
  const timeoutResult = { ok: false, status: null, stdout: '', stderr: 'timeout' };
  assert.equal(isCmuxUnknown(timeoutResult), true, 'timeout is unknown');
  const validity = assessLayoutValidity({ cmuxListOk: !isCmuxUnknown(timeoutResult), workspaceFound: false, allPanesFound: false });
  assert.equal(validity, 'unknown', 'unknown → 생성 금지');
});

// ── 시나리오: new-workspace 타임아웃 후 재조회 채택 ──────────────────────────

test('시나리오B: new-workspace 타임아웃 후 목록 재조회로 생성된 workspace 채택', () => {
  const prevList = [];
  const newListAfterTimeout = [{ ref: 'workspace:20', num: 20 }];
  const ref = pickCreatedWorkspace({ prevList, newList: newListAfterTimeout, createdRef: null });
  assert.equal(ref, 'workspace:20', '재조회로 생성된 workspace 채택');
});

// ── 시나리오: 다중 Hubs 정리 ────────────────────────────────────────────────

test('시나리오D: 비어있는 workspace → 닫기 대상', () => {
  assert.equal(classifyHubsWorkspace([]), 'empty');
  assert.equal(classifyHubsWorkspace(null), 'empty');
});

test('시나리오D: hub pane 있는 workspace → 유지', () => {
  const surfaces = [{ surfaceRef: 'surface:1', title: 'M1 · ⠐ M2-test', hub: 'm1' }];
  assert.equal(classifyHubsWorkspace(surfaces), 'has-hub-pane');
});

test('시나리오D: surfaces 있지만 hub 미식별 → 확신 없음 · 유지', () => {
  const surfaces = [{ surfaceRef: 'surface:1', title: 'bash', hub: null }];
  assert.equal(classifyHubsWorkspace(surfaces), 'unsure');
});

// ── 시나리오E: pane 판정이 타임아웃에 흔들리지 않음 ──────────────────────────

test('시나리오E: cmux 타임아웃 → pane 사라짐 판정 아님 (unknown)', () => {
  const validity = assessLayoutValidity({ cmuxListOk: false, workspaceFound: false, allPanesFound: false });
  assert.notEqual(validity, 'invalid', 'timeout → invalid 아님 · pane 사라짐 오판 없음');
  assert.equal(validity, 'unknown');
});
