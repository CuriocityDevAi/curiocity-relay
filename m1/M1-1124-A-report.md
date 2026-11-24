M1-1124-A
판정: 7개 항목 모두 원인 파일:줄 특정 완료. 코드 읽기 기반 — 실기(기기 측정) 없는 항목은 "(추정)" 표기.

---

## D1 · 칩 번호 중복 (#3이어야 하는데 #2 재발급)

**원인** (`api/hooks/draft-orders.tsx:143`, 코드 확인)
```
const posOrderNum = getDraftOrderList().length + 1;
```
#1 완료 → `removeDraftOrderFromList` → 목록 `[#2]` (길이=1) → 새 주문 생성 시 `1+1=2` → #2 재발급.
"현재 목록 길이+1"은 가변이므로, 삭제가 일어날 때마다 번호가 겹침.

**필요한 규칙**: "세션 내 한 번 쓴 번호 재사용 안 함" → 단조 증가 카운터 `_nextPosOrderNum` 추가.
- 생성 시: `_nextPosOrderNum += 1` (삭제해도 되돌리지 않음)
- 초기화 시점: 레지스터 오픈(`register-session.ts`의 오픈 hook)에서 `_nextPosOrderNum = 0` 호출

**저장 위치 결정**:
- 로컬 모듈 변수(메모리)로도 "세션 내 재사용 안 함" 달성 가능.
- 앱 강제 종료/재시작 대비: `metadata.pos_order_num`이 이미 서버에 저장되므로, 세션 복구 로직에서 `max(metadata.pos_order_num)` → 카운터 복원 가능 (옵션).

**고칠 파일**:
- `api/hooks/draft-orders.tsx` — 카운터 변수 + 생성·초기화 로직 — **S**
- `api/hooks/register-session.ts` — 오픈 시 카운터 리셋 hook — **S**

---

## D2 · 번호 이중 관리: 칩 번호 vs Order 번호

| 번호 | 발급 위치 | 화면 |
|------|-----------|------|
| 칩 번호 `posOrderNum` | `draft-orders.tsx:143` (로컬 카운터) | POS 칩 행(`OrderChips.tsx`), 영수증 "Queue #N"(`ReceiptCard` — M2-1123-E), 칩 상세 다이얼로그 `numFor()` |
| Order 번호 `display_id` | Medusa 서버 auto-increment | POS 성공화면 헤더(`success/[orderId].tsx:291` `order_display_id`), 영수증 주문번호, Admin, 손님 화면 영수증 |

