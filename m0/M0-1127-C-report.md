PASS b7e2fbb34

## M0-1127-C — 미등록 리포 표시 · no_ci_repos 명시 구분 (v1.19 same PR)

**커밋**: `b7e2fbb34` → pushed to `feat/M0-1127-B-ci-watch-false-alarm` (PR #62)

---

## 변경 요약

| 케이스 | 이전 | 이후 |
|---|---|---|
| `no_ci_repos` 명시 등록 (예: curiocity-relay) | review 직행 · 화면 표시 없음 | 동일 (변경 없음) |
| 미등록 리포 (어디에도 없음) | review 직행 · red 아니면 무표시 | review 직행 + 노랑 `└ 미등록 리포 <이름>` 서브행 (색 무관 항상) + 주의 구역 `⚠ 미등록 리포` 1줄 |

**파일**:
- `scripts/watch/collect-view.mjs`: `card.unregisteredRepo = repo` 플래그 (sync+async 양쪽)
- `scripts/watch/ci-watch-render.mjs`: 노랑 서브행 + 주의 구역 ⚠ 행 추가
- `status/runner-config.json`: `curiocity-devai-method` → `no_ci_repos` 명시 등록
- `docs/ci-watch.md`: "새 리포 추가하는 법" 3줄 섹션
- `specs/screens/ci-watch.md`: CW-PROG 현재 구현 열 갱신 · 이력 M0-1127-C 추가
- `scripts/test/ci-watch-w119.test.mjs`: 2건 추가 (W119-unregistered-flag · W119-noci-no-flag)

---

## 전체 테스트 로그 (ci-watch-*.test.mjs)

```
# tests 265
# suites 0
# pass 265
# fail 0
# cancelled 0
# skipped 0
```

### ci-watch-w119.test.mjs (14건)

```
ok 1  - W119-title-bracket
ok 2  - W119-title-bracket-long
ok 3  - W119-title-fallback
ok 4  - W119-no-storeport-def
ok 5  - W119-no-storeport-def-null
ok 6  - W119-noci-relay
ok 7  - W119-noci-storeport
ok 8  - W119-noci-fork
ok 9  - W119-noci-unregistered
ok 10 - W119-noci-null
ok 11 - W119-merge-removed
ok 12 - W119-false-alarm
ok 13 - W119-unregistered-flag: 미등록 리포 → unregisteredRepo 플래그 세팅   ← NEW
ok 14 - W119-noci-no-flag: 명시 등록 no_ci 리포 → unregisteredRepo 없음       ← NEW
# pass 14 / fail 0
```

---

## 미등록 리포 픽스처 렌더 (폭 101)

```
ci-watch v1.19  2026-11-27 12:00:00  ●진행 2  ■주의 0  ✔오늘 0  runner ?  heartbeat ?
─ 허브 큐 (m0 0 · m1 0 · m2 0 · m3 0 · r0 0) ───────────────────────────────────────────────────────
  m0  —
  ...
─ 진행 중 (2) ─────────────────────────────────────────────────────────────────────────────────────
  ▲ M2-TEST-UNREG m2  ●●●●●●●◐○  리뷰    5분    #42     미등록 리포 테스트 카드
    └ 미등록 리포 some-new-repo — runner-config.json ci_watch 에 추가 필요       ← 노랑 서브행
  ● M0-TEST-NOCI m0  ●●●●●●●◐○  리뷰    3분    #11     명시 no_ci 리포 카드 (표시 없음)
                                                                                   ← 서브행 없음
─ 주의 (0) ────────────────────────────────────────────────────────────────────────────────────────
  ⚠ 미등록 리포 some-new-repo — runner-config.json ci_watch.search_repos 에 추가 필요  ← 주의 구역
  다음 갱신 30초 | r 지금 갱신 · q 종료  --full: 전체 목록
```

---

## 검증의 검증

`curiocity-devai-method` (no_ci_repos 등록 후):
- `inNoCi: true` → `card.unregisteredRepo = undefined` (플래그 없음) ✓
- reason: 'CI 없음(리뷰 대기)' ✓

`some-brand-new-repo` (어디에도 없음):
- `inNoCi: false` → `card.unregisteredRepo = 'some-brand-new-repo'` ✓
- reason: '미등록 리포(CI 건너뜀)' ✓

---

## PR 코멘트

https://github.com/CuriocityDevAi/curiocity-relay/pull/62#issuecomment-7209452917
