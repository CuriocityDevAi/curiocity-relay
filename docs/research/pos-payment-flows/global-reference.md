# 글로벌 POS 결제 단계·영수증 설계 — 베스트 프랙티스 조사 (Meros POS 적용용)

조사일 2026-11-04 · 오케 리서치 에이전트 · 범례: **[확인]** = 공식 문서/도움말에서 직접 확인 · **[추정]** = 여러 제품의 공통 패턴에서 합성한 설계 권고

## 0. 결론 요약

1. **텐더 화면 공통 패턴** — "받은 금액 입력(기본값 = 총액) → 거스름돈 표시 → 완료"가 모든 제품 공통. 분할 결제는 "남은 잔액을 다음 결제의 기본값으로" (Shopify·Lightspeed 확인). 현금 반올림은 **현금 결제에만** 적용하고 영수증에 조정 라인을 찍음 (Loyverse 확인).
2. **카드 단말 상태 머신** — Square Terminal API의 `PENDING → IN_PROGRESS → COMPLETED | CANCELED(TIMED_OUT 등) | CANCEL_REQUESTED` 5상태가 사실상 업계 표준이고, 타임아웃 기본 5분. Odoo는 통신 실패 시 **Force Done**(수동 승인) 탈출구를 둠.
3. **QRIS** — Midtrans 기준 `pending → settlement | expire | cancel | deny`, 웹훅 주 + 폴링(≥10초) 보조, 만료 기본 15분, 취소 API로 즉시 종료. "고객 앱에서는 성공으로 보여도 settlement 전엔 상품 넘기지 말 것"이 핵심.
4. **Medusa v2** — `payment_collection`(주문 1건의 결제 묶음) ⊃ `payment_session`(공급자별 시도) ⊃ `payment`(승인 후 생성). **분할 결제(split) 미지원**이 공식 입장이지만, **주문에는 payment_collection이 여러 개 붙을 수 있고** 주문 `payment_status`가 컬렉션들을 집계해 계산되므로, **텐더 1건 = payment_collection 1건** 전략으로 split tender를 구현할 수 있음(추정).
5. **영수증** — 58mm=32자, 80mm=48자(Font A) 기준으로 레이아웃. 카드 결제는 `brand/last4/entry_method/auth_code/RRN` 저장·표기, QRIS는 `issuer/issuerRrn/referenceNo` 표기.

## 1. 텐더 화면 패턴

### 확인된 사실
- **Odoo POS** [확인]: 결제 화면에서 결제수단 선택 → 받은 금액 입력 → **Validate**. "금액만 입력하면 현금이 기본 선택"됨. 환불도 동일 화면에서 환불 수단 선택 후 Validate.
- **Shopify POS** [확인]: *Accept split payments* 및 *Allow split payments to be marked as partially paid* 설정. Checkout → **Split payment** → 수단 선택·금액 입력·Accept 반복. **첫 결제 후 금액 기본값 = 미납 잔액**. 부분 결제 후 주문 목록에서 "Partially paid" 배지 → **Collect payment**로 잔액 수금. 분할 결제 주문에 환불/교환/편집이 발생하면 추가 결제 불가.
- **Square POS** [확인]: Charge → **Split Amount** 또는 균등 분할. **분할 텐더는 5분 내 완료 필수**, 초과 시 기존 결제가 무효화될 수 있음.
- **Lightspeed Retail** [확인]: Pay → 부분 금액 입력 → 수단 선택 → "지불액·잔액" 표시 → 다음 수단 → Complete sale. 거스름돈은 POS와 고객 단말 양쪽에 표시.
- **Loyverse 현금 반올림** [확인]: 반올림은 **현금 결제에만**. 간격 0.05/0.10/0.50/1.00(소수 없는 통화는 5/10/50/100), 규칙 4종. 세금 계산은 바뀌지 않음. **영수증에 반올림 조정 표시**, "Sales by Payment Type" 보고서에 반올림액 집계.
- **Square Payment 모델** [확인]: `cash_details.buyer_supplied_money`(받은 돈)와 `change_back_money`(거스름돈, 자동계산). `tip_money`는 `amount_money`와 별도.

### 캐노니컬 플로우 — 현금 [추정]
1. **Tender 화면 진입**: 총액 크게 표시, 결제수단 탭(현금/카드/QRIS) 기본 = 현금.
2. **받은 금액 입력**: 기본값 = 반올림된 총액. 숫자패드 + **퀵캐시 버튼**(IDR: 총액 그대로 / 다음 1만·2만·5만·10만 단위 올림 — 통화별 설정값).
3. **거스름돈 실시간 표시**: `change = tendered − rounded_total`, 음수면 "부족분" + 완료 비활성(또는 분할 전환).
4. **확정**: 현금서랍 킥 → 영수증 → 새 주문. 반올림 차액은 별도 라인 `rounding_adjustment`.

