---
round: M3-1105-P
pr:
  fork: agilo-medusa-pos-fork#62
commit: dbc7bae (branch feat/m3-1105-p-payment-tabs · base master b332508)
outcome: Tender 화면 상단에 Cash/Card/QRIS 결제수단 탭 복귀 (Kyu "Pay 버튼 1개는 P4 까지만"). Card 는 EDC 매뉴얼 시트 (보드 8 · bank + 승인번호 6자리 + 끝 4자리 → `pp_edc_manual_default` tender). QRIS 는 Xendit SDK 통합 (storeport J-c) 전까지 비활성 "Coming soon". Hand over 토스트를 Kyu 실기 3차 지정 문구 `Product handed over to the customer.` 로 영문화. 영수증 결제 줄은 `Card (EDC)` 라벨 (승인번호 기존 유지). 어설션 17/17 + Playwright 20/20 PASS · 금지 영역 (`api/hooks/pos-payments.ts` · `lib/printer`) 미수정.
kyu_checks: 2 (① Checkout→Pay→Card 탭 → BCA/123456/1234 → Confirm → 영수증 Card (EDC) 노출 확인 ② Hand over → 토스트 "Product handed over to the customer." 확인)
---

# M3-1105-P · tender Cash/Card/QRIS 탭 + EDC 시트 + Hand over 토스트 영문화

