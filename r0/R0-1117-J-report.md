라운드 3개(서버 1 · POS 2) · 신규 서버 API 1개 · Kyu 질문 2개

## 대사표 요약

### 1. 현재 두 흐름

**흐름 A (Cart/Draft)**: `cart.tsx:212` CustomerBadge → `customer-lookup.tsx:256` → `useUpdateDraftOrderCustomer` → `draft-orders.tsx:606-616` `beginEdit/update({customer_id,email})/confirmEdit` (Medusa SDK). Unlink = 기본 고객 reset. 포인트 없음.

**흐름 B (Completed Order)**: `POST /admin/pos/orders/:id/customer { phone, consent? }` → server normalizePhone → customer upsert → order.customer_id → earnForOrder 즉시 적립. 현재 success 화면(`app/checkout/success/[orderId].tsx`)에 Link UI 없음. Unlink/Change 엔드포인트 없음.

**차이**: Draft는 customer_id+email via Medusa SDK · Completed는 phone via custom POS API · 포인트 적립 타이밍 상이 · Draft만 Unlink 있음.

---

### 2. 통합 화면 설계 (`CustomerLinkSheet`)

- Props: `mode: 'draft' | 'order'` + 각 ID
- 숫자 패드 → 입력 즉시 `(+62) 813-xxxx-xxxx` 표시 (0813/62813/620813 모두 수용)
- 디바운스 300ms → `GET /admin/pos/customers/search` → 기존 고객 카드(이름·마스킹 번호·포인트·동의) or "새 손님" (#173 번호만 생성 활용)
- 동의 체크박스: `customer.loyalty_consent !== true` 일 때만 표시 (M3-1117-F 연동)
- [Link] 후 "Customer Linked" 상태: [Change][Unlink][Done]
  - Done 전: 자유 (창 open)
  - Done 후(Orders): Manager PIN → `components/orders/ManagerPinSheet.tsx` 기존 컴포넌트 활용

---

### 3. 변경/취소 서버 요구

| 엔드포인트 | 메서드 | 상태 |
|-----------|--------|------|
| `/admin/pos/orders/:id/customer` | POST | ✅ 기존 |
| `/admin/pos/customers` | POST | ✅ 기존 (M0-1117-A) |
| `/admin/pos/customers/search` | GET | ✅ 기존 (M0-1117-A) |
| `/admin/pos/orders/:id/customer` | **DELETE** | ❌ 신규 |
| `/admin/pos/orders/:id/customer` | **PATCH** | ❌ 신규 |

**DELETE**: `{ manager_pin? }` → `recoverForOrder` 전액 → `order.customer_id = null`  
**PATCH**: `{ phone, consent?, manager_pin? }` → recover 기존 → earn 신규 → customer 교체  
**감사**: `order.metadata.customer_link_history[]`  
**포인트 모자라면**: uncollected 기록 후 계속 (차단 안 함) — Q1 확인 필요

---

### 4. 작업 분할

| 라운드 | 역할 | 주요 파일 | 시간 |
|--------|------|----------|------|
| M0-J1 | 서버: DELETE/PATCH + 포인트 회수 | `src/api/admin/pos/orders/[id]/customer/route.ts`, `src/lib/link-customer-order.ts` | ~35분 |
| M3-J1 | POS: CustomerLinkSheet 컴포넌트 | `components/payment/CustomerLinkSheet.tsx`, `api/hooks/customers.ts`, `api/hooks/pos-orders.ts` | ~40분 |
| M3-J2 | POS: Cart + Success + Orders 통합 | `app/(tabs)/cart.tsx`, `app/checkout/success/[orderId].tsx`, `app/orders/[orderId].tsx`, `app/customer-lookup.tsx` | ~40분 |

**파일 겹침 주의**:
- M3-J1 ↔ M3-1117-F: 동의 체크박스 로직 (`api/hooks/customers.ts`, consent 처리) → M3-1117-F 먼저 머지 or M3-J1에서 통합
- M3-J1 ↔ #173: `POST /admin/pos/customers` 호출 패턴 (서버가 마스킹 번호 이름 처리하므로 POS 충돌 없음)
- M3-J2 ↔ 현재 PR-62 충돌 파일: `app/(tabs)/cart.tsx`, `app/orders/[orderId].tsx` (현재 UU 상태 — merge 먼저)

---

## Kyu 질문

### Q1: 포인트 이미 사용 후 Unlink 시 처리

고객이 주문 500포인트 적립 → 다른 구매에 300포인트 사용 → 이 주문 Unlink 요청. 잔액 200포인트만 회수 가능.

**권장안**: 200포인트만 회수 + 나머지 300 uncollected 기록 → 그냥 계속 진행. 운영 리포트에만 표시.

### Q2: Done 전 [Change] 시 포인트 자동 되돌림→재적립 여부

고객 A 연결 → 500포인트 적립 → Done 전 [Change] → 고객 B 입력.

**권장안**: 고객 A 500포인트 자동 회수 + 고객 B 새로 적립 (PATCH 한 번에 처리).  
(대안: 회수만 하고 재적립은 별도 단계 — UX 복잡해짐)
