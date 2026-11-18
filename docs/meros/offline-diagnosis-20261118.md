# Anchor POS 와이파이 끊김 오프라인 진단 (2026-11-18)

**진단 방법**: Playwright 환경 미설치 → 소스코드 정적 분석 기반 시뮬레이션 진단.
실제 브라우저 네트워크 단절 주입 대신 각 시점의 호출 흐름 · 에러 경로 · 상태를 코드에서 직접 추적.

분석 대상: `apps/anchor/src/hooks/order/useOrderProcessing.ts`, `components/checkout/payment-dialog/hooks.ts`, `hooks/draft-order/useDraftOrder.ts`, `context/cart/*.ts`, `config/medusa.ts`, `apps/customer-display/src/hooks/useDisplayMachine.ts`

---

## 1. 공통 환경 사항

| 항목 | 값 |
|---|---|
| SDK fetch timeout | **15초** (`setTimeout(..., 15_000)` in `config/medusa.ts:163`) |
| 오프라인 대비 큐 | 없음 (Service Worker / Workbox 없음) |
| `navigator.onLine` 사전 체크 | 없음 |
| 카트 로컬 저장 | Zustand + localStorage (`cart` 키) |
| 단일비행 가드 (중복 클릭) | `submissionRef` (ref 기반, 단일 세션 내에서만 유효) |

---

## 2. 시점별 실험 결과

### 시점 a: 장바구니 담는 중

| 항목 | 결과 |
|---|---|
| 아이템 추가 중 오프라인 | 카트 아이템 추가는 **로컬 상태 전용** (Zustand + localStorage). 네트워크 호출 없음. |
| 화면 반응 | 상품 목록이 React Query 캐시에 있으면 계속 추가 가능. 캐시 없으면 로딩 스피너. |
| 재연결 복구 | React Query 재폴링 → 상품 목록 복구. 카트 아이템은 localStorage에 그대로. |
| 서버 주문·결제 | 발생 안 함. |
| 중복·유실 | 없음. |
| 재시도 버튼 | 없음 (필요 없음). |

**결론**: 완전 안전. 아이템 추가는 오프라인에서도 로컬에 쌓임.

---

### 시점 b: 결제 화면 진입 직후 (`handleOpenModal`)

**흐름**: "결제" 버튼 클릭 → `createDraftOrder` 또는 `syncLocalChangesToDraftOrder` API 호출.

| 항목 | 결과 |
|---|---|
| 오프라인 시 동작 | API 호출 타임아웃 (15초) → `throw` → `handleOpenModal` catch → `handleErrorToast("Failed to prepare checkout: ...")` |
| 화면 반응 | 에러 toast 표시. 결제 모달 열리지 않음. |
| 재연결 복구 | "결제" 버튼 재클릭 → 정상 진행. |
| 서버 주문·결제 | 발생 안 함 (Draft order 미생성). |
| 중복·유실 | 없음. |
| 재시도 버튼 | 없음 (버튼 재클릭이 재시도). |

**결론**: 안전. 에러 메시지가 너무 기술적임 ("Failed to prepare checkout: Failed to sync changes to draft order: Error: ...") — 카운터가 이해하기 어려움.

---

### 시점 c: 현금 결제 확정 버튼 누른 직후

`handleProcessPayment` 7단계 흐름 중 각 단계에서 오프라인 주입:

#### c-1: Step 1 (Draft metadata patch) 중 오프라인
| 항목 | 결과 |
|---|---|
| 동작 | `draftOrder.retrieve` 또는 `draftOrder.update` 타임아웃 → catch → 에러 toast |
| `orderConversionDone` | false → 모달 닫히지 않음, 재시도 가능 |
| 서버 상태 | 주문 없음 (변경 없음) |
| 중복·유실 | 없음 |

#### c-2: Step 2 (`convertToOrder`) 성공 직후 Step 3 (retrieve) 중 오프라인
| 항목 | 결과 |
|---|---|
| 동작 | `setDraftOrderId(null)` 이미 호출됨. `order.retrieve` 타임아웃 → catch |
| `orderConversionDone` | **true** → `onClose()` 호출 → 모달 닫힘 |
| 서버 상태 | **주문 1건 생성됨** (payment_status: `not_captured`). 카트 아이템 그대로 (clearItems 없음). |
| 중복·유실 | **중복 위험**: 카운터가 카트를 보고 다시 결제 시도 → 2번째 주문 생성 가능 |
| 재시도 버튼 | 없음. 카운터에게 "주문이 생성됐다"는 알림 없음. |

