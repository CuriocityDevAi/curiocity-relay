PASS

# M1-1125-D — install.sh TARGET v8.3 갱신 리포트

날짜: 2026-11-25
작업자: Sonnet (M1-1125-D)
PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/30
브랜치: chore/M1-1125-D-runner-target-v83
커밋: 14edfd70a

---

## 변경 내용

`scripts/hub-runner-install.sh`:

```
- TARGET_RUNNER="${TARGET:-hub-runner-v8.2.mjs}"
- FALLBACK_RUNNER="${FALLBACK:-hub-runner-v8.1.mjs}"
+ TARGET_RUNNER="${TARGET:-hub-runner-v8.3.mjs}"
+ FALLBACK_RUNNER="${FALLBACK:-hub-runner-v8.2.mjs}"
```

---

## detectUpdate 경로 확인

`scripts/lib/self-update.mjs detectUpdate` 함수:

1. `git show origin/main:scripts/hub-runner-install.sh` 로 install.sh 읽기
2. `parseInstallTarget` 가 `TARGET_RUNNER="${TARGET:-...}"` 에서 target 파싱  
   → 머지 후: `hub-runner-v8.3.mjs`
3. `origin/main:scripts/hub-runner-v8.3.mjs` SHA 계산
4. 현재 실행 중 runner(`SELF_BOOT_SHA`) = v8.2 SHA ≠ v8.3 SHA  
   → `renamed=true, bytesDiffer=true, changed: true`
5. 메인 루프가 `selfUpdateEnabled && allHubsIdle` 조건 확인  
   → 허브 전부 idle 되는 순간 `runPreflight` 호출

**결론**: 이번 PR 머지 후 origin/main 갱신 시 `changed: true` 를 반환 → 자동 업데이트 트리거 확인.

---

## v8.3 preflight 로컬 실행 결과

| 단계 | 명령 | 결과 |
|------|------|------|
| syntax check | `node --check hub-runner-v8.3.mjs` | ✓ EXIT:0 |
| selftest 1 | `--selftest-stale-lock` | ✓ EXIT:0 |
| selftest 2 | `--selftest-merge-fail3` | ✓ EXIT:0 |
| selftest 3 | `--selftest-report-path-off` | ✓ EXIT:0 |
| selftest 4 | `--selftest-main-guard-d` | ✓ EXIT:0 |
| selftest 5 | `--selftest-main-guard-e` | ✓ EXIT:0 |
| selftest 6 *(v8.3 신규)* | `--selftest-head-moved-unrelated` | ✓ EXIT:0 |
| selftest 7 *(v8.3 신규)* | `--selftest-safe-push-detached` | ✓ EXIT:0 |

**전체 7/7 PASS** — preflight 통과 확인.

---

## 기대 동작 (머지 → 자동 갱신 경로)

```
PR #30 머지 → origin/main 갱신
 → 러너 주기 poll (default: 5분) → detectUpdate → changed=true
 → allHubsIdle 대기
 → runPreflight (node --check + DEFAULT_SELF_UPDATE_PREFLIGHT 7종)
 → 통과: ensureSymlink
     ~/.hub-runner/bin/hub-runner.mjs → …/scripts/hub-runner-v8.3.mjs
   writePending({prev: v8.2, next: v8.3, boot_count: 0})
   process.exit(0)
 → launchd KeepAlive → 재기동 → hub-runner-v8.3 로드
 → 3분 내 heartbeat 성공 → clearPending
 → heartbeat runner=v8.3
```

### 실패 시 자동 롤백 경로

```
v8.3 재기동 → handleBootPending 실행
  pending.boot_count >= BOOT_FAILURE_THRESHOLD(1)  (3분 내 heartbeat 없으면)
   → ensureSymlink prev(hub-runner-v8.2.mjs) 복원
   → process.exit(0) → launchd 재기동 → v8.2 로 복귀
```

또는 install.sh 에서 직접 롤백:  
`verify_loaded` 10초 타임아웃 → `write_plist FALLBACK(v8.2)` → `load_plist` → 재검증.