### 캐노니컬 플로우 — 분할 텐더 [추정]
1. "분할" 토글 → 첫 텐더 금액(기본 전액) → 수단 → 서브플로우.
2. 성공 시 텐더 라인 추가, **남은 잔액이 다음 텐더의 기본값**.
3. 잔액 0 → 완료. 중간 이탈 시 성공한 전자결제 void/refund 보상 큐 필요(Square 5분 타임아웃과 동일 의미).
4. 부분 결제(deposit) 허용 여부는 사업 결정: 허용 시 `partially_paid` + 후속 수금 화면.

## 2. 카드 단말 플로우 (EDC)

### 확인된 사실
- **Square TerminalCheckout** [확인]: `status ∈ {PENDING, IN_PROGRESS, CANCEL_REQUESTED, CANCELED, COMPLETED}`. `deadline_duration` 기본·최대 5분; 초과 시 `CANCELED` + `cancel_reason=TIMED_OUT`. `reference_id`(외부 주문ID), `payment_ids`.
- **Square CardPaymentDetails** [확인]: `status ∈ {AUTHORIZED, CAPTURED, VOIDED, FAILED}`, `entry_method ∈ {KEYED, SWIPED, EMV, ON_FILE, CONTACTLESS}`, `auth_result_code`, EMV AID/application_name/cryptogram, `verification_method ∈ {PIN, SIGNATURE, PIN_AND_SIGNATURE, ON_DEVICE, NONE}`.
- **Square Payment** [확인]: `status ∈ {APPROVED, PENDING, COMPLETED, CANCELED, FAILED}`, `source_type ∈ {CARD, BANK_ACCOUNT, WALLET, BUY_NOW_PAY_LATER, SQUARE_ACCOUNT, CASH, EXTERNAL}`, `receipt_number`, `receipt_url`, `refunded_money`, `processing_fee`.
- **Toast 결제 상태 태그** [확인]: Authorized / Captured / Voiding / Refunded / Declined / Backgrounded / pending(노랑·빨강). 거절 시 재실행 불가 → 다른 수단 권유. 오프라인 결제 금액 상한 권고.
- **Odoo + Adyen 단말** [확인]: 수단 선택 → **Send** → "Payment Successful" → **Cancel** 가능 → 통신 실패 오류 후에만 **Force Done** 노출.
- **Lightspeed Payments API** [확인]: `DATA → SETUP → (PRINT/ACCEPT_SIGNATURE) → ACCEPT | DECLINE | EXIT`. 저장 `external_transaction_id`, `card_type`, `card_brand`, `card_last_four`, `entry_method`, `terminal_serial_number`.
- **Clover** [확인]: Semi-integrated = 주문은 타사 HW, 결제만 Clover 단말. Manual entry(keyed)는 P2PE 비인증 경고; 응답에 `Partial_Payment` 가능 → 승인 금액 확인 필수.

### 캐노니컬 상태 머신 — 카드 [추정]
```
idle → sent(단말로 금액 전송, 취소 가능) → in_progress(카드 제시됨, 취소 요청만)
     → approved | declined | canceled(by_cashier|by_customer) | timeout(90~300초)
     → comm_error → [재시도 상태조회] → approved | unknown → "수동 확정(Force Done)" 다이얼로그
```
- **수동 확정(Force Done / 승인번호 수기)**: 전표의 `auth_code`·`last4`·`brand`를 입력해 `entry_mode=manual_confirm`로 저장. 정산 리포트에서 별도 표기. **스탠드얼론 EDC(비연동 단말)는 처음부터 이 경로가 기본** — Meros 1차 구현에 가장 현실적.
- **저장 필드(최소)**: `provider`, `brand`, `last4`, `entry_mode(chip|tap|swipe|keyed|manual_confirm)`, `auth_code`, `rrn`, `trace/stan`, `terminal_id`, `merchant_id`, `batch_no`, `approved_amount`, `tip_amount`, `verification_method`, `raw_response(jsonb)`.

## 3. QR / 지갑 결제 (QRIS)

