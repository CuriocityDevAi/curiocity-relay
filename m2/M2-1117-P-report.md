PR #336 · 라운드 8개 · 재사용 10/신규 13 · Kyu 질문 3

## 결과 요약

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/336
- **파일**: `docs/plans/wing-careagent-plan.md` (366줄 신규)
- **브랜치**: `docs/M2-1117-P-wing-careagent-plan`

## Kyu 원문 추적

- W4 "QRIS 중복 개발 금지" — relay ledger 원문 그대로 인용
- 기존 문서에서 QRIS 명시 원문: `못 찾음` — STOREPORT-ROADMAP.md Phase 1b "Medusa cart 소비"가 최근접. 이번 relay 결정이 최초 명문화.

## 손님 여정 tap 수

WA 첫 메시지 포함 **6 tap** · 로그인/회원가입 없음

## 재사용 / 신규 대사표 요약

**재사용 10건** (수정 없음 or 최소):
payment_xendit, Xendit webhook, phone-id, findCustomersByPhone, loyalty earn, receipt module, pos_settings.wa_enabled, tryXenditRefund, pickup_slot module, Medusa cart/product/payment API

**신규 13건**:
Wing 카탈로그/랜딩/체크아웃/QRIS UI/주문조회, CC wing store API, CA link_token API, CA D1 스키마, CA webhook 검증, CA XState 대화 엔진, CA LLM 의도, CA 도구 함수, 주문 귀속 웹훅

## Kyu 결정 3개

- KD-1: 픽업 슬롯 UX — 버튼 목록(b) 권장
- KD-2: LLM 모델 — Claude Haiku(a) 권장 (저비용 · 의도 분류 충분)
- KD-3: WA 결제 확인 — 자동 발송(a) 권장

## 라운드 8개

R0-서버 · R1-CA · R2-Wing · R3-Wing · R4-CA · R5-CA · R6-서버 · R7-서버+Wing
