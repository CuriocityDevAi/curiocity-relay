취소 19/20 · cache 제거 PR #393 · Setup Node 전 ~11m(복원6+저장5)→후 0s(제거) · #391 머지 X(build-commerce-core·unit-commerce-core pending) · 남은 queued 10(전부 열린 PR O)

## 1. 옛 run 취소 결과

| run | 분류 | headBranch | 취소 |
|-----|------|-----------|------|
| 44343382820 | 머지된 PR (feat/M0-1118-K-cd-sync-r3 · #381) | pull_request | O |
| 44440326972 | 머지된 PR (ci/M2-1119-C-summary · #387) | pull_request | O |
| 44343017404 | 머지된 PR (refactor/M2-1118-R-rb2b-order-snapshot · #382) | pull_request | O |
| 44283247928 | 머지된 PR (feat/M2-1118-N-pin-audit · #379) | pull_request | O |
| 44282867637 | 머지된 PR (fix/M3-1118-E-cd-pairing-persist · #376) | pull_request | O |
| 44258898591 | 머지된 PR (ci/M2-1118-L-queue · #369) | pull_request | O |
| 44444689248 | main push | push | O |
| 44426179794 | ci-summary (workflow_run · main) | workflow_run | O |
| 44383607205 | ci-summary (workflow_run · main) | workflow_run | O |
| 44366762357 | ci-summary (workflow_run · main) | workflow_run | O |
| 44348532588 | ci-summary (workflow_run · main) | workflow_run | O |
| 44346732580 | ci-summary (workflow_run · main) | workflow_run | O |
| 44344293897 | ci-summary (workflow_run · main) | workflow_run | O |
| 44343870274 | ci-summary (workflow_run · main) | workflow_run | O |
| 44343403374 | ci-summary (workflow_run · main) | workflow_run | O |
| 44339397078 | ci-summary (workflow_run · main) | workflow_run | O |
| 44337410749 | ci-summary (workflow_run · main) | workflow_run | O |
| 44334711995 | ci-summary (workflow_run · main) | workflow_run | O |
| 44334338198 | ci-summary (workflow_run · main) | workflow_run | X (이미 completed) |
| 44283550959 | ci-summary (workflow_run · main) | workflow_run | O |

취소 성공 19건 / 20건 (1건은 이미 completed 상태)

## 2. ci.yml cache:pnpm 제거

PR #393: https://github.com/CuriocityDevAi/storeport/pull/393

대상 job (runs-on: [self-hosted, curiocity-mac]):
- unit-commerce-core (L145)
- build-commerce-core (L177)
- customer-display (L214)
- e2e-admin-loyalty (L270)
- wrangler-check-care-agent (L321)
- pos-integration (L367)

Setup Node 시간:
- 전: 복원 ~6min + 저장 ~5min = ~11min/job (self-hosted는 로컬 store 보유라 순수 낭비)
- 후: 0s (remote cache 작업 없음)

## 3. #391 머지 상태

PR #391 (ci/M2-1119-F-summary-all):
- changes-filter: pass
- markers-and-forbidden: pass
- check: pass
- build-commerce-core: pending → 머지 불가
- unit-commerce-core: pending → 머지 불가
→ 머지 X

## 4. 남은 queued 현황

총 10개 · 전부 열린 PR:
1. ci/M2-1119-I-no-remote-cache (#393 · 이 PR · 2 runs)
2. feat/M1-1119-F-cd-responsive
3. ci/M2-1119-F-summary-all (#391)
4. feat/M2-1119-D-cd-skip
5. refactor/M1-1119-B-lib-boundary
6. refactor/M2-1118-V-rb3
7. test/M2-1119-B-pin-audit
8. test/M1-1118-K-store-day-rehearsal
9. fix/M2-1118-S-fulfilled-refund
