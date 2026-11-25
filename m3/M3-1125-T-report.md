# M3-1125-T — 계약서 v1.2 · R0-1125-AK #266 CHANGES

PASS

## lint 로그

```
✖ 69 problems (0 errors, 69 warnings)
```
(all 4 prettier errors fixed — sell.tsx + CustomerPhoneStatus.tsx)

## 테스트 로그

```
 Test Files  1 passed (1)
      Tests  3 passed (3)
   Duration  136ms
```
(`__tests__/m3-1125-t-link-customer-no-location.test.ts` — 매장 ID 없음 → fetch 0회)

## 변경 요약

| REQ | 파일 | 내용 |
|-----|------|------|
| 1 | `app/checkout/success/[orderId].tsx` | `setLinkedResult`/`setIsLinkedByDisplay` → 상수 교체 (unused 정리) |
| 2 | `lib/loyalty-snapshot.ts` | `CustomerFlow.source: 'cd' \| 'pos' \| null` |
| 3 | `api/hooks/pos-loyalty.ts` | `CustomerFlowActionResult` ok:false `customer_flow: CustomerFlow \| null` |
| 4 | `components/loyalty/LinkCustomerSheet.tsx` | `stockLocationId` 없으면 호출 차단·안내 |
| + | `app/(tabs)/sell.tsx`, `components/customer-display/CustomerPhoneStatus.tsx` | prettier 오류 수정 |

## 커밋

`7163b05` feat(loyalty): M3-1125-T — 계약서 v1.2 · R0-1125-AK #266 CHANGES  
branch: `feat/M3-1125-R` → pushed
