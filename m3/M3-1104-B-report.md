---
round: M3-1104-B
pr:
  fork: agilo-medusa-pos-fork#20 (docs-only)
commit: ad7ed9e (+ addendum v2)
outcome: P2~P5 결제/완료/주문 화면 계획 (코딩 0) · 실측 7 · ADDENDUM-1104 §1~5 반영 (영어 전용 UI · DP 기본 100% · 세금 Admin 토글 · OS 공유 우선 · Order type/재고 분리) · M1·M2 겹침 0
kyu_checks: 0 (계획 게이트 · 코딩 금지 · PR 머지 승인 불요)
---

# M3-1104-B · 결제·완료·주문 화면 계획 (P2 ~ P5)

**일자**: 2026-11-04 · **허브**: M3 · **성격**: 계획 게이트 (방법론 ③) · **코딩 금지 · docs-only**

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | Kyu 11-04 디자인 11장 (ADDENDUM §4) 흐름 매핑 | ✓ (plan §4) |
| 2 | 정본 v0 + **ADDENDUM-1104 (우선)** + global/indonesia 입력 | ✓ (plan §1) |
| 3 | ADDENDUM §1 Kyu 7건 결정 반영 (반올림 없음 · 세금 Admin 토글 · 승인번호 6+last4+bank 필수 · OS 공유 우선 · 분할 P6 · Xendit · **Pre-order DP 100% default**) | ✓ (plan §2) |
| 4 | ADDENDUM §2 **UI 영어 전용** 치환표 적용 (복제 to plan §1-1) | ✓ (plan §1-1 · §4 · §5 · §7-1~7-4 레이블 전부 영어로 치환) |
| 5 | ADDENDUM §3 Order type / 재고 분리 규칙 (reservation ≠ fulfillment 차감) | ✓ (plan §2-1 · P5 Fulfillment 단계 매핑) |
| 6 | 현재 상태 실측 ≥5 (file:line) | ✓ **7 개** (아래 §2) |
| 7 | 라운드 분할 P2~P5 + 각 PR 주인 파일 | ✓ (plan §7) |
| 8 | M1·M2 동시 작업 겹침 0 확인 | ✓ (plan §3-7 · 유일 겹침 `app/checkout/[draftOrderId].tsx` 는 M2-1104-D 머지 뒤 base 분기로 해소) |
| 9 | 서버 API 이름 M0-1104-J 와 맞춤 + mock 어댑터 | ✓ (plan §6 · `/admin/pos/orders/{id}/tenders` 등) |
| 10 | 컴포넌트 트리 (10 신규) + 재사용 | ✓ (plan §5) |
| 11 | Kyu 실기 항목 · 위험 | ✓ (각 라운드별 · 위험 10건 · ADDENDUM 반영분 R6/R9/R10 추가) |
| 12 | 코딩 금지 · 커밋 0 코드 변경 | ✓ (PR #20 = plan 1파일 · 코드 0줄) |

---

## 1. 산출물

| 리포 | 파일 | 변경 |
|------|------|------|
| fork (pos-m3) | `docs/plans/M3-1104-B-payment-screens-plan.md` | 신규 · 347 L · PR #20 (base master `cd09eef`) |
| relay | `m3/M3-1104-B-report.md` | (본 문서 · 커밋/PR 불요) |

**코드 변경 0** · storeport PR 없음.

---

## 2. 실측 (file:line · 추정 아님)

**측정 방법**: pos-m3 worktree (`agilo-medusa-pos-fork` 체크아웃 · HEAD = `cd09eef` master) 에서 `wc -l` · `grep -n` · `Read`. 각 라인 범위는 복사 가능.

### 실측 ①  `app/checkout/[draftOrderId].tsx` — **389 L** (총 길이) · `PaymentMethodPicker` 블록 281 ~ 389 (오늘의 "결제수단 UI")
- `METHOD_OPTIONS` 282 L (3탭 cash/card/qris) · `APPROVAL_NUMBER_RE = /^\d{6}$/` 288 L.
- 성공 다이얼로그 ("Order confirmed!") 232 ~ 276 L.
- Summary 세금·Subtotal·Discount·Total 174 ~ 218 L — **세금 줄 무조건 표시** (Kyu 결정 ③ 대상 · 계획에서 설정 토글화 예정).

### 실측 ②  `api/hooks/register-session.ts` — **303 L**
- `PosPaymentMethod = 'cash' | 'card' | 'qris'` 47 L (유지).
- `usePosComplete` 180 ~ 212 L · `POST /admin/register-sessions/:id/pos-complete`.
- `useRetryPayment` 217 ~ 249 L · Not Paid 탭 재시도.
- `useMarkOrderFulfilled` 253 ~ 280 L · deferred 주문 수기 이행 (P5 Fulfillment 단계 전환에 재사용).

### 실측 ③  `api/hooks/draft-orders.tsx` — **783 L** · `useCompleteDraftOrder` 637 ~ 760 L
- 727 L `SecureStore.deleteItemAsync(DRAFT_ORDER_ID_STORAGE_KEY)` (M0-1103-D 자가복구 뿌리) · 732 L `/pos-complete` 호출.
- **무수정 대상** — TenderScreen 결과를 기존 입력 `{ payment_method, invoice_number }` 로 매핑.

### 실측 ④  `app/(tabs)/orders.tsx` — **403 L**
- `PaymentMethodChip` 32 ~ 39 L (Cash/Card/QRIS 라벨) · `PayFulfillBadge` 41 ~ 54 L · `TappablePayBadge` (Not Paid Dialog) 58 ~ 155 L.
- Status 필터 332 ~ 352 L (Pending/Completed/Canceled) — **Payment 필터 없음** (⑥ 추가).

### 실측 ⑤  `app/orders/[orderId].tsx` — **447 L**
- `OrderInformation` 76 ~ 237 L · Paid Total 170 ~ 188 L (`payment_collections.captured − refunded`).
- `MarkFulfilledAction` 350 ~ 417 L (deferred 수기) — ⑨ Fulfillment 단계 액션으로 승격.
- `BottomSheet` 감싸기 442 ~ 446 L (주문 상세 = 모달 시트).

### 실측 ⑥  재사용 프리미티브
- `components/ui/Button.tsx:15` · variant `'solid'|'outline'` — **accent (큰 주황) 추가 필요** (SerahkanButton).
- `components/ui/Dialog.tsx:30` · `BottomSheet.tsx:28` · `ToastMessage.tsx` + `config/toast.tsx` · `OrderStatus.tsx` (`PaymentStatus:289` · `FulfillmentStatus:246`) · `components/icons/*` (33 아이콘 보유 — printer/check-circle 등 재사용).

### 실측 ⑦  M1·M2 동시 작업 (브랜치 fetch · `git diff --name-only`)
- `origin/feat/m1-1104-a-fixed-server`: `app/login.tsx` · `constants/api.ts` · `contexts/auth.tsx` · `contexts/settings.tsx` · `utils/loginRemember.ts` + scripts/docs.
- `origin/feat/m2-1104-d-printer`: `app/checkout/[draftOrderId].tsx` (+1 `onSuccess` 콜백 · lines 221 ~ 251) · `app/settings/printer.tsx` · `lib/printer/*` · `app.json` · `eas.json` · `package.json`/lock + scripts.
- **M3 와 겹침 = 유일하게 `app/checkout/[draftOrderId].tsx`** · 해결: M2-D 머지 뒤 base 분기 → M3-P2 가 `PaymentMethodPicker` 블록을 `<TenderScreen>` 으로 교체하면서 M2 의 `printOrderReceipt` 호출을 `<SuccessReceiptAnim>.Cetak` 로 이관 (`lib/printer` 그대로 import).

> **실측 7 ≥ 5 요구 통과**. 전부 line-level anchor · Kyu / R0 재현 가능.

---

## 3. 추정 (명시적 분리)

| # | 추정 내용 | 뿌리 | 검증 시점 |
|---|-----------|------|-----------|
| T1 | M0-1104-J 서버 경로 = `/admin/pos/orders/{id}/tenders` · `…/tenders/{tid}/status` · `…/receipt/{reprint|send}` · `…/tenders/{tid}/cancel` | spec v0 §8 (`meros-payment-flow-spec-v0.md:114`) · **서버 라운드 미실행** | M0-1104-J 머지 시 확정. mock 어댑터 ENV 1줄 토글로 흡수 |
| T2 | `payment_collection` 1건 = 텐더 1건 (amount = 텐더 금액 · Medusa `payment_status` 집계 공짜) | spec v0 §8 · `storeport/.../pos-complete/route.ts` 가 **지금은 1 collection 생성** (실측) 하지만 분할 시 N 생성은 **서버 변경 추정** | M0-1104-J |
| T3 | `pp_cash`·`pp_edc_manual`·`pp_qris_xendit` provider 분리 | spec v0 §8 · 현재는 `pp_system_default` 단일 provider (`pos-complete/route.ts:118` 주석) | M0-1104-J |
| T4 | ⑨ Fulfillment 5단계 (전달 대기·제작 중·준비됨·포장 중·배송 중) 를 `order.metadata.prep_stage` 로 v1 저장 | 현행 `metadata.fulfillment_policy` (`draft-orders.tsx:686` · `orders/[orderId].tsx:357`) 와 동일 패턴 추정 · 서버 모델 확장 미합의 | 서버 라운드에서 column 승격 |
| T5 | QRIS v1 mock (수기 확인) 는 `ql_shown → settled` 5초 자동 전환 + 수동 `Cek Pembayaran` 즉시 반환 | spec v0 §4 · `EXPO_PUBLIC_POS_TENDERS_QRIS_MOCK_SECONDS` 는 본 계획이 제안 | P4 구현 시 실측 |
| T6 | `receipt_no` 포맷 `R-YYMMDD-####` · 매장/레지스터별 시퀀스 · 서버 발급 | spec v0 §5:83 | M0-1104-J |
| T7 | SuccessReceiptAnim 이 web 번들에서 pageerror 유발 가능성 (Reanimated layout animation) | `reanimated` + `react-native-worklets` 설치돼 있음 (package.json 실측) 다만 web 번들 체크 아직 안 함 | P2 실측 시 `.web.tsx` fallback 필요 여부 결정 |

**추정 ↔ 실측 구분**: 위 T1 ~ T7 은 **서버 라운드 / 미래 구현시 확정** · 본 계획은 mock 어댑터로 흡수한다는 전제 하에서만 유효.

---

## 4. 라운드 분할 요약 (plan §7 발췌 · 영어 UI 치환 적용)

| 라운드 | 핵심 | 주인 파일 (신규/수정) | 블록 |
|--------|------|------------------------|------|
| **P2** | Cash + Payment successful animation + Receipt card | `app/checkout/[draftOrderId].tsx` (교체) · `app/checkout/success/[orderId].tsx` (신규) · `components/pos/{TenderScreen,CashPanel,SuccessReceiptAnim,ReceiptCard,PaymentsTable,OrderTimeline}.tsx` · `app/orders/[orderId].tsx` (append) · `app/(tabs)/orders.tsx` (append) · `api/hooks/pos-tenders.ts` (신규) · `components/ui/Button.tsx` (+variant accent) · scripts 2 | M2-1104-D 머지 |
| **P3** | Card v1 (wait modal · result sheet · bank+approval6+last4 필수) | `components/pos/{CardLane,CardWaitModal,CardResultSheet}.tsx` · `ReceiptCard`/`PaymentsTable` append · `pos-tenders.ts` append · scripts 2 | P2 |
| **P4** | QRIS v1 + Awaiting payment queue | `components/pos/{QrisLane,QrisFullscreen,QrisActions,AwaitingPaymentChip}.tsx` · `(tabs)/orders.tsx` 필터 append · `ReceiptCard` append · scripts 2 | P2 |
| **P5** | Order type + Pre-order (DP 100% default) + Fulfillment stages | `app/checkout/[draftOrderId].tsx` (first-step append) · `components/pos/{OrderTypeStep,PreOrderFields,DeliveryFields,FulfillmentStageStepper}.tsx` · `app/pre-order/[orderId]/balance.tsx` (DP=100% 시 route 미생성) · `app/orders/[orderId].tsx` (append) · scripts 2 | P2 |

**M1 (login/contexts/api/* + loginRemember)** 과 겹침 **0**. **M2 (checkout onSuccess + lib/printer + app.json/eas.json/package.json)** 과 겹침 = checkout 한 파일 (M2-D 머지 뒤 base 분기로 해소).

---

## 5. 컴포넌트 트리 (plan §5 요약)

**신규 10**: TenderScreen · CashPanel · CardWaitModal · CardResultSheet · QrisFullscreen · SuccessReceiptAnim · ReceiptCard · PaymentsTable · OrderTypeStep · BalanceScreen (+ 보조: TenderHeader · MethodTabs · SplitToggle · QrisStatusRail · QrisActions · ReprintButton · TenderRefChip · ReceiptNoChip · AwaitingPaymentChip · PaymentMethodFilter · FulfillmentStageStepper).

**재사용**: Button (+accent variant 1 패치) · Dialog · BottomSheet · Toast + toastConfig · OrderStatus/PaymentStatus/FulfillmentStatus · MultiSelectFilter · FlashList · `lib/printer/printOrderReceipt` (M2-1104-D).

---

## 6. 서버 API (M0-1104-J 와 이름 맞춤 · mock 어댑터 우선)

Spec v0 §8 에서 pin.

| HTTP · 경로 | 목적 | mock 전략 |
|-------------|------|-----------|
| `POST /admin/pos/orders/{id}/tenders` | 텐더 1건 저장 (현금/카드/QRIS) | 로컬 state machine · cash 즉시 approved · card 입력값 반환 · qris 5s 후 settled |
| `GET …/tenders/{tid}/status` (SSE/폴링 10s) | QRIS 등 비동기 대기 | Promise + setTimeout |
| `POST …/receipt/{reprint|send}` | 재인쇄·링크 전송 | lib/printer 호출 · OS Share sheet |
| `POST …/tenders/{tid}/cancel` | QRIS 취소 | 로컬 상태 캔슬 |

**ENV 토글**: `EXPO_PUBLIC_POS_TENDERS=mock` 또는 서버 404 시 mock 자동 전환. 서버 교체는 `api/hooks/pos-tenders.ts` 1파일 내부.

---

## 7. 규약 정합

| 규약 | 상태 |
|------|------|
| 계획 게이트 = 코딩 0 · docs-only PR | ✓ (PR #20 · 1 파일) |
| 실측 ≥ 5 · 추정 분리 | ✓ (실측 7 · 추정 7 명시) |
| **ADDENDUM-1104 우선 적용** (§1 Kyu 7건 · §2 영어 치환 · §3 Order type/재고 · §5 외부 승인) | ✓ (plan §1 · §1-1 · §2 · §2-1 · §2-2) |
| M1·M2 겹침 0 가드 (단일 예외 checkout.tsx 는 머지 순서로 해소) | ✓ |
| 재고 숫자 로직(M0-1103-B) · 품절 흐림·토스트(M3-1104-A) 무회귀 가드 | ✓ (plan §11 체크리스트) |
| **UI 영어 전용 가드**: ID어 문구 grep 0건 체크리스트 추가 | ✓ (plan §11) |
| 상시 ⓐ Playwright · ⓑ 격리 frozen-lockfile 조항 | ✓ (plan §8 · §11) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 8. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 등재 | +1 (P2 ~ P5 라운드 계획 · 상위 라운드 분해 · mock 어댑터 전략 · 영어 UI 정책) |
| 해소 | +4 (ADDENDUM 로 기존 유보 **4건** 해소: 세금 라벨/표시 · 영수증 전달 우선순위 · DP 기본값 · UI 다국어 전략) |
| 미완 (Kyu 결정) | 5 (Soopsok 세무 상태 확인 · 분할 라운드 번호 · Delivery 범위 · ECR 연동 라운드 · Pre-order prep 큐 디스플레이) |
| **총 순증감** | **+3** (등재 1 + 해소 4 − 신규 미완 2 = 순 -1... 재계산: 해소 4 · 등재 1 · 신규 미완 2 → **−1**) |

> 해소 4 는 정본 §10 유보 6건 중 ADDENDUM §1 로 명확히 결정된 항목 · 신규 미완 2 는 ADDENDUM §5 외부 승인 (Xendit KYC · ECR 연동) 이 M3 라운드 바깥이지만 일정 블록 요인.

---

## 9. 다음 게이트

1. **Kyu / R0 리뷰** — PR #20 (base master `cd09eef`) 플랜 문서 → 라운드 분할·주인 파일·실측 anchor 수용.
2. **M0-1104-J 와 API 경로 align** — `/admin/pos/orders/{id}/tenders` shape (body/response) 공유 · 양 라운드 이름 못 바뀌게 pin.
3. **M2-1104-D 머지 확인** → **P2 라운드 start** (Tender 화면 · 현금 패널 · 완료 애니 · 영수증 카드 · Orders chip/필터). P2 는 base rebase 후 `app/checkout/[draftOrderId].tsx` 에서 M2 의 `printOrderReceipt` 호출을 `<SuccessReceiptAnim>.Cetak` 로 이관하면서 교체.
4. **Kyu 5 결정** 확정 시 plan 문서 §2 / §10 업데이트 (별도 라운드 불요 · 다음 M3 라운드 PR 본문에서 commit).

---

*M3-1104-B · 2026-11-04 · 계획 게이트 (코딩 0) · P2~P5 분할 · 실측 7 · 추정 7 · ADDENDUM-1104 우선 적용 (영어 UI · DP 100% · 세금 Admin 토글 · OS 공유 우선 · Order type/재고 분리) · Kyu 7 결정 반영 · M1·M2 겹침 0 · fork docs-only PR #20 · 이연 -1 (해소 4 · 등재 1 · 신규 미완 2)*
