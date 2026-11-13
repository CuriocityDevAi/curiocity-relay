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