### 확인된 사실 (Midtrans GoPay/QRIS POS 가이드)
- 백엔드 `/v2/charge`(`payment_type: qris`, `order_id`, `gross_amount`) → `transaction_status: pending` + `actions[generate-qr-code]` + `qr_string`.
- **확인 방식**: 웹훅 1차(`signature_key` 검증). `settlement`+`fraud_status: accept` = 성공, `expire` = 실패. Get Status는 보조(≥10초).
- **만료 기본 15분**. 취소는 Cancel/Expire API. `order_id` 재사용은 취소/만료 후에만.
- 고객 앱 내 실패 시도는 보고되지 않음 → pending 유지. **고객 앱 성공 화면 ≠ settlement**.
- 상태: `pending / settlement / expire / cancel / deny`. POS 거래 환불 기본 불가.
- **BRI QRIS MPM 동적 알림** [확인]: `originalReferenceNo`, `latestTransactionStatus(00 success/01 initiated/02 paying/03 pending/04 refunded/05 canceled/06 failed/07 not found)`, `additionalInfo{reffId, issuerName, issuerRrn}`.

### 캐노니컬 플로우 — QRIS [추정]
1. **생성**: 텐더 금액 확정 → charge → `qr_string`(실패 시 재시도).
2. **표시**: 고객용 디스플레이 또는 캐셔 화면 "QR 전체화면" 모드. 금액·카운트다운·"다른 수단으로".
3. **대기**: 웹훅 → 서버가 SSE/WebSocket으로 POS에 push; 보조 10초 폴링(백엔드 캐시 경유). 서브상태 `qr_shown → customer_paying → settled`.
4. **종료**: `settlement` → 텐더 라인(`issuer`, `issuerRrn`, `referenceNo`, `paid_at`) → 영수증. `expire/cancel` → 재생성 또는 다른 수단. 캐셔 취소 시 Cancel API 필수.
5. **애매 상태**: "냈다"는데 settlement 미수신 → "확인 중" + 수동 상태조회 + 주문 `awaiting` 보류.

## 4. 영수증 데이터 모델 & 레이아웃

### 확인된 사실
- **Square** [확인]: 품목·할인·세금 포함. SMS/이메일/인쇄/자동 영수증. 재발송 = Transactions > New Receipt. `receipt_number`, `receipt_url`.
- **Shopify** [확인]: 인쇄 영수증 Visual editor + 헤더/푸터 Liquid; 이메일/SMS 영수증은 별도 템플릿.
- **Odoo** [확인]: Header & Footer, 자동 인쇄. 재인쇄 = Orders(Paid) → Print Receipt. "Use QR code on ticket"으로 고객 셀프 인보이스. 환불은 원 영수증 참조 credit note. `pos.order`: `amount_total / amount_paid / amount_return`, `state ∈ {draft, paid, done, invoiced, cancel}`, `pos_reference`.
- **열폭** [확인]: 58mm = 32자, 80mm = 48자(Font A), 80mm Font B = 64자.

### 캐노니컬 영수증 필드 [추정] — `receipt_snapshot` jsonb 권장
```
header:   store_name, address, phone, npwp(선택), logo
meta:     receipt_no(R-YYMMDD-####), order_display_id, order_id, issued_at(local),
          cashier_name, register/device_id, shift_id,
          kind ∈ {sale, reprint, refund, void}  ← 재인쇄 "*** COPY ***"
customer: name/phone (선택)
lines[]:  name, variant, qty, unit_price, line_discount, line_total, tax_code
totals:   subtotal, discounts[], service_charge, tax_lines[{name, rate, amount}],
          rounding_adjustment, grand_total
tenders[]: method, amount,
          cash: tendered, change
          card: brand, last4, entry_mode, auth_code, rrn, tid, mid, batch
          qris: issuer, issuer_rrn, reference_no, paid_at
          refund: original_receipt_no, reason
footer:   return_policy, thank_you, barcode/QR(영수증 조회 URL),
          digital: receipt_url(공개 토큰), delivered_via[] {print, email, whatsapp, link}
```
- 80mm/48자: 품목명 24~28자, 수량×단가 중간, 금액 우측 12자, 천단위 구분·소수 없음(IDR). 58mm/32자: 품목명 줄 + `qty x price ... total` 2줄.
- **주문에 영수증 스냅샷 저장**(불변 jsonb) → 재인쇄 `reprint_count` + COPY.
- 환불 영수증: `kind=refund`, 원 영수증 참조, 음수 라인.

