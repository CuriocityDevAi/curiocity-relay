# Kyu 결정 — 나눠 결제 + QRIS · QRIS 환불 실패 처리 (2026-11-13 08:25 WIB)

## Kyu 원문
"1. B
2. C"

## 오케가 제시한 선택지 (08:19 설명)
1. 나눠 결제에 QRIS 섞기 — A 막아 둠 / **B 허용 + 환불 시 QRIS 몫은 손님 QRIS 앱으로(Xendit refund)** / C 허용 + QRIS 몫 현금+PIN 환불. (오케 추천 A)
2. QRIS 환불 실패 시 — A 같은 버튼으로 Xendit 재요청 / B 현금+매니저 PIN / **C 버튼 2개: "다시 시도"(Xendit 재요청) + "현금으로 돌려주기"(매니저 PIN · 서랍 · Cash Movement)**. (오케 추천 C)

## 결정
- **1 = B**: 나눠 결제(최대 2 tender · decision-p6-split-20261111 S1~S4 유지)에 QRIS 허용. 현 서버 가드 `qris_split_not_supported`(tenders/route.ts) 해제. 환불 시 QRIS 몫 = Xendit refund(손님 앱으로). 환불 순서 S3(CASH → QRIS → CARD) 유지. 11-10 규칙 "QRIS 원거래 → 현금 환불"은 이번 결정으로 **나눠 결제 QRIS 몫에 한해 Xendit refund 로 대체**(단일 QRIS 주문은 이미 M0-1105-BD 로 Xendit refund).
- **2 = C**: QRIS 환불 실패(Xendit refund.failed 웹훅 · 현재 `qris_refund_failed` 플래그만) 시 주문 상세의 "Retry remaining refund" 흐름에 QRIS 몫 두 버튼 — ① 다시 시도(Xendit 재요청 · 멱등) ② 현금으로 돌려주기(매니저 PIN · 서랍 열림 · Cash Movement −금액). 단일 QRIS 주문 · 나눠 결제 QRIS 몫 둘 다 적용.
- 실제 돈 검증은 Xendit 라이브(KYC) 뒤 · 지금은 테스트 모드.

## 순서 (오케)
QRIS 웹훅 claim 500 수정(M0-1105-BN) 머지 → QRIS 테스트 결제 실기 통과 → 서버(M0: 결제 허용 + 환불 + retry 확장) 계획서 먼저(큰 라운드) → 앱(M3) → R0 → Kyu "머지해"(돈 PR) → 실기.

## 계획서(storeport #246 · M0-1105-BQ) 열린 질문 Q1~Q7 — Kyu 21:28 원문 "추천대로."
- Q1 1차 QRIS PENDING 중 2차 tender → 409 거부(qris_pending_cannot_split_next)
- Q2 split 양쪽 QRIS 허용
- Q3 cash_fallback 뒤 늦은 Xendit SUCCEEDED → 자동 교정 금지 · 로그만(사람 처리)
- Q4 cash_fallback 영수증 kind → 기존 helper(resolveRefundReceiptKind) 유지
- Q5 7일 window 임박 알림 → R4 별도(이번 범위 밖)
- Q6 실패 tender 는 2개 한도에서 처음부터 제외
- Q7 split 한쪽 QRIS 7일 초과 → 다른 몫만 환불(기존 동작)
- 순서: QRIS 기본 결제 실기 통과(M0-1105-BR → 수정) 뒤 R1(서버 split 가드 해제) → R2(refund-retry 확장) → R3(앱 UI) → R4(선택)
