fork #207 CHANGES · fork #208 APPROVE

# R0C-1119-AL — fork #207 · #208 재리뷰 (2026-11-19)

push·머지 없음. PR 코멘트:
- fork #207 issuecomment-7013872204 (HEAD c1131bf)
- fork #208 issuecomment-7013875296 (HEAD 8b66d46)

## 공통 QC (직접 실행)

| PR | vitest | lint | tsc |
|---|---|---|---|
| #207 c1131bf | 811 pass · splitview-capture 1 file 원래 실패 | 0 error (61 warn) | 14 (master 14 · 새 에러 없음) |
| #208 8b66d46 | 831 pass · 같은 1 file | 0 error | 14 |

## A. fork #207 — CHANGES

- 앱은 `qris-status` 응답 **최상위**의 `qris_receipt_id` · `reference_no` 를 읽음.
- storeport #403 (e5c23f8) 의 `qris-status/route.ts` 가 돌려주는 것은 `{ok, status, payment_request_id, test_mode, data}` 뿐임.
  - 그래서 실제로는 두 값 모두 null → 결제 중 Slip 2 에 Ref 줄이 없음.
  - PR fixture (`m1-1117-e.qris-status-2nd-paid.json`) 에 서버에 없는 필드를 넣어서 테스트만 통과하는 상태.
- Time 은 고쳐지지 않음.
  - 결제 중 = `secondSlipAt` = QRIS POST 의 `at` (QR 만든 시각)
  - 완료 = `captured_at ?? at`
- 실제 빌더로 비교함: 앱 `buildSlipData` vs `tenderToSlipData` + storeport `buildTenderEntry`. Cash→QRIS, #403 모양 mock.

| 경우 | 결제 중 Slip 2 | 완료 Slip 2 |
|---|---|---|
| live (receipt_id 있음) | Time 10:00 · Ref 없음 | Time 10:02 · Ref A1B2C3D4E5 |
| sandbox (receipt_id 없음) | Time 10:00 · Ref 없음 | Time 10:02 · Ref qrpy_abc123 |

- 판정: Kyu 원문 "Slip 1, Slip 2 영수증이 같아야 함" 미충족.
- 회귀 없음: Slip 1 (Cash) 과 주문 상세 버튼 (AG) 은 이번 커밋 diff 에 없음.
- 고칠 것 (둘 중 하나):
  1. paid 이후 `quote.tenders[i]` 를 다시 받아서 Slip 2 의 at · qris_receipt_id · xendit_payment_id · reference_no 를 덮어쓰기
  2. qris-status 가 같은 tender entry 를 돌려주도록 storeport 와 계약 추가
  - 어느 쪽이든 fixture 는 실제 응답 모양으로 맞출 것.
- 참고: QRIS→Cash (1차 QRIS) 도 같은 구조임. 결제 중 = pending POST 의 `reference_no`/`at`, 완료 = webhook 의 id/captured_at. 같은 방식으로 함께 고칠 것.

## B. fork #208 — APPROVE

- 실제 hook 으로 probe 함: react-test-renderer 로 `usePosScreenAutoEmit` 와 `usePosScreen` 을 마운트하고 sdk.fetch 는 spy 로 둠.
- 순서: draft 있음 → tender 후 draft=null → success 화면 hint `{paid, freezeCart, order_id}` 설정.

| 빌드 | checkout-snapshot POST |
|---|---|
| #208 8b66d46 | cart_building → **paid (ord_1)** 1건 |
| #207 c1131bf (비교용) | cart_building 만 · paid 0건 |

- Next customer:
  - hint=null 이 되면 클라이언트 idle 은 order_id 가 null 이라 보내지지 않음.
  - 대신 `POST /registers/:id/next-customer` → `nextCustomerForRegister` 가 서버 snapshot 을 `pos_screen: idle` 로 바꿈.
  - storeport #400 display-machine 이 "POS idle 이면 terminal 흐름 즉시 종료" 규칙으로 처리함 → 손님 화면 idle 로 복귀. #400 규칙과 맞음.
- #207 최신 (c1131bf) 반영됨. #207 을 고치면 다시 머지해야 함.
- 판정에 영향 없는 지적: 새 테스트 11건은 소스 grep 과 인라인 시뮬레이션이고, 실제 hook 을 렌더하는 테스트가 아님. M2 리포트의 "실제 hook 테스트 O" 는 사실과 다름.

## 환경 메모

- AI 의 expo web + Playwright 화면 비교는 이번에 다시 하지 않음. 대신 슬립 텍스트를 만드는 실제 함수 (buildSlipData / tenderToSlipData / buildTenderEntry / PaymentSlipCard 의 Ref 우선순위 · Time 포맷) 로 데이터 단계에서 비교함.
- npm ci 는 `SENTRYCLI_SKIP_DOWNLOAD=1` 이 필요함 (sentry-cli 다운로드 차단).
- probe 용 react-test-renderer 는 `--no-save` 로 설치함. 리포는 바뀌지 않음.
