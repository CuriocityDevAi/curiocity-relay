fork #207 CHANGES

# R0C-1119-AD — fork #207 재리뷰 (2026-11-19)

- head c04ce34 (M2-1119-W) · origin/master #209 (1988258) 포함 O
- 코멘트: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/207#issuecomment-7009702210

## ① 슬립 동일성 — 미충족 (Playwright 로 직접 렌더해서 텍스트 비교)
- 방법: e2e 의 split Cash→QRIS mock 을 실제 서버 응답 모양으로 바꿈
  - quote.store = {name, logo_url}
  - receipt.snapshot.store/header = 로고 + "Soopsok Sweets\nPondok Indah Mall 3 LG\nWA : 0813-…"
- 결제 중 Slip 1/2: 로고 O · **머리글 3줄 없음** · Ref = `pr_split_qris_e_02` (payment_request_id)
- 완료 화면 Slip 1/2: 로고 O · 머리글 3줄 O (전체 영수증과 같음) · Ref = `QR-2611120002` (qris_receipt_id)
- 원인
  - split-tender `[draftOrderId].tsx:462` 에서 `header: null` 로 고정
  - storeport quote 라우트(`quote/route.ts:133`)가 receipt_header 를 보내지 않음 → 클라이언트만 고쳐서는 안 되고, 서버에서 받아오는 경로가 필요
- 그 밖에 다른 점
  - 카드: 결제 중 슬립에 approval_code 가 안 들어감 (완료 화면은 표시)
  - Time: 결제 중 = 기기 시계(new Date) / 완료 = tender.at
- 머리글 소스: 완료 화면 = snapshot.header (ReceiptCard 와 같은 필드) O / 결제 중 = 없음 X
- PaymentSlipCard 는 로고가 있으면 storeName 텍스트를 숨김 = ReceiptCard 와 같은 규칙 (O)
- REQ 1-e 테스트: 두 빌더에 같은 입력을 넣어 비교하는 방식이라, 화면이 실제로 넘기는 입력이 다른 문제는 잡지 못함

## ④ 버튼 — 미충족 (expo export web + Playwright 실측 · /orders/:id · 버튼 7개)
- M2-1119-W 는 `app/orders/[orderId].tsx` 를 건드리지 않음
  - 862~937 줄이 그대로 flex-1 + numberOfLines=1
  - 바꾼 곳은 성공 화면과 split 슬립 버튼뿐
- 360px: 7개 모두 한 줄(y 같음) · 폭 39~41px · 7개 전부 잘림 (글자 첫 한 자만 보임)
- 600px: 폭 73~75px · Reprint/Share/Hand over/Refund/Link customer/Done 잘림 (Void 만 온전)
- 1024px: 폭 133~135px · Link customer 잘림
- 세 폭 모두: 다음 줄로 내려가는 버튼 0 · 글자가 두 줄로 나뉘는 경우 0 · Done 전체 폭 처리 없음

## 검증 (로컬)
- vitest 793 pass · 1 file fail (splitview-capture, 원래 있던 것)
- tsc 14 = master 와 같음 · 신규 0
- **lint 5 error 신규** (prettier)
  - split-tender 492·918·922·930
  - SuccessReceiptAnim 184
  - master 는 0 error

## CI (run 44524334197 / Lint 44524334326)
- Lint: 빨강 (위 prettier 5건)
- CI: flow-tests 초록
- assertions: "Install ImageMagick" 단계에서 실패 (7.5분 · 인프라 문제)
- playwright: skip → 결과 없음
- 참고: 기존 e2e `04-order-void-refund` 의 receipt mock 에는 snapshot 이 없어서, 로컬에서는 grand_total undefined 로 페이지가 죽음. 측정할 때는 snapshot 을 넣은 mock 을 따로 씀

push·머지 없음 (fork).
