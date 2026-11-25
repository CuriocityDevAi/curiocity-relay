# M1-1125-U PASS

PR: https://github.com/CuriocityDevAi/storeport/pull/446

## 라이브 연결 근거

| 파일:줄 | 내용 |
|---------|------|
| `app/index.tsx:230` | `cdSnapshot` useMemo — `snapshot.payment_phase && snapshot.customer_flow` guard |
| `app/index.tsx:280` | `handleCdAction` → `postCdFlowAction` 서버 호출 |
| `app/index.tsx:300` | Case 1 useEffect — `paid+none` → 3s → `start_entry` 서버 호출 |
| `app/index.tsx:367` | CD sync 렌더링 분기 (`cdSnapshot` 존재 시 OrderListScreen/PhoneFlowScreen) |
| `src/lib/snapshot-api.ts:18` | `postCdFlowAction` — `POST /customer-display/customer-flow` |
| `src/types/order-snapshot.ts:107` | `OrderSnapshot.payment_phase?/customer_flow?/tender?` 추가 |

## 테스트 로그

```
vitest run (NODE_PATH storeport-m1 node_modules)
 Test Files  15 passed + 1 new = 16
      Tests  301 passed (13 new)
   Duration  461ms
```

**신규 테스트 (src/lib/__tests__/live-cd-connect.test.ts, 13케이스)**
- (a) selectCdView 3종: tendering+entering→phone-flow, paid+confirmed→earned, paid+none→receipt-full ✓
- (b) postCdFlowAction body: start_entry(no phone), submit_phone(with phone), skip, confirm_timeout, 401 ✓
- (c) ok:false 처리: customer_flow 반영, 없는 경우 safe, network error ✓

## 스크린샷 목록

**라이브 경로 (live-cd-route.spec.ts)**
1. `screenshots/live-cd/live-tendering-entering.png` — tendering+entering → phone-flow keypad
2. `screenshots/live-cd/live-paid-confirmed-earned.png` — paid+confirmed → earned panel
3. `screenshots/live-cd/live-paid-none-receipt-full.png` — paid+none → receipt-full (waiting)
4. `screenshots/live-cd/live-enter-phone-start-entry.png` — 버튼 클릭 → start_entry 1회 POST

**목 라우트 (cd-sync-flow.spec.ts, 기존 M1-1125-T)**
5. `screenshots/cd-sync/order-list-building-none.png`
6. `screenshots/cd-sync/order-list-tendering-none.png`
7. `screenshots/cd-sync/keypad-panel-tendering-entering.png`
8. `screenshots/cd-sync/first-visit-panel-tendering.png`
9. `screenshots/cd-sync/confirm-panel-tendering-confirming.png`
10. `screenshots/cd-sync/waiting-panel-tendering-confirmed.png`
11. `screenshots/cd-sync/earned-panel-paid-confirmed.png`
12. `screenshots/cd-sync/failed-panel-failed-confirmed.png`
13. `screenshots/cd-sync/qris-panel-tendering-entering.png`
14. `screenshots/cd-sync/receipt-full-paid-none.png`
15. `screenshots/cd-sync/remaining-panel-tendering-split.png`

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `app/index.tsx` | LiveIndexRoute CD sync path 추가, taxRate 11→10 |
| `app/mirror.tsx` | taxRate 11→10 |
| `src/lib/snapshot-api.ts` | `postCdFlowAction` 추가 |
| `src/types/order-snapshot.ts` | PaymentPhase/CustomerFlow/CdTender 타입 추가, OrderSnapshot 옵셔널 필드 |
| `src/types/cd-sync-contract.ts` | 중복 타입 제거, re-export로 대체 |
| `src/lib/__tests__/live-cd-connect.test.ts` | 신규 vitest 13케이스 |
| `e2e/live-cd-route.spec.ts` | 신규 Playwright 라이브 경로 e2e |
