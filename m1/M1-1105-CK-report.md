# M1-1105-CK Report

**원천(앱/서버)**: 앱(fork) 렌더 2곳 — 화면(ReceiptCard.tsx) + ESC/POS 프린터(receipt-escpos.ts).
서버는 `reference_no` 원문 그대로 내려줌; 소비 측(앱)에서 처리.

**표시 규칙**: `reference_no.length > 10` → `'…' + 끝 8자리` (예: `…b7c0pfjw`) 한 줄.

**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/144

## 변경 파일
- `lib/printer/escpos.ts` — kv() 안전망: value 단독 cols 초과 시 끝 보존 말줄임
- `lib/printer/receipt-escpos.ts` — QRIS reference_no 호출 시 말줄임 적용
- `components/receipt/ReceiptCard.tsx` — 화면 Ref 줄 동일 말줄임 적용
- `scripts/m2-1105-m-receipt-escpos-assertions.mjs` — CK-1·CK-2·CK-3 테스트 추가

## 테스트
45/45 passed · 0 failed
- CK-1a 모든 줄 ≤ 32자 (단일 QRIS 긴 ref) ✓
- CK-1b 끝 8자리 `b7c0pfjw` 노출 ✓
- CK-1c 원본 긴 ID 미노출 ✓
- CK-2a 모든 줄 ≤ 32자 (CASH+QRIS 나눔) ✓
- CK-3a CARD 승인번호 ≤ 32자 ✓

확인(실기): 아이패드 나눠결제 완료 화면 → Ref …xxxxxxxx 한 줄 · 테두리 안 (미검증 — Kyu 실기 필요)
