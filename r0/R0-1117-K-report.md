#174 APPROVE

## R0-1117-K — fork PR #174 (M3-1117-F) 리뷰 결과

---

## REQ 1 · 테스트 · 타입체크 · 웹 빌드

| 항목 | 결과 |
|------|------|
| 단위 테스트 (m3-1117-f + m3-1117-b) | **23/23 pass** |
| TypeScript noEmit | **10 오류 → 10 오류 (증감 없음)** |
| `expo export --platform web` | **성공** |

기존 TS 오류 10개는 PR 이전부터 존재 (FlashList estimatedItemSize, global.css 사이드이펙트 임포트 등). PR이 추가한 오류 없음.

---

## REQ 2 · 카드 3종 표기 검증

### 비검색 모드 (`useOrders` → `sdk.admin.order.list`)

`api/hooks/orders.ts:28` — `fields: '+customer.phone'` 를 기본값으로 먼저 세팅, `...query` 스프레드가 덮어쓰더라도 `app/(tabs)/orders.tsx`의 `fields: '+customer.*,...'` 가 phone을 포함하므로 항상 phone 필드 확보됨.

### 검색 모드 (`usePosOrdersList` → `/admin/pos/orders-list`)

`lib/pos-order-adapter.ts:34` — `customer_phone_masked` → `customer.phone` 매핑. 이후 `formatOrderCustomer`가 처리.

### 3종 표기

| 케이스 | 입력 | 출력 |
|--------|------|------|
| 이름+번호 | `{first_name:'Kyu', last_name:'Lee', phone:'+6281312482048'}` | `POS (Kyu Lee · 0813-****-2048)` |
| 번호만 (E.164) | `{phone:'+6281312482048'}` | `POS (0813-****-2048)` |
| 번호만 (search, 마스킹) | `{phone:'0813-****-2048'}` | `POS (0813-****-2048)` |
| 번호전용 손님 (phone null, first_name=마스킹) | `{first_name:'0813-****-2048', phone:null}` | `POS (0813-****-2048)` |
| 미연결 (null) | `null` | `POS (Unknown Customer)` |
| 기본 손님 email | `{email:'noreply+pos-guest@agilo.com'}` | `POS (Unknown Customer)` |

### 마스킹 모양

`lib/format-order-customer.ts:25` — E.164 감지 시 `maskE164()` 호출, 이미 마스킹된 값은 그대로 통과. `lib/phone-id.ts:49-55` 의 `maskLocal` → `${first4}-****-${last4}` 형식. 주석 "keep in sync with storeport commerce-core lib/phone-id.ts" 명시.

### 기본 손님 처리

`POS_DEFAULT_CUSTOMER_EMAIL = 'noreply+pos-guest@agilo.com'` (lib/format-order-customer.ts:9) = `DRAFT_ORDER_DEFAULT_CUSTOMER_EMAIL` (api/hooks/draft-orders.tsx:26). 동일 값으로 "Unknown Customer" 처리 정확.

---

## REQ 3 · "연결한 주문이 Unknown 으로 보인 원인" 판단 타당성

**판단: 표시 문제. 연결 자체는 성공.** 타당함.

이유:
- `useOrders` 가 `+customer.phone` 없이 `sdk.admin.order.list()` 를 호출하면 Medusa 기본 응답에서 `customer.phone` 미포함.
- 번호전용 손님(email=null, phone=undefined)은 기존 폴백 로직에서 "Unknown Customer" 표시.
- `customer_id` 는 주문에 정상 세팅되므로 연결 자체는 성공적.
- 수정: `useOrders` 에 `fields: '+customer.phone'` 기본값 추가 → phone 필드 항상 확보.

---

## REQ 4 · 동의 1회 클라이언트 코드 safety (M2-1117-I 전 머지 가능 여부)

`components/loyalty/LinkCustomerSheet.tsx` 전체를 검색한 결과 `loyalty_consent_at` 참조 **없음**.

현재 동작:
- `consent` 상태는 시트 열릴 때마다 `false` 초기화 (line 42, 50)
- `canSubmit = phone.length >= 10 && consent && !linkMut.isPending` (line 66) — 매번 체크 필요
- M2-1117-I (서버 `loyalty_consent_at` 필드 추가) 없이도 기존처럼 동의 체크 요구

**서버 보강 전 머지해도 안전.** 클라이언트에 `loyalty_consent_at` 를 소비하는 코드가 없으므로 필드 미존재 시 깨질 경로 없음.

---

## 기타 (Nit, 머지 블로킹 아님)

**`app/(tabs)/orders.tsx:1` — 미사용 import**
```ts
import { DRAFT_ORDER_DEFAULT_CUSTOMER_EMAIL } from '@/api/hooks/draft-orders';
```
PR에서 `customerName` 로직을 `formatOrderCustomer` 1줄로 교체하면서 이 import가 더 이상 쓰이지 않음. `formatOrderCustomer` 내부에서 자체 `POS_DEFAULT_CUSTOMER_EMAIL` 상수를 사용. 삭제 권장 (다음 touch 때 정리).

---

## 종합

APPROVE. 카드 표기 3종 정확, 마스킹 storeport 동일, Unknown 원인 판단 타당, 동의 safety 확인. Nit 1건(미사용 import)은 블로킹 없음.
