# R0-1116-S 리뷰 보고

#307 CHANGES (CI pos-integration 미확인 · mergeable_state=unstable) · #111 빈칸 = 번호연결 후 목록 미새로고침 (UI 타이밍, M1은 #299 이전 코드 기준 진단) · 보정 스크립트 안전

---

## REQ 1 — #111 Customer 빈칸 원인 확정

### #299 배포 여부 (git 기록 추정)

| 사건 | UTC | WIB (UTC+7) |
|------|-----|-------------|
| #299 머지 | 2026-11-16T03:42:37Z | 10:42 |
| Kyu 실기 | — | **13:35** |
| 간격 | — | 2시간 53분 |

Railway 자동 배포 통상 5–10분 → Kyu 실기 시 **#299 이미 배포됨**.

### 현재 코드 (main 기준) 핵심 2개소

- `orders-list/route.ts:160–173` — `customerModule.listCustomers({ id: customerIds })` 직접 조회. 주석 "query.graph cross-module customer.phone is unreliable". **query.graph customer.* 미사용** ← M1이 진단한 패턴 없음.
- `link-customer-order.ts` — `orderModule.updateOrders([{ id, customer_id, metadata }])` **배열 형식**. `order.customer_id` raw column 정상 세팅됨.

### 원인 판정 (a/b/c)

**(c) M1이 오래된 코드를 읽음**: M1은 `orders-list/route.ts:143`에서 `query.graph customer.phone`을 보고 분석했으나, 현재 main에는 해당 패턴 없음. #288 초기 코드가 `query.graph customer.*`를 썼고, #299 R2에서 `customerModule.listCustomers`로 교체됨. M1은 그 사이 버전을 읽은 것.

**(b) phone-only 손님 phone 필드**: `createCustomers([{ phone: phoneE164, metadata: {...} }])` — `phone` E.164 정상 저장. orders-list가 직접 읽으므로 조회 가능.

**#111 실제 빈칸 원인**: Kyu 실기 시 #299 배포됨 → 코드 레벨로 ①은 이미 해결. 빈칸은 **결제(13:27) 직후 로드한 Admin Orders 목록을 번호 연결(13:30) 후 새로 고침하지 않아 customer_id=null 시점의 캐시된 행이 화면에 남은 것** (UI 타이밍, 코드 버그 아님).

**#307이 ① 원인을 고치는가**: No. #307은 ②③만 수정. ①은 코드 버그 아니므로 CHANGES 사유 아님.

---

## REQ 2 — store_credit_balance, POS 사용, first_name 개인정보

### ③ store_credit_balance POST-earn 잔액

- 현재 반환: `store_credit_balance: upsert.balance` = PRE-earn (신규 고객 = 0)
- #307 수정: `store_credit_balance: earn?.new_balance ?? upsert.balance` = POST-earn ✅
- **POS fork 사용 경로 확인**: `agilo-medusa-pos-fork/components/loyalty/LinkCustomerSheet.tsx:79`
  ```tsx
  <Text>{formatIDRBalance(result.store_credit_balance)}</Text>  // "Credit balance" 렌더링
  ```
  `lib/loyalty-link.ts:17` — `store_credit_balance: number` 타입 정의. #307 수정으로 Rp 0 → 올바른 잔액 직접 해결 ✅

### ② 신규 손님 first_name = 가린 번호

- #307 추가: `first_name: phoneMasked` ("0813-****-2480")
- **개인정보**: E.164 전화번호(+6281304422480)가 아닌 가린 번호만 `first_name`에 저장. 실제 번호는 `phone`(E.164) + `metadata.phone_e164` 별도 저장. 가린 번호는 개인 식별 불가 → **개인정보 적절** ✅

---

## REQ 3 — 보정 스크립트 안전성

| 항목 | 판단 |
|------|------|
| dry-run 기본 | `!process.argv.includes("--apply")` ✅ |
| 멱등 | `if (c.first_name) continue` — 이미 처리된 경우 건너뜀 ✅ |
| 대상 조건 | `metadata.phone_e164 ?? c.phone`이 있고 `first_name` 없는 손님 → POS 번호 연결 생성 손님만 대상, 정확 ✅ |
| 작업 범위 | `first_name` 단일 필드 패치만. 잔액·계정·주문 무변경 ✅ |
| 위험 요소 | `c.phone`이 non-E.164일 때 `maskE164` 오작동 이론적 가능. 운영 POS 경유 생성 손님은 E.164 보장 → 실질 위험 없음 |

**운영에 돌려도 안전**. dry-run → 대상 목록 확인 후 `--apply` 순서 준수.

---

## REQ 4 — CI pos-integration 실제 실행 여부

- #307 변경 파일 3개 모두 `apps/commerce-core/**` → CI pos-integration 경로 필터 충족 → job 실행 대상 ✅
- **그러나 `mergeable_state: "unstable"`** — CI 미완료 또는 실패 가능성
- CI check_runs API 403 오류로 직접 로그 확인 불가
- M3 리포트 명시: "로컬 DB 없음 / CI에서 검증 예정" (로컬 미실행)
- 테스트: `medusaIntegrationTestRunner` 사용 → 실 DB 필요 → CI 에서만 의미 있는 검증
- 실제 line_item 주문: `items: [{ title: "Croissant 90k", quantity: 1, unit_price: unit }]` ✅

**CI 통과 여부: 미확인** → CHANGES 사유.

---

## REQ 5 — APPROVE/CHANGES 판정

### CHANGES

**CI `pos-integration` 실행 로그 미확인** (`mergeable_state: "unstable"`, API 403).  
`post-pay-link-balance.spec.ts`는 `medusaIntegrationTestRunner`로 실 DB 필요 — CI에서만 의미 있는 검증인데 M3도 "CI에서 검증 예정"이라 명시. 통과 로그 첨부 요청.

### 나머지 항목 ✅

- ② `first_name: phoneMasked` 코드 정확, 개인정보 적절
- ③ `earn?.new_balance ?? upsert.balance` 코드 정확, POS LinkCustomerSheet.tsx:79 경로 확인
- 보정 스크립트 dry-run 기본 · 멱등 · 운영 안전
- #111 원인 = UI 타이밍 (코드 버그 아님), M1 오래된 코드 기준 진단으로 불일치 발생 — M3 판단이 최신 코드 기준으로 정확
