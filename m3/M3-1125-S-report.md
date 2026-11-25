PASS

## 테스트 로그

```
 RUN  v5.1.0 /Users/kyu.lee/projects/pos-m3

 Test Files  86 passed (86)
      Tests  1114 passed | 6 expected fail | 3 todo (1123)
   Start at  19:48:44
   Duration  2.11s
```

신규 테스트 (m3-1125-s-customer-flow-location.test.ts): 9/9 pass

## 변경 내용

| 파일 | 변경 |
|------|------|
| `api/hooks/pos-loyalty.ts` | `CustomerFlowActionInput` — link_phone·reset 모두 `stock_location_id: string`, `register_session_id?: string` 필수 추가 |
| `components/loyalty/LinkCustomerSheet.tsx` | `stockLocationId`·`registerSessionId` props 추가. `no_active_snapshot` → "Customer display not connected." 에러 표시 (sent 상태 진입 안 함) |
| `app/checkout/success/[orderId].tsx` | `LinkCustomerSheet` 에 `stockLocationId={settings.data?.stock_location?.id}` · `registerSessionId={registerId}` 전달 |
| `app/(tabs)/products.tsx` | "Next customer anyway" 버튼 → `flowAction.mutateAsync({action:'reset', stock_location_id, ...})` 먼저 호출, `no_active_snapshot`·네트워크 에러 조용히 삼키고 `executeNextCustomer` 진행 |
| `app/(tabs)/sell.tsx` | 동일 패턴 (sell 화면 Next customer anyway) |
| `__tests__/m3-1125-s-customer-flow-location.test.ts` | 신규: body 포함 확인 · no_active_snapshot 2경로 · ok:true 경로 (9개 케이스) |

## 커밋

`98a809b` feat(loyalty): M3-1125-S — customer-flow body 에 stock_location_id 포함 · no_active_snapshot UX  
branch: `feat/M3-1125-R` → pushed
