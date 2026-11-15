# M2-1116-B Report

스레드 2개 resolve · 미반영 1개 · mergeState: BLOCKED

## 스레드 판정

| ID | 내용 | M3-1116-A 반영 | 조치 |
|----|------|---------------|------|
| PRRT_kwDOTe-UYs63uKsY | `paid_so_far` = captured 전용 (pending 제외) | ✅ 반영됨 — commit: "paid_so_far = captured 텐더 합만 · pending_amount 신규 필드" | resolved |
| PRRT_kwDOTe-UYs63uKxn | CI `feature-map-check` FAIL (route.ts 미분류) | ✅ 반영됨 — commit: "feature-map.yaml: split-pending-orders 프로세스 등록 → check CI 초록" | resolved |
| PRRT_kwDOTe-UYs63uKuc | `register_session_id` 필터 테스트 시나리오 #5 미작성 | ❌ 미반영 — M3-1116-A 커밋에 언급 없음 | 미해결 유지 |

## PR 상태

```json
gh pr view 285 --json mergeStateStatus,reviewDecision
{"mergeStateStatus":"BLOCKED","reviewDecision":""}
```

- `mergeStateStatus: BLOCKED` — 미해결 스레드 1개 잔존(`register_session_id` 테스트)으로 머지 차단 유지
- `reviewDecision: ""` — 공식 approve 없음

## 미반영 사항

**`register_session_id` 필터 미검증 (PRRT_kwDOTe-UYs63uKuc)**

`?register_session_id=` 쿼리 파라미터 필터에 대한 통합 테스트 시나리오(#5)가 없음. 같은 위치 내 여러 계산대 운영 시 범위 오류 가능. M3-1116-A에서 `paid_so_far`·`feature-map` 수정은 완료됐으나 이 테스트 케이스는 추가되지 않아 resolve 불가.