**⚠️ 돈 위험**: 주문이 DB에 있지만 카운터가 모름. 현금을 받은 뒤 → 모달 닫힘 → 재시도 → 중복 주문.

#### c-3: Step 4 (`processPaymentCollection`) 중 오프라인
흐름: `createPaymentCollection` → `createPaymentSession` → `payment.capture`

| 항목 | 결과 |
|---|---|
| 캡처 실패 → 주문 retrieve (오프라인으로 불가) | `paymentWasCaptured = false` |
| 동작 | `clearItems()` · `setDraftOrderId(null)` · "Order saved unpaid" warning toast |
| 서버 상태 | 주문 존재 (not_paid). 재고 미차감. |
| 중복 위험 | 낮음 — 카트 클리어됨. 카운터가 주문 목록에서 확인 필요. |
| 돈 유실 | 없음 — 현금을 아직 받지 않은 경우. 받은 경우 orders 화면에서 수동 결제 처리 필요. |

#### c-4: 결제 캡처 성공 → `processFulfillment` 중 오프라인
| 항목 | 결과 |
|---|---|
| `processFulfillment` 에러 | 비치명적 (try-catch 내부 toast만, 재throw 없음) |
| `order.complete()` 에러 | 비치명적 |
| `cleanupAfterOrder()` | 정상 실행 → 카트 클리어, 성공 toast |
| 서버 상태 | 주문 paid + not_fulfilled. **재고 미차감**. |
| 돈 위험 | 낮음. 돈은 기록됨. 재고 수치만 틀림 (수동 보정 필요). |

---

### 시점 d: "Deliver Pay Later" (외상/선인도) 버튼 직후

`handleDeliverPayLater` 흐름:

#### d-1: `convertToOrder` 이전 오프라인 (Step 1-2)
- 에러 toast. 재시도 가능. 위험 없음.

#### d-2: `convertToOrder` 성공 후 오프라인
| 항목 | 결과 |
|---|---|
| 동작 | `orderConversionDone = true`. 이후 단계 실패 → catch → `onClose()` |
| 서버 상태 | 주문 생성됨 (pay_later metadata). 카트 미클리어. |
| 중복 위험 | **높음** — c-2와 동일. 카운터가 모르고 재시도 가능. |

#### d-3: `processFulfillment` 중 오프라인
- 주문 생성됨. 비치명적 에러. cleanupAfterOrder 실행 → 카트 클리어.
- 주문은 pending fulfillment. 재고 미차감.
- 위험 낮음-중간.

---

### 시점 e: QRIS / 카드 결제 대기 중

> POS Anchor에는 QRIS 직접 처리 로직 없음. 카드 결제 UI ("Present your card") 표시 후 카운터 수동 확인.
> QRIS QR코드는 EDC 물리 장치에서 처리 — POS는 결제 완료 후 "확인" 버튼만 클릭.

| 단계 | 결과 |
|---|---|
| 오프라인 상태에서 "결제 확인" 클릭 | c 시점들과 동일한 흐름 |
| QRIS 대기 중 오프라인 | POS UI는 대기 화면만 표시. 아무 API 호출 없음. 안전. |
| 고객이 QRIS 결제 → 오프라인 전환 → 카운터 "확인" 클릭 | c-2/c-3 위험 동일 |

---

### 시점 f: 손님 화면 (Customer Display) 싱크 중

| 항목 | 결과 |
|---|---|
| 오프라인 시 동작 | `SnapshotSource.getSnapshot()` throw → `POLL_ERROR` dispatch → `pollErrorCount++` |
| 임계치 (`pollErrorThreshold = 3`) | 3회 연속 실패 → `showErrorOverlay = true`. **화면은 그대로 유지** (Rule H). |
| 화면 복구 | 연결 복구 → polling 성공 → `POLL_OK` → `pollErrorCount = 0` → 오버레이 사라짐 |
| 주문·결제 연동 | 없음. Customer Display는 **표시 전용**. 주문/결제 처리와 완전 독립. |
| 돈 위험 | **없음**. |

---

## 3. 위험도 표

