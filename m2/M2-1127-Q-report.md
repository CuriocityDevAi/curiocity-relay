PASS · relay#74 head 9db940ee8

## 작업 내용

- `scripts/hub-runner-v8.3.mjs` 마지막 줄 `// TEST` 제거 (1줄 삭제)
- 커밋: `9db940ee8 fix(runner): M2-1127-Q — v8.3.5 마지막 줄 // TEST 주석 제거`
- push → `origin/feat/M2-1127-O` (`da8b6519d..9db940ee8`)

## 테스트 결과

| 테스트 | 결과 | 비고 |
|---|---|---|
| `--selftest-auto-recover` | PASS | ahead=4 → dropped=3(heartbeat) · reapplied=1(claim) · origin 우선 복구 성공 |
| `--selftest-human-files` | PASS | 사람 파일 혼입 감지 · HEAD 보존 |
| `--selftest-ci-health-recover` | PASS | ci-health 2개 커밋 자동 해소 · HEAD=origin/main |
| `hub-runner-recovery.test.mjs` | 8/8 PASS | 재시작 복구 판정 단위 테스트 |

## 실행 명령

```
# fix 스크립트(9db940ee8)를 origin/main 기준 clean worktree에 복사해 실행
node scripts/hub-runner-v8.3.mjs --selftest-auto-recover
node scripts/hub-runner-v8.3.mjs --selftest-human-files
node scripts/hub-runner-v8.3.mjs --selftest-ci-health-recover
node --test scripts/test/hub-runner-recovery.test.mjs
```

> selftest-auto-recover는 `origin/main` 기준 0 ahead 상태를 사전 조건으로 요구함 → feat/M2-1127-O 워크트리(2 ahead)에서는 실행 불가 · origin/main detached HEAD 클린 워크트리에서 실행.