## 5. 주문 상세의 결제 이력
- **Shopify** [확인]: `displayFinancialStatus ∈ {AUTHORIZED, EXPIRED, PAID, PARTIALLY_PAID, PARTIALLY_REFUNDED, PENDING, REFUNDED, VOIDED}`; Timeline에 결제 이벤트 + gateway 정보.
- **Medusa Admin** [확인]: Payments 섹션 = Authorized / Partially Authorized / Captured / Partially Captured / Refunded / Partially Refunded. Capture, 환불(금액·사유). 미납 잔액 → **Mark as paid** 또는 payment link.
- **캐노니컬 [추정]**: (a) 상태 배지 (b) 텐더 라인 테이블(수단·금액·상태·참조·시각·캐셔) (c) 타임라인(authorized/captured/refunded/voided/receipt_sent/reprinted + raw payload 토글) (d) 액션(환불·재인쇄·재발송·잔액 수금).

## 6. 현금서랍 & 시프트
- **Loyverse** [확인]: Open shift(starting cash) → Pay In/Pay Out → Close: **Expected cash** vs **Actual cash** vs **Difference**.
- **Odoo** [확인]: Opening Cash Control → Cash In/Out → Closing Control: 결제수단별 기대 금액, 지폐·동전 카운트, 불일치 허용/강제.
- **Toast** [확인]: Expected Closeout Cash = 시작금 + Cash In − Cash Out − Pay Out − Cash Drop. Z Report 섹션 선택형, 미결 체크 있으면 End day 불가.
- **캐노니컬 Z 리포트 [추정]**: 헤더(매장·레지스터·시프트·개폐시각·캐셔) / 매출(총·할인·환불·순·세금·서비스·반올림) / **결제수단별 정산**(현금·카드[브랜드별]·QRIS[발급사별] 건수·금액·환불) / 현금 조정(시작금·in/out·기대·실제·차액) / 카운터(주문·보이드·재인쇄).

## 7. Medusa v2 매핑

### 확인된 사실
- **Provider** [확인]: `AbstractPaymentProvider<Options>`, `static identifier`, ID = `pp_{identifier}_{id}`. 메서드: `initiatePayment → {id, data}`, `authorizePayment → {data, status}`, `capturePayment`, `refundPayment`, `cancelPayment`, `getPaymentStatus`, `retrievePayment`, `updatePayment`, `deletePayment`, `getWebhookActionAndData → {action ∈ authorized|captured|failed|not_supported, data{session_id, amount}}`. `initiatePayment`의 `data`는 PaymentSession에 저장·**공개 가능** → 민감값 금지. 등록 = `ModuleProvider(Modules.PAYMENT, {services})` + `medusa-config.ts providers[]`.
- **PaymentSessionStatus** [확인]: `authorized, captured, pending, requires_more, error, canceled, pending_authorization`.
- **플로우** [확인]: payment_collection → `createPaymentSessionsWorkflow` → `authorizePaymentSession`(성공 시 Payment; `pending_authorization`이면 주문 awaiting) → `capturePaymentWorkflow` / `refundPaymentsWorkflow`.
- **분할 결제** [확인]: 공식 "Medusa doesn't support split payments" — 컬렉션당 세션 1개.
- **System provider** [확인]: `pp_system_default` 플레이스홀더.
- **Mark as paid** [확인]: `markPaymentCollectionAsPaidWorkflow` → 세션 생성 → authorize → capture, provider 생략 시 system. `POST /admin/payment-collections/{id}/mark-as-paid`.
- **주문 payment_status 집계** [확인, core-flows aggregate-status]: **여러 payment_collection**을 순회해 판정 → 주문:컬렉션 = 1:N이 코어 전제.

### 매핑 표 [추정]
| POS 개념 | Medusa v2 |
|---|---|
| 주문 | draft order → convert (POS는 draft order 경로 유지) |
| 텐더 1건 | **payment_collection 1건 (amount = 텐더 금액)** — `createOrderPaymentCollectionWorkflow`. split tender = 컬렉션 N개, `partially_captured` 집계 공짜 |
| 현금 | 커스텀 `pp_cash`: `authorizePayment`가 `{tendered, change, drawer_id}`를 data로 반환 → capture |
| 비연동 EDC | 커스텀 `pp_edc_manual`: `initiatePayment` no-op, `authorizePayment`가 캐셔 입력(brand/last4/auth_code/rrn/tid) 검증 → authorized → capture |
| 세미인티그레이티드 단말 | 커스텀 provider: initiate = 단말 전송(data = terminal_checkout_id), authorize = 상태 조회, getPaymentStatus = 폴링, webhook = 콜백 |
| QRIS | 커스텀 `pp_qris_<pg>`: initiate = charge → `data{qr_string, expiry}`, authorize = settlement면 authorized 아니면 pending_authorization, webhook → captured, cancel = Cancel API |
| 환불/보이드 | `refundPaymentsWorkflow` / `cancelPayment` |
| 영수증 | 코어 없음 → **모듈 `receipt`**(order_id, kind, snapshot jsonb, receipt_no sequence, delivered_via[]) + module link |
| 시프트/서랍 | 코어 없음 → 기존 `register_session` 확장(opening_float, pay_in/out[], expected_by_method, counted, diff) |