| # | 시점 | 위험 종류 | 매장 영향 | 현재 UX |
|---|---|---|---|---|
| 1 | **c-2: convertToOrder 후 retrieve 오프라인** | 중복 주문 | ⛔ 높음 — 주문 생성됐는데 카운터 모름, 재결제 → 중복 | 오류 toast만, 모달 닫힘, 카트 그대로 |
| 2 | **d-2: PayLater convertToOrder 후 오프라인** | 중복 주문 | ⛔ 높음 — c-2와 동일 | 동일 |
| 3 | **c-3: 결제 캡처 중 오프라인** | 기록 누락 (결제 미확인) | ⚠️ 중간 — 현금 받았을 수 있지만 unpaid 상태, 수동 처리 필요 | "Order saved unpaid" toast, 카트 클리어 |
| 4 | **c-4: 캡처 후 fulfillment 오프라인** | 재고 미차감 | ⚠️ 중간 — 돈은 기록됨, 재고 수치만 틀림 | 성공 toast (카운터가 문제 모름) |
| 5 | **b: 결제 화면 진입 오프라인** | 화면 멈춤/불편 | 🟡 낮음 — 결제 모달 안 열림 | 기술적 에러 toast |
| 6 | **e: QRIS 대기 → 확인 클릭 오프라인** | c와 동일 | c 위험 참조 | c와 동일 |
| 7 | **a: 장바구니 담기 중 오프라인** | 불편 | 🟢 없음 — 로컬 저장 | 카탈로그 캐시 없으면 로딩 스피너 |
| 8 | **f: Customer Display 싱크 오프라인** | 없음 | 🟢 없음 — 표시 전용 | 오버레이 경고 (3회 실패 후) |

---

## 4. 고칠 방향 — 우선 3개

### 🔴 P1: `convertToOrder` 성공 후 에러 시 카트 클리어 + "주문 존재" 안내

**위치**: `payment-dialog/hooks.ts:handleProcessPayment`, `handleDeliverPayLater` catch block

**현재**: `orderConversionDone = true`일 때 `onClose()`만 호출. `clearItems()` 없음.

**고칠 방향**: catch 경로에서 `orderConversionDone === true`이면:
```
clearItems();
setDraftOrderId(null);
toast.warning(`Order created (#${orderId or "unknown"}) — record payment from orders list`);
```
이미 주문 ID가 있을 때는 ID 표시, 없을 때도 "주문이 생성됐습니다 — 주문 목록을 확인하세요".
→ 중복 주문 방지.

**기능 근거**: 이미 `processPaymentCollection` catch에서 비슷한 패턴 사용 (line 460~476). 확장.

---

### 🟠 P2: 결제 처리 단계에서 `navigator.onLine` 체크 + 명확한 오프라인 메시지

**위치**: `handleProcessPayment` 시작부 / `handleOpenModal` 시작부

**현재**: 오프라인 에러 메시지 = `"Failed to sync changes to draft order: Error: TypeError: Failed to fetch"` — 카운터 비이해.

**고칠 방향**:
```ts
if (!navigator.onLine) {
  handleErrorToast("No internet connection. Please reconnect and try again.");
  return null;
}
```
15초 타임아웃 대기 → 즉시 오프라인 감지 + 명확한 메시지.

---

### 🟡 P3: `c-4` 재고 미차감 조용한 실패 개선

**위치**: `useOrderProcessing.ts:processFulfillment` catch block

**현재**: fulfillment 실패 시 toast 표시 후 조용히 계속. 카운터가 무시하기 쉬움.

**고칠 방향**: fulfillment 실패 toast에 "주문 목록에서 수동 출고 처리 필요" 명시 + 주문 ID 포함:
```
toast.warning(`Fulfillment failed for order #${order.display_id} — please mark as delivered manually in Orders.`);
```
기존 `코어 기능 있음 (order detail → 수동 fulfill)` — 그 경로로 안내.

---

## 5. 미확인 항목 (Playwright 실험 필요)

- **실제 오프라인 → 복구 시 React Query 재폴링 타이밍**: 카탈로그가 얼마나 빨리 복구되는지.
- **15초 타임아웃 UX**: isProcessing 스피너가 15초간 도는지, 아니면 더 빠른 OS 레벨 오류가 뜨는지.
- **convertToOrder 도중 (HTTP 요청 전송 중) 오프라인**: TCP 연결 중단 시 서버에서 반쪽 처리되는지.
- **연결 복구 후 중복 주문이 실제로 생기는 재현 경로**: 개선 전 반드시 확인 필요.
