CHANGES

# R0-1124-V · PR #251 리뷰 — feat(multi-store): M3-1124-I

## 판정: CHANGES

CHANGES 사유 1건. 나머지 4개 체크 항목은 모두 통과.

---

## 체크 결과

### ✅ 1. 매장별 값이 주소·PB1 적용 여부 2개뿐인지

체크아웃(`app/checkout/[draftOrderId].tsx`)과 영수증(`components/receipt/ReceiptCard.tsx`)의 PB1 계산은 서버 `quote` 응답을 그대로 소비한다. `usePosSettings` / `useCurrentPosSettings` 훅은 이번 PR에서 정의만 되고 **어디에도 import·사용되지 않는다**. 결제 금액 계산에 앱이 별도 per-location 값을 직접 쓰는 경로 없음. sc_pct 등 `PosSettings` 타입의 추가 필드는 future read-through 용이지만 현재 소비되지 않음.

### ✅ 2. PB1 pct=0 매장 grand_total·체크아웃·영수증 일치

- **체크아웃**: `q?.tax && q.tax.pct > 0 ? q.tax : null` — 서버 quote 기준, 앱 자체 계산 없음.
- **영수증**: `snap.tax.show && snap.tax.amount > 0` — 서버 `mint-sale-receipt` snapshot 기준. storeport PR #418에서 `pb1_pct=0` 매장은 `snapshot.posSettings.pb1_pct = null` → `pb1Active=false` → receipt tax block 미출력.
- **grand_total**: 앱이 덮어쓰지 않음. 서버 quote 값 그대로 표시.

### ✅ 3. location 미선택 → 기존 동작 회귀 0

| 경로 | 가드 |
|------|------|
| `usePosSettings` | `enabled: !!effectiveId` — locationId null 시 쿼리 비활성 |
| `usePosOrdersList` | `if (locId) query.stock_location_id = locId` — param 생략 |
| `useCompleteDraftOrder` | `if (stockLocation?.id) nextMetadata.stock_location_id = stockLocation.id` — stamp 생략 |
| `RegisterBadge` | `if (!storeName) return null` — 기존 동작 유지 |

404 fallback(`BRAND_DEFAULT_POS_SETTINGS`)은 storeport PR #418 미머지·네트워크 실패 시 앱이 깨지지 않도록 의도된 설계. 404 외 500 등 실제 서버 오류도 같은 catch로 흡수되는 점은 훅이 "디버깅/폴백 전용"이라는 PR 본문 취지 범위 내.

### ✅ 4. `order.metadata.stock_location_id` key storeport #418 일치 확인

storeport PR #418 diff 직접 확인:
```ts
// storeport orders-list/route.ts (PR #418 추가분)
const md = (o.metadata ?? {}) as Record<string, unknown>;
return md.stock_location_id === stockLocationId;
```
POS 앱 stamp (`nextMetadata.stock_location_id = stockLocation.id`)와 **이름·위치 완전 일치**. query param 명도 `stock_location_id`로 동일.

### ⚠️ 5. CI 상태 · 회귀 실패

| 잡 | 결과 |
|----|------|
| lint | **fail** |
| assertions (vitest 16/16) | pass |
| flow-tests | pass |
| playwright (11/11) | pass |
| route | pass |

lint 실패는 `components/ui/BottomSheet.tsx:125` `translateY.value` immutability 오류 1건. master 에도 `translateY` 관련 코드 9줄이 동일하게 존재 — **이번 PR 도입이 아닌 기존 실패**. 새로 추가된 파일에서 lint error는 없음.

---

## CHANGES 사유

### `api/hooks/pos-settings.ts` — 서버 응답 key 불일치

**storeport PR #418 API 계약** (`GET /admin/pos/settings?location_id=...`):
```json
{
  "settings": { "pb1_pct": 0, "store_address": "Plaza Senayan, Jakarta", ... },
  "id": "posset_...",
  "scope": "location:sloc_...",
  "location_id": "sloc_..."
}
```

**PR #251 `usePosSettings` 파싱 코드**:
```ts
if (res && typeof res === 'object' && 'pos_settings' in res && res.pos_settings) {
  return res.pos_settings;   // ← 'pos_settings' 는 존재하지 않는 키
}
return res as PosSettings;   // ← { settings: {...}, id, scope, location_id } 전체가 PosSettings로 캐스팅
                              //   res.pb1_pct === undefined
```

- 체크 키 `'pos_settings'` → 서버 실제 키는 `'settings'`
- fallthrough `return res as PosSettings` 시 `pb1_pct` = undefined (실제 값은 `res.settings.pb1_pct`)
- `PosSettings.address` (object) ↔ 서버 `store_address` (string): 타입 불일치

훅이 현재 소비되지 않아 런타임 영향 없음. 그러나 소비 시 pb1_pct를 항상 undefined로 읽어 PB1 gating이 무조건 꺼지는 silent bug로 발전. 수정 후 머지 권장:

```ts
// 수정 예시
const raw = await sdk.client.fetch('/admin/pos/settings', { query: { location_id: effectiveId } });
if (raw && typeof raw === 'object' && 'settings' in raw && raw.settings) {
  return raw.settings as PosSettings;   // settings 키로 접근
}
return raw as PosSettings;
```

`PosSettings.address` 타입도 `store_address?: string | null` 로 맞출 것.

---

## 기타 확인 사항 (참고)

- `RegisterBadge` 닫힘 상태 `testID="register-badge-store-closed"` 추가 — playwright round D가 이를 검증. 적절.
- `useCompleteDraftOrder` openSession 유무와 독립된 stamp — 세션 미오픈 draft 경로에서도 매장 필터 유지. 올바름.
- e2e 하네스 `port: 0` 자동 할당 (M3-1124-G 패턴 계승). playwright CI pass 확인.