주의: 분할 텐더 중 카드 성공 후 QRIS 실패로 주문을 버릴 때 카드 컬렉션 refund/cancel + 주문 cancel 보상 워크플로 필요.

## 8. Sources
- Medusa — Create a Payment Provider https://docs.medusajs.com/resources/references/payment/provider · Accept Payment Flow https://docs.medusajs.com/resources/commerce-modules/payment/payment-flow · system provider https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider · markPaymentCollectionAsPaid https://docs.medusajs.com/resources/references/medusa-workflows/markPaymentCollectionAsPaid · PaymentSessionStatus https://docs.medusajs.com/resources/references/utils/enums/utils.PaymentSessionStatus · Admin payment-collections https://docs.medusajs.com/api/admin/payment-collections.md · Manage Order Payments https://docs.medusajs.com/user-guide/orders/payments · Draft Orders https://docs.medusajs.com/user-guide/orders/draft-orders/manage · createOrderPaymentCollectionWorkflow https://docs.medusajs.com/resources/references/medusa-workflows/createOrderPaymentCollectionWorkflow · aggregate-status.js https://app.unpkg.com/@medusajs/core-flows@2.8.7/files/dist/order/utils/aggregate-status.js
- Square — Split tender https://squareup.com/help/us/en/article/5097-process-split-tender-payments-with-square · TerminalCheckout https://developer.squareup.com/reference/square/objects/TerminalCheckout · Payment https://developer.squareup.com/reference/square/objects/Payment · CardPaymentDetails https://developer.squareup.com/reference/square/objects/CardPaymentDetails · CashPaymentDetails https://developer.squareup.com/reference/square/objects/CashPaymentDetails · Receipts https://squareup.com/help/gb/en/article/7702-information-included-on-square-receipts
- Shopify — Multiple/partial payments https://help.shopify.com/en/manual/sell-in-person/shopify-pos/payment-management/multiple-partial-payments · Receipts https://help.shopify.com/manual/sell-in-person/setup/receipts/customize-receipts/ · OrderDisplayFinancialStatus https://shopify.dev/docs/api/admin-graphql/latest/enums/OrderDisplayFinancialStatus
- Toast — Payment status tags https://support.toasttab.com/en/article/POS-Payment-Status-Tags · Declined https://support.toasttab.com/en/article/Troubleshooting-Denied-Payments · Z Report https://support.toasttab.com/en/article/Close-Out-Day-Z-Report-Auto-Capture · Cash Drawer https://support.toasttab.com/en/article/Cash-Drawer-Reports-Overview
- Lightspeed — Terminal flow https://x-series-support.lightspeedhq.com/hc/articles/25533997055515 · Payments API https://x-series-api.lightspeedhq.com/docs/payments_api_reference
- Loyverse — Shift https://help.loyverse.com/help/shift-management-loyverse-pos · Cash rounding https://help.loyverse.com/help/how-work-cash-rounding
- Odoo — POS 18 https://www.odoo.com/documentation/18.0/applications/sales/point_of_sale.html · Receipts https://www.odoo.com/documentation/18.0/applications/sales/point_of_sale/receipts_invoices.html · Adyen https://www.odoo.com/documentation/16.0/ro/applications/sales/point_of_sale/payment_methods/terminals/adyen.html · pos_order.py https://github.com/odoo/odoo/blob/f1ff55bca1242af86cd5feedbf7c4793b96174a1/addons/point_of_sale/models/pos_order.py
- Clover — Semi-integration https://docs.clover.com/docs/semi-integration-glossary · Manual entry https://docs.clover.com/docs/manual-entry-payments
- QRIS — Midtrans POS https://docs.midtrans.com/docs/gopay-qris-pos-integration · BRI QRIS MPM Dinamis Notification v1.1 https://developers.bri.co.id/en/docs/qris-merchant-presented-mode-mpm-dinamis-notification-v11
- Thermal — WCPOS receipt width https://docs.wcpos.com/hardware/printers/receipt-width

조사 한계: Odoo 18 cash_rounding 페이지, Square 분할 영수증 표기, Shopify 영수증 필드 상세, Lightspeed 퀵캐시 기본 세트는 미확인 → [추정].
