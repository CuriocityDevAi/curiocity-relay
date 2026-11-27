# R0-1127-Q 진단 리포트

진단 6건: A3 원인=lifecycle.ts:85-87 server stalePaid + index.tsx:338 client inActiveFlow 미포함 · B-re=service.ts:924 phone_already_linked 체크 · B=LeftPaymentPanel.tsx:208 mount시 항상 슬라이드 · A2=PhoneFlowScreen.tsx:61 spring 너무 빠름 · obs1=CustomerPhoneStatus.tsx #276 도입(정확한 줄 런타임 추적 필요) · C=CD/POS영수증/프린터는 R2·M0-1127-M 커버, POS UI 화면은 미커버

---

## 1. A3 — Correct → Welcome (적립 완료 대신 초기화면)

### 근원 (2-레이어)

**레이어 1 (서버, 주요):**
`storeport/apps/commerce-core/src/modules/register_session/lifecycle.ts:71-90`

```typescript
export function isPostSettlementStale(...): boolean {
  if (snapshot.snapshot_state !== "paid") return false;
  ...
  if (age < staleMs) return false;
  if (isPhoneEntryOpen(snapshot, now)) return false;
  const settled =
    Boolean(snapshot.skipped_at) ||
    Boolean(snapshot.customer_phone) ||  // ← A3 버그 핵심
    Boolean(snapshot.phone_deferred);
  return settled;
}
```

Correct 클릭 → `customer_phone` 세팅됨 + `paid_age > 30s` → `isPostSettlementStale = true` → 서버가 CD active snapshot 에서 제외 → CD 는 `snapshot: null` 수신 → `MainScreen` (Welcome) 표시.

**레이어 2 (클라이언트, 보조):**
`kyu-display/apps/customer-display/app/index.tsx:338-340`

```typescript
const inActiveFlow =
  flowState === "entering" ||
  flowState === "first_visit" ||
  flowState === "confirming";
// ← "confirmed" 미포함
```

서버 fix 없이 클라이언트만 고쳐도 snapshot=null 단계에서 flowState 를 볼 수 없어 불완전.

### #474 가 왜 못 막았는지

PR #466 (storeport#474 M0-1126-R) 은 CD **클라이언트** `index.tsx` 의 `inActiveFlow` 가드만 추가했고, **서버** `lifecycle.ts:85-87` 의 `customer_phone` settled 판정은 그대로 남음. 서버가 먼저 snapshot 을 제거하므로 클라이언트 가드는 `snapshot: null` 상태에서 무력화.

### fork#287 / R0-1127-O e2e

