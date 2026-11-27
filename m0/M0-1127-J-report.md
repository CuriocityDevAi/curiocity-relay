PASS

## M0-1127-J — storeport#474 리뷰 수정 (R0-1127-K · CHANGES 반영)

- **PR**: CuriocityDevAi/storeport #474 `fix/M0-1127-G-cd-active-snapshot`
- **HEAD**: `ca7131a240e114fcc6799ffc0bd66788f8dbef4b`
- **푸시 시각**: 2026-11-27 14:31 (WIB)
- **CI 완료 시각**: 2026-11-27 14:48 (WIB)

## CI 요약 (run 45959008753 · 실제 돈 것만 초록)

| 잡 | 결과 |
|---|---|
| `route` | success |
| `changes-filter` | success |
| `markers-and-forbidden` | success |
| `heavy-mac` | success |
| `heavy-cloud` | skipped (iMac 미러로 넘기도록 M1-1127-B 에 의해 폐지됨) |
| `feature-map-check` (별도 workflow) | success |

## 바뀐 파일 (3건)

- `apps/commerce-core/src/modules/register_session/service.ts` — `skipSnapshot(id, opts)` 가 `customer_flow_state ∈ {entering, first_visit, confirming}` 이면 `skipped` 로 전이 (+`customer_flow_source`). 이미 `confirmed/none/skipped` 면 유지.
- `apps/commerce-core/src/modules/register_session/lifecycle.ts` — `isPhoneEntryOpen` 유기 가드 `hasInteraction` 에서 `phone_entry_state === 'waiting'` 제외. `customer_flow_state='entering'` + `phone_entry_state='typing'` + `phone_partial` 만 interaction.
- `apps/commerce-core/integration-tests/pos/cd-pos-sync-v4-pos-chip-skipped.spec.ts` — 통합 테스트 1건 추가.

## 요구사항 커버리지 (큐 [REQ])

| # | 요구 | 반영 |
|---|---|---|
| 1 | 20초 skip 이 orchestrator 를 거쳐 (또는 skipSnapshot 이) `customer_flow_state='skipped'` 로 · POS 칩 ⑤ Skipped+Ask again · 손님 화면 Welcome · Ask again → entering | `service.skipSnapshot` 에 상태 전이 동반 |
| 2 | 유기 가드 `hasInteraction` = typing + phone_partial 만 (`waiting` 제외) | `lifecycle.isPhoneEntryOpen` 수정 |
| 3 | 회귀 테스트: `paid + skipped + 20초 skip 직후 + paid_age 60s` → CD 활성 목록 제외 · POS 유지 · Ask again → 다시 활성. 검증의 검증: 1번 수정을 되돌리면 빨강 | 통합 테스트 1건 추가 (아래) |
| 4 | 머지 전 아이맥 하네스 불가 — PR 본문에 머지 직후 fork workflow_dispatch 절차 · 단위/통합 테스트로 실DB 전이 1건 이상 | PR 본문 "실기 QC" 섹션 + 통합 테스트 |
| 5 | push 후 heavy-mac 초록 확인 | ✅ `heavy-mac success` (위 표) |

## 회귀 테스트 이름

`cd-pos-sync-v4-pos-chip-skipped.spec.ts` ·
`"CD Case 1 start_entry 후 20초 skip → customer_flow_state='skipped' · CD 는 대기 · POS 는 Skipped+Ask again · Ask again → entering 재개"`

실 DB(`integration-tests`) 에서 돌림. 검증의 검증: `service.skipSnapshot` 의 `customer_flow_state` 전이 분기를 되돌리면 `expect(afterSkip.customer_flow_state).toBe("skipped")` 에서 빨강.

## 보조 검증 (아이맥 로컬)

- `apps/commerce-core` jest unit: 886 passed / 75 suites (pre-push hook)
- `apps/customer-display` vitest: 334 passed / 17 files (pre-push hook)
- `pnpm typecheck` apps/commerce-core: error 0
- 전체 `pnpm typecheck` 에서 `apps/wing` 은 pre-existing React 19 타입 오류 1건(`components/ui/button.tsx:50`) — 본 브랜치 변경과 무관, main 에서도 재현. heavy-mac 범위 밖.

## 후속

- 머지 직후 오케가 fork `e2e-cd-pos` workflow_dispatch 로 `case1-new-customer` + `case1b-existing-customer`(fork#287) 실행 예정.
- Kyu 실기 2026-11-27 13:01 §7 "20초 뒤 대기 화면" 재확인 항목 (Railway 재배포 후).
