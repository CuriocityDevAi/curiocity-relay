PASS https://github.com/CuriocityDevAi/curiocity-relay/pull/62  bb25dd01f

## 구현 요약

**REQ 1 — 거짓 경보 수정**
- `defaultFetchPrState(prNumber, fullRepo)`: fullRepo 없으면 null 반환 (storeport 추측 금지)
- `shouldSkipCi(repo, noCiRepos, searchRepos)`: CI 없는 리포(`no_ci_repos`) 또는 미등록 리포(`search_repos` 미포함) → true
- step 2.1: `ci_pending` 카드 중 shouldSkipCi → `review` 직행, reason = `'미등록 리포(CI 건너뜀)'`
- step 7.5b: shouldSkipCi → storeport-heavy 큐 삽입 차단
- `status/runner-config.json` ci_watch 섹션 추가 (search_repos · no_ci_repos config-driven)

**REQ 2 — 줄 제목 첫 줄 괄호 요지**
- `readQueueTitle`: 최우선 ① 첫 줄 `<ID> (<요지>)` 괄호 안 추출 (최대 80자) → 기존 원장 대사 폴백 유지

**REQ 3 — 버전**
- `CI_WATCH_VERSION = '1.19'` · 이력 `1.19 M0-1127-B(미등록 리포 거짓 경보 · 줄 제목 첫 줄 괄호 요지)`

**REQ 4 — 테스트 (`ci-watch-w119.test.mjs`)**
- W119-title-bracket / W119-title-bracket-long / W119-title-fallback
- W119-no-storeport-def / W119-no-storeport-def-null
- W119-noci-relay / W119-noci-storeport / W119-noci-fork / W119-noci-unregistered / W119-noci-null
- W119-merge-removed / W119-false-alarm
- ci-watch-spec-guard.test.mjs G-* 7개 (v1.19 반영)

## 테스트 결과 (19/19 pass)

```
ok 1  - G-SECT: 머리줄→허브 큐→CI 큐→진행 중→오늘 완료→주의 순서 (주의 있을 때)
ok 2  - G-SECT-5: 주의 없으면 5개 구역만
ok 3  - G-PROG: 진행 중 줄에 9칸 띠 (●/◐/○ 합 = 9) 와 단계 이름
ok 4  - G-HEAD: 머리줄 ●진행 N 이 진행 중 줄 수와 일치
ok 5  - G-HEAD-0: 프롬프트 0 건이면 ●진행 0 (CI 잡 수 아님)
ok 6  - G-RENDER: 화면에 [build-hubs]·[claim]·[hub-runner-*] 접두 없음
ok 7  - G-CIQ: CI 큐 열 제목 6개
ok 8  - W119-title-bracket: 첫 줄 "<ID> (<요지>)" → 괄호 안 요지 반환
ok 9  - W119-title-bracket-long: 긴 괄호 요지 → 80자로 자름
ok 10 - W119-title-fallback: 괄호 형식 없을 때 원장 대사 폴백
ok 11 - W119-no-storeport-def: defaultFetchPrState(X, undefined) → null
ok 12 - W119-no-storeport-def-null: defaultFetchPrState(X, null) → null
ok 13 - W119-noci-relay: shouldSkipCi("curiocity-relay") → true
ok 14 - W119-noci-storeport: shouldSkipCi("storeport") → false
ok 15 - W119-noci-fork: shouldSkipCi("agilo-medusa-pos-fork") → false
ok 16 - W119-noci-unregistered: shouldSkipCi("curiocity-devai-method") → true
ok 17 - W119-noci-null: shouldSkipCi(null) → false
ok 18 - W119-merge-removed: 미등록 리포 PR(머지됨) → merge 칸 · ageMin>=10 → inProgress 제외
ok 19 - W119-false-alarm: 미등록 리포 PR → ci_pending 에서 review 로 이동 · red 아님
# tests 19  # pass 19  # fail 0
```

## 실제 릴레이 렌더 (폭 101, 2026-11-27)

```
ci-watch v1.19 (2026-11-27)  2026/11/27  ●진행 3  ■주의 0  ✔오늘 0  runner v8.3.2  heartbeat 0분전

─ 진행 중 (3) ───────────────────────────────────────────────────────────────────────────────────
  ■ M0-1127-B  m0  ●◐○○○○○○○  작업    197분          ci-watch 진행 중 띠 — 머지된 PR 을 빨강으로 …
  ■ M2-1127-C  m2  ●◐○○○○○○○  작업    106분          손님 화면(CD) spec drift check 자동화 — 요소…
  ■ M3-1127-B  m3  ●◐○○○○○○○  작업    224분          fork#282 Lint 빨강 수정 + todo 상한 — 머지 …
```

- M2-1127-A/B: claims=done + 리포트 20분 초과 → inProgress 제외 (오탐 없음)
- 괄호 요지 제목 정상 표시 (M0-1127-B: "ci-watch 진행 중 띠 — 머지된 PR 을 빨강으로 …")
