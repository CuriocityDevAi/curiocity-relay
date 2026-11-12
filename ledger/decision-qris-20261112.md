# QRIS (Xendit) 결정 — Kyu 2026-11-12 16:26 WIB "전부 추천대로"

계획서: storeport docs/epics/pos-qris-xendit.md (#227 · a8d76a6) · relay m0/M0-1105-BA-report.md

1. QR 유효시간 = **15분**
2. 만료 후 자동 재발행 = **OFF** (캐셔가 "다시" 눌러 새 QR)
3. 매장별 자격증명 입력 UI = **/admin/settings/pos 안 "Payment integrations" 섹션**
4. Soopsok 테스트 자격증명 = **env fallback 으로 시작** · 라이브 전환 때 매장 설정으로 이관

오케 기술 결정: env 키 이름은 `XENDIT_API_KEY` 우선, 없으면 `XENDIT_SECRET_KEY` 도 읽음(Kyu 가 Railway 에 `XENDIT_SECRET_KEY` 로 넣음 — 이름 바꾸라고 하지 않음).
선행 Kyu 대시보드 작업(콜백 URL 등록 · webhook token → Railway `XENDIT_WEBHOOK_TOKEN`)은 M0-1105-BC 가 **실제 라우트 경로를 확정한 뒤** 오케가 클릭 단위로 안내.
정정 대상: meros-payment-flow-spec-v0 §6 "QRIS 환불 불가" → "7일 내 API 환불 가능 · 부분 환불 불가 발급사(GoPay 등)·실패 시 현금 + 매니저 PIN".