**일자**: 2026-11-07 · **허브**: M3 · **성격**: Kyu 실기 3차 피드백 "Hand over 토스트를 '손님에게 건넸다' 영문으로" + open-requirements §Kyu 결정 "Pay 버튼 1개는 P4 까지만" → P4 수단 탭 복귀.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | §0 서버 contract 대사 (storeport main 5742460) | ✓ |
| 2 | 새 브랜치 `feat/m3-1105-p-payment-tabs` 생성 (base master 3ff7e9e · 커밋 중 #59 머지되어 b332508 로 rebase) | ✓ |
| 3 | `PaymentMethodTabs` 신규 — Cash · Card · QRIS · QRIS 비활성 "Coming soon" | ✓ |
| 4 | `CardTenderPanel` 신규 — "Charge IDR X on the EDC terminal" 안내 + Bank + 승인번호(6d) + 끝4(4d) + Confirm | ✓ |
| 5 | `app/checkout/tender-cash/[draftOrderId].tsx` — 상단 탭 + Cash 기본 (회귀 0) · balance 흐름 Cash 고정 | ✓ |
| 6 | `ReceiptCard` 결제 줄 라벨 `Card (EDC)` (M3 Kyu 지정 · 승인번호 기존 유지) | ✓ |
| 7 | `app/checkout/success/[orderId].tsx` Hand over 토스트 → `Product handed over to the customer.` | ✓ |
| 8 | Fixtures (`pos-tender-card-response.json` · `pos-receipt-card-response.json`) — 서버 fixture 없어 cash 복제 + method 교체 · 임시 표기 | ✓ |
| 9 | `scripts/m3-1105-p-playwright.mjs` 신규 — 탭/Cash회귀/Card confirm/토스트 4 묶음 19 어설션 | ✓ |
| 10 | `scripts/m3-1105-p-screenshots.mjs` — 5 스샷 (탭 · EDC 시트 · 입력완료 · 영수증 · 토스트) | ✓ |
| 11 | 어설션 17/17 · Playwright 20/20 · Lint 0 errors | ✓ |
| 12 | 금지 영역 (`api/hooks/pos-payments.ts` · `lib/printer`) 미수정 | ✓ |
| 13 | CI 전 job 그린 | 진행 중 (PR #62 force-push 뒤 트리거) |

---

## §0. 대사표 — storeport main 5742460 POST /admin/pos/orders/:id/tenders

원장 "서버 계약 = storeport main 5742460" 지시에 따라 `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` + `apps/commerce-core/src/modules/payment_edc_manual/services/edc-manual-provider.ts` + `integration-tests/pos/tenders.spec.ts` 를 직접 읽음.

### 서버 body 정본

```jsonc
{
  "provider_id": "pp_cash_default" | "pp_edc_manual_default" | "pp_xendit_qris_default",  // REQUIRED (리터럴)
  "amount": number?,                       // 생략 시 서버가 order.total (preorder 면 dp_percent 반영)
  "order_type": "takeaway" | "preorder" | "delivery",
  "input": {                               // provider-specific
    // cash:
    "received_amount": number,
    // edc (pp_edc_manual_default · authorizePayment 검증):
    "bank": string,                        // REQUIRED · 비어있지 않음
    "approval_code": string,               // REQUIRED · /^[0-9]{6}$/
    "card_last4": string,                  // REQUIRED · /^[0-9]{4}$/
    "brand": string?, "rrn": string?, "tid": string?, "mid": string?, "memo": string?, "entry_mode": string?,
    // qris: issuer? · reference_no?
  },
  "register_session_id": string?,
  "cashier_user_id": string?,
  "preorder": { "pickup_at": string?, "note": string? },    // M3-1105-M 선행 · metadata.preorder 로 저장
  "is_balance": true?                                        // 잔금 수금 (앱 측 플래그 · 서버는 metadata.preorder.balance_due 로 판별)
}
```

### 서버 응답

```jsonc
{
  "ok": true,
  "order_id": string,
  "provider_id": "pp_cash_default" | "pp_edc_manual_default" | "pp_xendit_qris_default",
  "method": "cash" | "card" | "qris",      // 서버가 provider_id → method 변환 (앱이 소비)
  "amount": number,
  "order_type": "takeaway" | "preorder" | "delivery",
  "payment_collection_id": string,
  "payment_session_id": string | null,
  "payment_id": string | null,
  "receipt_id": string | null,
  "receipt_no": string | null,
  "receipt_kind": "sale" | "balance" | "refund" | "reprint",
  "converted": boolean,                    // draft → order 자동 전환 (M0-1105-P)
  "is_draft_order": boolean,
  "is_balance": boolean,
  "preorder_stage": "dp_paid" | "paid_full" | null,
  "balance_due_after": number | null
}
```

### 프롬프트 ↔ 서버 contract drift (2건)

1. **"body.method='card'"** (프롬프트) → 서버는 `provider_id` 리터럴 · `method` 는 응답 변환값. 앱은 이미 `PROVIDER_EDC_MANUAL = 'pp_edc_manual_default'` 상수 (M3-1105-D) 로 정렬됨.
2. **"승인번호(approval code · 선택) 입력"** (프롬프트) → 서버 `authorizePayment` 가 `approval_code must be exactly 6 digits` 로 400. `bank · card_last4` 도 Required.
   - **채택**: 서버 Required 를 그대로 UI 에 반영 (Kyu ledger "승인번호 6자리+끝4자리"와 일치). Confirm 버튼은 3필드 모두 정규식 통과 때만 활성.
   - 프롬프트 "선택" 은 drift 로 등재. Kyu 결정 필요시 M3 후속 라운드에서 app side 만 느슨하게 (서버는 그대로) 바꿀 수 있지만, 그러면 매번 tender 400 → 회귀 리스크 커져 현 결정을 유지.

### fixture 임시 표기

storeport integration test `#2 edc tender missing approval_code` 는 400 케이스만 다룸 → **성공 응답/영수증 fixture 가 서버에 없음**. 앱 측에서 cash fixture 를 복제 후 `provider_id`/`method`/`tenders[0]` 만 EDC shape 으로 바꿔 사용 (파일 `_source` 필드에 명시). storeport 측에서 EDC 성공 통합테스트가 추가되면 fixture 를 그 응답으로 교체.

---

## 1. 산출물

### 1-1. 신규/수정 파일

```
A  components/payment/PaymentMethodTabs.tsx    # Cash/Card/QRIS 탭 (QRIS 비활성)
A  components/payment/CardTenderPanel.tsx      # EDC 시트 (보드 8)
M  app/checkout/tender-cash/[draftOrderId].tsx # 상단 탭 추가 · Cash 기본 (회귀 0)
M  app/checkout/success/[orderId].tsx          # Hand over 토스트 영문화
M  components/receipt/ReceiptCard.tsx          # 결제 줄 라벨 'Card (EDC)' (승인번호 기존 유지)
A  fixtures/pos-tender-card-response.json      # 임시 (cash 복제 + method 교체)
A  fixtures/pos-receipt-card-response.json     # 임시 (card tender snapshot shape)
A  scripts/m3-1105-p-playwright.mjs            # 19 어설션
A  scripts/m3-1105-p-screenshots.mjs           # 5 스샷
A  screenshots-m3-1105-p/*.png                 # 01~05
```

### 1-2. 스샷 (screenshots-m3-1105-p/)

1. `01-tabs-cash-default.png` — Cash 기본 선택 (ink 배경 · surface 글자) · Card ink · QRIS ink-disabled "Coming soon"
2. `02-card-edc-sheet.png` — Card 탭 뒤 EDC 안내 + 3 입력 (비어있음 · Confirm 비활성)
3. `03-card-filled.png` — BCA / 123456 / 1234 입력 뒤 Confirm 활성
4. `04-card-receipt.png` — Confirm → 성공 화면 · 영수증 결제 줄 "Card (EDC)"
5. `05-hand-over-toast.png` — Hand over 탭 뒤 토스트 "Product handed over to the customer."

---

## 2. 검증 (로컬 · CI 와 동일)

### 2-1. 어설션 17/17 PASS
```
$ node scripts/run-all.mjs assertions
  총 17 개 · 17 PASS · 0 FAIL · 3.8s
  · m2-1105-p-...-assertions.mjs ... PASS
  · m3-1105-a-color-assertions.mjs ... PASS · 37/37
  · m3-1105-c-english-assertions.mjs ... PASS · 5/5 (한글 0건)
```

### 2-2. Playwright 20/20 PASS
```
$ node scripts/run-all.mjs playwright
  총 20 개 · 20 PASS · 0 FAIL · 415.7s
  · m3-1105-d-playwright.mjs ... PASS · 37.5s  (Cash 회귀 — Takeaway P2)
  · m3-1105-m-preorder-playwright.mjs ... PASS · 34.4s  (Pre-order DP → balance → Hand over)
  · m3-1105-n-quote-receipt-playwright.mjs ... PASS · 47.6s  (SC+PB1 quote · logo · 연타 가드)
  · m3-1105-p-playwright.mjs ... PASS · 53.3s  (19/19 신규)
```

M3-1105-P 세부 (`m3-1105-p-playwright.mjs`):
- **(A) PaymentMethodTabs 노출** 7/7 — 탭 3개 · Cash 기본 · Card 탭 노출 · QRIS sublabel="Coming soon" · Cash 패널 표시 · Card 패널 숨김
- **(B) Cash 회귀** 2/2 — Process → tenders 1회 · `provider_id=pp_cash_default · input.received_amount`
- **(C) Card 탭** 8/8 — 패널 전환 · "Charge IDR 95,000 on the EDC terminal" 문구 · Confirm 비활성/활성 토글 · `provider_id=pp_edc_manual_default` · `input.bank='BCA' · approval_code='123456' · card_last4='1234'` · /checkout/success 진입
- **(D) Hand over 토스트** 2/2 — 버튼 노출 · `/Product handed over to the customer\./` 매치

### 2-3. Lint
`0 errors · 35 pre-existing warnings` (QuantityPicker 2 warn · 외 pre-existing).

### 2-4. CI (fork · PR #62)
- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/62
- `assertions + playwright` · `lint` 워크플로 트리거 완료 — 결과는 claim state=done 직전 확인.

---

## 3. 상시 claims (규약 ⓔ)

- `status/claims/M3-1105-P.json` · state=`started` (러너 자동 · 14:14Z).
- CI green 뒤 state=`done` 으로 전환 (리포트 push 뒤).

---

## 4. 설계 포인트

### 4-1. 탭 복귀 vs cash-only 보존

Kyu 결정: "Checkout → Pay 단일 버튼 → 현금" 은 **P2 임시**, P4 부터 Cash/Card/QRIS 탭 복귀.
- Pay 단일 버튼은 Checkout 화면의 CTA 로 **유지** — 눌러서 tender 화면 진입 (라우트는 기존 `/checkout/tender-cash/[draftOrderId]` 그대로 · 회귀 0 보장).
- 탭은 tender 화면 상단에 배치 — 수단 선택 뒤 바로 입력 UI 로.
- `balance` 흐름 (preorder 잔금 수금) 은 **Cash 고정** · 탭 숨김. 승인번호 재입력 UX 혼선 방지 + 잔금 수금 현장은 보통 현금 (운영 가정).

### 4-2. EDC 매뉴얼 필드 (서버 Required)

서버 `authorizePaymentSession(session.id)` 호출 안에서 `edc-manual-provider.ts` 가 검증:
```
APPROVAL_CODE_RE = /^[0-9]{6}$/
CARD_LAST4_RE    = /^[0-9]{4}$/
bank: 빈 문자열 금지
```
3 조건 미충족 시 400 (M0-1105-F · R0-1105-H ④ 로 orphan 세션/collection 도 삭제됨). 앱은 **같은 정규식** 으로 Confirm 비활성 UX → 서버 400 왕복 0건.

### 4-3. 영수증 결제 줄 라벨

- 기존 (M3-1105-D·H): `method.toUpperCase()` → `CARD`.
- P: 매핑 테이블 `METHOD_LABEL`:
  ```ts
  { cash: 'CASH', card: 'Card (EDC)', qris: 'QRIS' }
  ```
  - cash/qris 는 대문자 보존 (회귀 0).
  - card 는 혼용 (`Card (EDC)`) — M3-1105-D 영수증 테스트가 "CARD" 문자열을 검사하지 않아 안전 (확인).
- 승인번호는 이미 `labels.approval` (snapshot 영어 전용) 기준으로 표시 (M3-1105-D) · P 변경 없음.

### 4-4. Hand over 토스트

- 수정 위치: `app/checkout/success/[orderId].tsx` (P4 결제 성공 → Hand over 흐름).
- 문구: `Product handed over to the customer.` (Kyu 지정 영문).
- **범위 밖**: `app/orders/[orderId].tsx` 의 `onHandOver` 는 여전히 `Handed over` (P3 재방문 경로). Kyu "Hand over 토스트" 3차 언급이 결제 성공 직후를 가리킴. M3 다음 라운드에서 orders/[orderId] 쪽도 통일 권장 — 아래 §M1 요청 ②.

---

## 5. M0/M1 요청 목록

### §M0 (storeport)
- **M0-a** EDC 매뉴얼 성공 통합테스트 추가 — `pp_edc_manual_default` 로 성공 응답을 내려주는 integration test (bank='BCA' · approval_code='123456' · card_last4='1234' · amount=grand_total) + 그에 따른 영수증 snapshot. 앱 측 fixture 가 이에 맞춰 교체됨. (현재 #2 는 400 만).

### §M1 (앱 다른 허브)
- **M1-a** `app/orders/[orderId].tsx` 의 `onHandOver` 토스트도 `Product handed over to the customer.` 로 통일 (현재 `Handed over`). 파일 소유권이 M3-F (P3) 쪽이라 P 라운드 범위 밖. 1줄.
- **M1-b** QRIS 탭은 현재 비활성 · Xendit SDK (storeport J-c) 통합 뒤 활성화. 앱측 PaymentMethodTabs.enabled 토글만.

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +2 (Kyu 실기 3차 Hand over 토스트 · P4 탭 복귀) |
| 등재 | +2 (M0-a · M1-a) |
| 미완 (Kyu 실기) | +2 (Card 결제 BCA/123456/1234 → Card (EDC) 노출 · Hand over 토스트 확인) |
| **총 순증감** | **0** |

---

## 7. 다음 게이트

1. **CI 그린 확인** → claim state=done 전환.
2. **Kyu 실기** — iPad 상에서 Checkout → Pay → Card 탭 → BCA/123456/1234 → Confirm → 영수증 "Card (EDC)" + "APPROVAL 123456" · Hand over → 토스트.
3. **M3 후속** — orders/[orderId] Hand over 토스트 통일 (M1-a) · Xendit 통합 뒤 QRIS 활성 (M1-b).

---

*M3-1105-P · 2026-11-07 · PR #62 · base master b332508 (#59 M2-P 머지 반영) · 어설션 17/17 + Playwright 20/20 + Lint 0 errors · 금지 영역 (api/hooks/pos-payments.ts · lib/printer) 미수정 · 이연 순증감 0*