현재 혼용 없음 — 두 번호가 각자 고유 역할. 단, 손님 화면 영수증에는 `display_id`만 표시되고 칩 번호(Queue #N)가 없음. POS 영수증에는 Queue #N 인쇄(M2-1123-E 기준). (추정: storeport 레포 영수증 컴포넌트 미열람)

**고칠 파일** (표 완성 목적):
- storeport 레포 영수증 컴포넌트 — Queue #N 추가 여부 결정 필요 — **S~M**
- `components/receipt/ReceiptCard.tsx` — 현재 Queue #N 인쇄 여부 확인 (추정 포함)

---

## D3 · 영수증 스크롤 재발

**현재 패치 위치** (`components/payment/SuccessReceiptAnim.tsx:132-133`, 코드 확인)
```tsx
<ScrollView
  style={{ flex: 1, minHeight: 0 }}   // ← M0-1123-E 패치
  contentContainerStyle={{ flexGrow: 1 }}
```
부모 체인: `Layout`(flex-1) → `success/[orderId].tsx:295` `<View flex-1 minHeight:0>` → `SuccessReceiptAnim:124` `<View flex-1 minHeight:0>` → 위 ScrollView.

**결제 종류별 별도 화면 없음** (코드 확인): 모든 tender(cash/card/qris/split)가 동일 `checkout/success/[orderId].tsx` → `SuccessReceiptAnim`으로 수렴. tender별 별도 레이아웃 없음.

**왜 자꾸 재발하는지** (코드 추정 + git log 확인):
1. **이전 fix 이력**: git log에 `M0-1123-E`(2026-11-23) 외에도 scroll 관련 커밋 다수. M3-1119-F는 QRIS 화면 scroll 별도 fix. `minHeight: 0` 패치가 반복적으로 필요한 이유 = RN-web의 nested flex에서 ScrollView가 `height: auto` 로 계산되어 화면 밖까지 늘어남. 기존 `className` 기반 Tailwind 는 inline style을 덮지 못하는 경우가 있어, 추후 리팩터링 시 inline style 누락 가능성.
2. **스크롤 가드 테스트 없음**: `success-receipt-scroll` testID는 있으나(`SuccessReceiptAnim.tsx:135`), e2e에서 실제 스크롤 동작(긴 영수증 → 하단 버튼 도달)을 검증하는 케이스 없음(추정 — `e2e/flows/`에 success scroll 전용 spec 미발견).
3. **결제 종류**: 나눠결제(split) + Slip 패널 열림 시 콘텐츠 높이가 추가로 늘어나는 경우 재발 가능 (추정).

**고칠 파일**:
- `components/payment/SuccessReceiptAnim.tsx` — 현재 패치 유지 확인, Slip 패널 확장 시 scroll 가드 보강 — **S**
- `e2e/flows/` — 스크롤 가드 e2e 추가 — **M**

---

## D4 · "Entering number" 반응 느림

**경로** (코드 확인, 실기 미측정):
```
손님 CD web 번호 입력
  → storeport가 서버에 POST
  → 서버 snapshot 갱신(phone_entry_open/pre_entry)
  → POS useCustomerDisplaySnapshot 폴링
       api/hooks/pos-loyalty.ts:31  refetchInterval: 10_000  ← 10초
  → POS UI 갱신(칩 색 변화 · "entering" 뱃지)
```

**POS→CD 방향**(pos_screen emit): `usePosScreen.ts:47` DEBOUNCE_MS=300ms → 거의 즉시.
**CD→POS 방향**(번호 입력 감지): 10,000ms 폴링 → 최악 10초, 평균 ~5초 지연.

**목표 0.3초 달성에 필요한 변경**:
- 옵션 A(단기): `pos-loyalty.ts:31` `refetchInterval`을 `loyalty_entry` 화면 진입 시 조건부 1~2초로 단축. POS hint/snapshot_state로 조건 가능.
- 옵션 B(근본): storeport 서버 SSE/WebSocket push → POS가 이벤트 수신 즉시 갱신. — **L**

**고칠 파일**:
- `api/hooks/pos-loyalty.ts:31` — refetchInterval 조건부 단축 — **S~M**
- storeport 서버 — SSE 추가(근본 fix) — **L**

---

## D5 · Pay → 손님 화면 번호 입력 사라짐

**원인** (`app/checkout/[draftOrderId].tsx:76-83`, 코드 확인)
```tsx
React.useEffect(() => {
  if (!draftOrderId || !sessionId) return;
  setPosScreenHint({ pos_screen: 'loyalty_entry', freezeCart: true });  // 마운트
  return () => {
    setPosScreenHint({ pos_screen: 'cart_review' });  // ← Pay 클릭 시 unmount
  };
}, [draftOrderId, openSession.data?.id]);
```

**흐름**:
1. 체크아웃 마운트 → CD `loyalty_entry`(번호 입력 화면)
2. Pay 클릭 → `tender-cash/[draftOrderId].tsx`로 navigate
3. 체크아웃 unmount effect cleanup → `cart_review` emit → CD가 카트 화면으로 복귀
4. tender 화면 마운트 후에야 `payment_cash` hint 세팅

cleanup이 `cart_review`를 세팅하는 것이 문제. tender 전환 시에는 `null`(hint 해제 → autoEmit이 카트 상태 기반 계산) 또는 직전 화면 유지가 적절.

**고칠 파일**:
- `app/checkout/[draftOrderId].tsx:82` — cleanup hint `cart_review` → `null` 또는 `checkout_review` — **S**

---

## D6 · ⓐ 영수증 렌더러 이중화 · ⓑ Busy 오판

**ⓐ 렌더러 이중화** (코드 확인):
- POS 영수증: `components/receipt/ReceiptCard.tsx` (React Native 컴포넌트)
- 손님 화면 영수증: storeport 웹앱 `MEROS_CD_WEB_URL/mirror` → `CdPreviewWindow`의 WebView 주입

동일 receipt snapshot 데이터를 받지만 렌더러가 완전 별개(RN vs Web). 디자인·포맷 차이 발생 필연적.

**고칠 파일**:
- storeport 레포 영수증 컴포넌트 — POS와 맞추려면 L
- `components/receipt/ReceiptCard.tsx` — POS 쪽 변경 없음

**ⓑ "Customer display is busy" 오판** (코드 확인):
원인: `lib/ask-phone-on-display.ts:29`
```tsx
const busy = input.snapshot.snapshot_state === 'active' && !input.snapshot.paid_at;
```
결제 완료 직후 success 화면 마운트 시 `setPosScreenHint({ pos_screen: 'paid' })` emit하지만(`success/[orderId].tsx:94`),
POS의 snapshot 폴링 간격 10초 → 로컬 캐시에 `paid_at: null`이 최대 10초 잔류 → `busy: true` 오판.

**고칠 파일**:
- `app/checkout/success/[orderId].tsx:94` 근방 — paid hint emit 직후 `queryClient.invalidateQueries(['customer-display-snapshot'])` 추가 — **S**
- `lib/ask-phone-on-display.ts:29` — `snapshot.pos_screen === 'paid'` 이면 busy 예외처리 가능 — **S** (보조 fix)

---

## D7 · 화면별 "손님 번호 상태" 위치 현황

| 화면 | 파일 | CD 상태 현황 |
|------|------|-------------|
| Sell/Orders/Settings 탭 | `app/(tabs)/_layout.tsx:40` | `CdStatusBadge` — 헤더 우상단 ✓ |
| Cart 시트 | `components/cart/CartSheet.tsx:51` | `header`에 `OrderChips`만. CD 상태 없음 |
| Checkout | `app/checkout/[draftOrderId].tsx:289` | `CustomerDisplayStatus` — 본문 내 배너형 ✓ |
| Cash/Card/QRIS (tender-cash) | `app/checkout/tender-cash/[draftOrderId].tsx` | 없음 |
| QRIS (tender-qris) | `app/checkout/tender-qris/[draftOrderId].tsx` | 없음 (추정) |
| Split | `app/checkout/split-tender/[draftOrderId].tsx` | 없음 |
| Payment successful | `app/checkout/success/[orderId].tsx` | Stack.Screen title만(`Order #N`). CD 상태 배지 없음. 본문에 loyalty 카드만 있음 |

현재 두 종류 컴포넌트가 혼재:
- `CdStatusBadge` — 아이콘형 토글 버튼 (탭 헤더 전용)
- `CustomerDisplayStatus` — 배너형 상태 표시 (checkout 본문)

tender 화면들은 `Stack.Screen` 헤더만 있고 headerRight 미설정.

**추가 필요 파일** (각 화면에 넣어야 할 것):
- `app/checkout/tender-cash/[draftOrderId].tsx` — headerRight CdStatusBadge 또는 본문 — **S**
- `app/checkout/tender-qris/[draftOrderId].tsx` — 동일 — **S**
- `app/checkout/split-tender/[draftOrderId].tsx` — 동일 — **S**
- `app/checkout/success/[orderId].tsx` — Stack.Screen headerRight 추가 — **S**
- `components/cart/CartSheet.tsx` — header 슬롯에 CD 상태 추가 — **S**

---

## 구현 라운드 분할 제안

파일 겹침 최소화 기준으로 2~4개 묶음 제안.

| 묶음 | 항목 | 주요 파일 |
|------|------|-----------|
| **R1** (로컬 카운터 fix) | D1 | `api/hooks/draft-orders.tsx`, `api/hooks/register-session.ts` |
| **R2** (CD 상태 연동 fix) | D5, D6ⓑ | `app/checkout/[draftOrderId].tsx`, `app/checkout/success/[orderId].tsx`, `lib/ask-phone-on-display.ts` |
| **R3** (CD 상태 배지 확산) | D7 | `app/checkout/tender-cash/`, `tender-qris/`, `split-tender/`, `success/[orderId].tsx`, `CartSheet.tsx` |
| **R4** (폴링 단축 · 스크롤 가드) | D3, D4 | `api/hooks/pos-loyalty.ts`, `components/payment/SuccessReceiptAnim.tsx`, `e2e/flows/` |

D2(표 완성)·D6ⓐ(storeport 렌더러)는 storeport 레포 작업 — 별도 발부.
