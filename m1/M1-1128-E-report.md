PASS · PR #82 · 테스트 8/8 GREEN

## 작업 요약

PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/82
브랜치: feat/M1-1128-E
커밋: 43feabee0

## 변경 파일

- `scripts/lib/usage-limit.mjs` (신규): `detectUsageLimitInScreen()` 순수 함수 — `You've hit your limit` / `/rate-limit-options` 감지
- `scripts/hub-runner-v8.3.mjs` v8.3.5 → **v8.3.6**: onPoll 즉시 감지 + post-landing 보완 + 큐 발부 일시정지 로직
- `scripts/test/hub-runner-usage-limit.test.mjs` (신규): 판정 테스트 8건

## 테스트 결과

```
# tests 8
# pass 8
# fail 0
```

- M0-1128-D fixture 감지 ✓
- M2-1128-D fixture 감지 ✓
- M3-1128-H fixture 감지 ✓
- 일반 작업 화면 오판 없음 ✓
- 빈 화면 오판 없음 ✓
- API error 화면 오판 없음 ✓
- limit → limix 1글자 변경 → 미감지 ✓
- /rate-limit-optionX 1글자 변경 → 미감지 ✓

## 구현 세부

1. **onPoll 즉시 감지**: cmux-split `waitForLanding` 폴링(5초 주기) 중 usage-limit 화면 감지 시 → `status/runner-pause.json` 쓰기 + `claim.mjs` blocked 호출 (blockedBy=kyu). `waitForLandingAwake` 가 다음 폴에서 `claim-blocked` 감지 → 조기 종료 → 기존 pane-exit 흐름 사용.
2. **post-landing 보완**: cmux-split · cmux-tab 최종 screen-capture 후 usage-limit 감지 시 `runner-pause.json` 쓰기 (timeout 직후 발생 케이스).
3. **큐 발부 일시정지**: 메인 루프 각 tick 에서 `checkRunnerPauseExpiry()` 호출 → `runner-pause.json` 존재 시 모든 허브 `skip:runner-paused`. `resets_at` 파싱 성공·경과 시 자동 삭제+해제.
4. Add funds / Stop-and-wait 미선택 — 기존 pane-exit 만 사용.

self-update 는 허브가 모두 쉴 때 적용됨.