- **fork#287** (`e2e/cd-pos/case1b-existing-customer.spec.ts`) — 기존 번호 → OK → Confirm 경로를 직접 밟음. 현재 **RED** (버그 증명). R0-1127-G 수정 후 초록 예정.
- **R0-1127-O** — case1b (#287 브랜치) dispatch 완료. 이 경로를 실기 서버에서 검증 중(결과는 Kyu 직접 확인).

### 권장 수정

| 허브 | 파일:줄 | 변경 |
|------|--------|------|
| storeport | `lifecycle.ts:84` | `if (snapshot.customer_flow_state === 'confirmed') return false;` 추가 |
| kyu-display | `index.tsx:338` | `flowState === "confirmed"` 조건 추가 |

예상 크기: **M**

---

## 2. B-re — Re-enter → "Phone already linked" 토스트

### 거절 위치

`storeport/apps/commerce-core/src/modules/register_session/service.ts:924-931`

```typescript
if (target.customer_phone) {
  return {
    ok: true,
    eligible: false,
    reason: "phone_already_linked",
    snapshot: target,
  };
}
```

이 코드는 `POST /admin/pos/orders/:id/phone-entry` (`openPostSettlementPhoneEntry`) 경로. `confirmed` 상태가 되면 `customer_phone` 이 세팅되므로 이 경로를 타면 항상 거절.

### #463 과 어긋난 이유

#463 (A→B 변경 가능)은 **earn 로직** (어느 번호로 적립할지)을 바꾼 PR. `phone_already_linked` 거절을 발생시키는 `service.ts:924` 체크는 건드리지 않음 — 범위가 다름.

POS 칩의 "Re-enter" 버튼은 `customer-flow` API 의 `start_entry` 액션을 통하며, 이 경로는 `confirmed → entering` 전환을 허용(`transitions.ts`). 반면 `PhoneEntryButton` 이 사용하는 `openPostSettlementPhoneEntry` 경로가 `customer_phone` 체크로 차단함.

### storeport#478 (M0-1127-L) 과의 관계

M0-1127-L (미머지)는 "결제 후 Re-enter" 흐름을 `customer-flow` API 로 통일하는 작업으로 추정. 머지 후 `PhoneEntryButton` 이 `openPostSettlementPhoneEntry` 대신 `start_entry` 를 사용하면 이 버그 해소 가능.

### 권장 수정

| 허브 | 파일:줄 | 변경 |
|------|--------|------|
| storeport | `service.ts:924` | `customer_flow_state === 'confirmed'` 일 때 `phone_already_linked` 체크 건너뜀 |
| pos-r0 (fork) | `PhoneEntryButton.tsx` → storeport#478 머지 대기 | Re-enter → `start_entry` 경로로 전환 |

예상 크기: **S** (서버 1줄 fix) / M0-1127-L 머지로 해결 가능

---

## 3. B — Ask again 때 영수증 슬라이드 애니메이션 재생

### 트리거 위치

`kyu-display/apps/customer-display/src/components/cd-sync/LeftPaymentPanel.tsx:207-213`

```tsx
const slideProgress = useRef(new Animated.Value(0)).current;
useEffect(() => {
  Animated.timing(slideProgress, {
    toValue: 1,
    duration: 2400,
    useNativeDriver: true,
  }).start();
}, [slideProgress]);
```

`ReceiptMiniPanel` 이 마운트될 때마다 항상 2400ms 슬라이드 실행.

### 원인: 마운트 재생성

A3 버그로 인해 `stalePaid → MainScreen` 전환 후 Ask again 클릭 → `PhoneFlowScreen` 신규 마운트 → `LeftPaymentPanel` 신규 마운트 → `ReceiptMiniPanel` 신규 마운트 → 슬라이드 애니메이션 재생. 상태 리셋이 아니라 **컴포넌트 마운트 재생성** 이 원인.

A3 fix 이후에도, Ask again 이 `confirmed → entering` 전환을 하면 `PhoneFlowScreen` 이 unmount/remount 될 경우 여전히 재생될 수 있음.

### 권장 수정

| 허브 | 파일:줄 | 변경 |
|------|--------|------|
| kyu-display | `LeftPaymentPanel.tsx:207` | 첫 마운트만 실행하도록 `hasAnimated` ref 가드 추가, 또는 항상 나와있는 상태(translateY=0)로 초기화 |

예상 크기: **S**

---

## 4. A2 — 키패드 등장 애니메이션 (×1.4 느리게 미구현)

### 실제 값

`kyu-display/apps/customer-display/src/screens/PhoneFlowScreen.tsx:61-66`

```tsx
Animated.spring(rightSlide, {
  toValue: 0,
  friction: 8,
  tension: 100,
  useNativeDriver: true,
}).start();
```

`spring(friction:8, tension:100)` → 빠른 입장. Kyu 체감 "더 빨라짐".

### 명세 값

`specs/screens/customer-display.md` CD-KEYPAD 행:
> "오른쪽에서 밀려 나오는 속도 = 지금보다 40% 느리게(Kyu 11-27 13:01) → 애니메이션 시간 ×1.4 · **구현 대기**"

### 권장 수정

| 허브 | 파일:줄 | 변경 |
|------|--------|------|
| kyu-display | `PhoneFlowScreen.tsx:61` | spring → `Animated.timing(duration: ~420ms, easing: Easing.out(Easing.quad))` 또는 spring 파라미터 늦춤(friction:12, tension:60 수준) |

예상 크기: **S**

---

## 5. obs1 — POS 매 화면 빨간 토스트 "Unexpected text node: ."

### 출처 컴포넌트 (최선 추정)

`agilo-medusa-pos-fork/components/customer-display/CustomerPhoneStatus.tsx`

에러 메시지: "Unexpected text node: . A text node cannot be a child of a `<View>`"
CssInteropComponent = NativeWind `cssInterop` 래퍼 (iconWithClassName 로 Lucide 아이콘에 적용됨)

CustomerPhoneStatus.tsx 는 PR #276 (6eb28bd, Nov 26 21:24) 에서 모든 checkout 화면 헤더(5곳) + CartSheet 에 추가됨 → 매 화면에 나타나는 이유 설명됨.

v1.3 fallback 경로(snapshot 없거나 customer_flow 없는 경우)의 `numLabel · ` 패턴 또는 Dots 컴포넌트 주변 View 컨텍스트에서 "." 텍스트 노드 발생 추정. **런타임 스택 트레이스 없이 정확한 줄 고정 불가**.

### 도입 머지

PR **#276** (6eb28bd) — CustomerPhoneStatus 전면 도입 · 6상태 ChipUI + Dots 컴포넌트 신규.
PR #290 (611251d) — LateLinkCustomerSheet 에 CustomerPhoneStatus 추가(이후).

### 권장 수정

1. iPad/Android 에서 Expo Dev Console Error 스택 트레이스 복사 → 정확한 파일:줄 특정
2. 해당 View 안의 텍스트 노드를 `<Text>` 로 감싸거나 JSX 조건식 수정
3. 웹 개발 모드에서 경고이지만 실기기 네이티브에서는 빨간 화면 → Go-live 전 필수

예상 크기: **S** (위치 특정 후)

---

## 6. C — `Order #<display_id>` 위치 목록 및 라운드 커버리지

### 전체 위치 목록

| 위치 | 파일:줄 | 현재 표기 | 담당 라운드 |
|------|--------|---------|-----------|
| CD 영수증 | `kyu-display/.../LeftPaymentPanel.tsx` via `resolveReceiptView` | `order_display_id` | **M0-1127-M** (진행 중) |
| POS 영수증 카드 | `pos-r0/components/receipt/ReceiptCard.tsx:284` | `snap.order_display_id` | **영수증 R2/R3** |
| 프린터 영수증 | POS 프린트 템플릿 | `order_display_id` | **영수증 R2/R3** |
| POS 주문 목록 (탭) | `agilo-medusa-pos-fork/app/(tabs)/orders.tsx:449` | `order.display_id` | ⚠ 미정 |
| POS 주문 상세 | `app/orders/[orderId].tsx:494` | `order.display_id` | ⚠ 미정 |
| 결제 완료 성공화면 | `app/checkout/success/[orderId].tsx:218` | `snapshot.order_display_id` | ⚠ 미정 |
| 현금 결제 헤더 | `app/checkout/tender-cash/[draftOrderId].tsx:430` | `draftOrder.data.display_id` | ⚠ 미정 |
| 분할 결제 헤더 | `app/checkout/split-tender/[draftOrderId].tsx:633` | `draftOrder.data.display_id` | ⚠ 미정 |

### 빠진 곳

POS UI 화면 4곳(주문 목록 · 주문 상세 · 결제완료 · 현금/분할 결제 헤더)은 M0-1127-M(CD 전용) 과 영수증 R2/R3(프린터·영수증 전용) 어느 라운드에도 포함 안 됨. 별도 M0(POS UI 번호 표기 통일) 발부 필요.

참고: M3-1125-C 결정("긴 Order 번호는 영수증·주문 상세에만") 과 14:13 결정("보이는 곳 전부 #N") 간 scope 불일치 → Kyu 확인 필요.

---

## 요약

| 항목 | 주 파일:줄 | 크기 | 허브 |
|------|-----------|------|------|
| A3 | `lifecycle.ts:85-87` (서버) · `index.tsx:338` (클라) | M | storeport · kyu-display |
| B-re | `service.ts:924` | S | storeport (또는 M0-1127-L 머지) |
| B | `LeftPaymentPanel.tsx:207` | S | kyu-display |
| A2 | `PhoneFlowScreen.tsx:61` | S | kyu-display |
| obs1 | `CustomerPhoneStatus.tsx` (런타임 추적 필요) | S | pos-r0 fork |
| C | 4곳 미커버 (POS UI) | M | M0 신규 |
