R0 판정: CHANGES

# R0C-1119-AC — curiocity-relay PR #8 5차(최종) 리뷰 (M0-1119-R 수정분)

- 대상: PR #8 HEAD 36dcb40d (fix/M0-1119-K-ci-deadline) · 직전 R0C-1119-AA CHANGES
- 기준(5차): 데이터 영구 누락 · 러너 본업 방해 · 보안 문제만 CHANGES 사유
- 테스트: `node --test scripts/test/*.test.mjs` → tests 179 · pass 179 · fail 0 (8.3s)
- PR 코멘트: https://github.com/CuriocityDevAi/curiocity-relay/pull/8#issuecomment-7009266325
- 모의 실험: 가짜 GitHub(status 필터 · created>= 필터 · 최신순 100개)를 execFn 으로 주입. 스크립트는 리포에 넣지 않음.

## 1. AA 재현 재실행 — 해결
| 시나리오 | t1 | t2 | t3 |
|---|---|---|---|
| §2-1 storeport queued 10.2s 지연 · fork long(T-40m 진행) + short(T-30m 완료) | added=1 · partial · fork 커서 미설정 | long 완료 → added=1 (long 기록) | added=0 |
| §2-2 A(T-40m) jobs throw · B(T-30m) 정상 | added=0 · partial · 커서 = T-40m | added=2 (A·B) | added=0 |

`sr.partial`(collectInProgress mid-break) 도 커서 전진 생략 확인(R-3). 러너 본업 파일 미변경 (PR 변경 = .gitignore · ci-health.mjs · 테스트 2개).

## 2. 커서 경로 판독 — 남은 영구 누락 (CHANGES 사유)
커서 후보 = [partial ? earliestUnprocessed : latestProcessedRunCreatedAt] + activeMin. **history 쪽 후보가 없어도 activeMin 단독으로 커서가 전진**함. 정상(완료 run 0건)일 땐 안전하지만, 완료 run 을 아예 보지 못한 경우에도 같은 경로를 탐:

- ① 완료 run 목록 조회(`status=completed&created>=`) 가 throw → `collectHistoryForRepo` catch 가 non-404 도 `partial:false` · null 로 반환 → 커서 = activeMin.
- ② `collectCompletedJobs` 시작부 budget/deadline 조기 반환 → `partial:true` · `earliestUnprocessed:null` → 커서 = activeMin.

재현:
| 시나리오 | t1 | t2 | t3 | t4 |
|---|---|---|---|---|
| fork state 정상 · X(T-10m 진행) · C(T-40m 완료) · t1 목록 조회 throw | added=0 · partial=false · 커서 = T-10m | 0 | X 완료 → 1 (X만) | 0 → **C 영구 누락** |
| storeport 완료 10개가 budget(17) 소진 · fork 동일 구성 | 9 · fork 커서 = T-10m | 1 (storeport 잔여) | 1 (X만) | → **C 영구 누락** |

실제성: `--once` 실측 20.1s (= 내부 마감 20s) · timeout clamp 가 마감 직전 gh 호출을 kill → 목록 조회 throw 경로를 실제로 탐. 해당 repo 에 진행/대기 run 이 있으면(바쁜 시간대 흔함) 누락.

### 수정안 (로컬 실측 · 커밋 안 함)
```js
// collectHistoryForRepo catch: non-404 는 partial:true 로
return { records: [], partial: true, earliestUnprocessed: null, latestProcessedRunCreatedAt: null };
// 커서 블록 (stateFullySeen 검사 뒤):
if (partial && !earliestUnprocessed) continue;
```
→ 위 두 재현 모두 C 기록(t2 added 1·2) · AA 재현 유지 · 기존 179/179 pass (O-1c "active 만 → cursor = min active" 유지). 위 시나리오 회귀 테스트 1~2건 추가 요청.
(참고: `if (candidates.length===0) continue` 로 막는 방식은 O-1c 1건 실패.)

## 3. 판단
main 은 매 회 `deadline 30000ms` 로 CI 칸이 비어 있어 이 PR 이 이미 훨씬 나음. 다만 기준상 영구 누락이 남아 CHANGES. 위 3줄 반영 시 APPROVE 대상 — 급하면 머지 후 즉시 후속 수정도 사람 판단으로 가능.

## 4. 후속 (막지 않음)
1. per_page=100 첫 페이지만 조회 — 커서 이후 run 100개 초과 시 오래된 쪽 누락.
2. `waiting` / `pending` / `requested` 상태 run 은 activeMin 에 안 잡힘.
3. clamp kill 이 `Command failed` error 로 표시 (Y nit).
4. 완료 run 인데 jobs 중 미완료/`completed_at` 없음(`allCompleted=false`) 이면 unprocessed 표시 없이 지나감 — 드문 엣지.
5. 목록 조회 실패 시 결과 `partial` 이 false 로 보고됨 (§2 수정안으로 같이 해결).

금지 준수: PR 브랜치 push · 머지 없음.
