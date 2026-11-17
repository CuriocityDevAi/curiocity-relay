PR #329 · 테스트 통과

# M0-1117-G — QRIS Simulate 환불 모의 성공 + 계산원 UI code

## 체결 사실
- **PR**: https://github.com/CuriocityDevAi/storeport/pull/329
- **브랜치**: `fix/m0-1117-g-xendit-simulate-refund` (push 완료 · base = main @2e15c52)
- **테스트**: `pnpm test` 27 suites / 374 tests / 전부 pass · `tsc --noEmit` 에러 0 (pre-push hook 실측).
- 신규 단위 테스트 1종: `src/api/admin/pos/_shared/__tests__/xendit-refund-simulate.unit.spec.ts` (8 케이스 = simulate 성공 · session fallback · live-key prod 안전장치 · 실 QR 스캔 캡처 live-path · 500 err code · REFUND_NOT_SUPPORTED code · missing_request_id code · not_configured code).

## 수정 요약
- `apps/commerce-core/src/api/admin/pos/_shared/xendit-refund.ts` — simulate 분기 (test key + simulate 마커 → Xendit skip · `simulated_refund:true`) · 모든 fallback 에 `code: XenditRefundUiCode` 추가 · creds 리졸버 DI (`__credsResolver`).
- `apps/commerce-core/src/api/admin/pos/orders/[id]/qris-simulate/route.ts` — Xendit simulate 호출 **직전** `jsonb_set(data,'{simulated_at}',…)` 로 세션에 마커 심기 (webhook capture 가 session.data → payment.data 로 복사). 마커 UPDATE 실패는 비치명 로그.
- `apps/commerce-core/src/api/admin/pos/orders/[id]/refund/route.ts` — 400 `qris_refund_rejected` 응답에 `code` 포함 · `order.metadata.refund.tenders[].xendit.simulated_refund` 감사 보존 · 응답 `xendit_refund.simulated_refund` 노출.

## 이중 조건 (운영 안전)
1. `creds.mode === "test"` — secret key prefix `xnd_development_`. 운영 (`xnd_production_`) 은 절대 true 안 됨.
2. `payment.data.simulated_at` **또는** `session.data.simulated_at` 마커 — simulate 라우트가 Xendit 호출 전에만 심음. 실 QR 스캔 캡처에는 없음.

둘 다 충족해야 Xendit skip. live key + simulate 마커 조합이라도 Xendit refund 경로 그대로 (테스트 (b) 로 검증).

## code 매트릭스 (fork UI 매핑용)
| 상황 | code |
|---|---|
| 정상 Xendit 성공 | `qris_refund_ok` |
| test + simulate 모의 성공 | `qris_refund_simulated` |
| 7일 window 초과 | `qris_refund_window_exceeded` |
| Xendit throw · REFUND_NOT_SUPPORTED/PERIOD_EXCEEDED 패턴 | `qris_refund_unsupported` |
| 발급사 partial 미지원 | `qris_refund_partial_unsupported` |
| 미설정 (secret_key 없음) | `qris_refund_not_configured` |
| payment_request_id 결여 | `qris_refund_missing_request_id` |
| 그 외 Xendit 실패 | `qris_refund_failed` |

`failure_code` 는 Xendit 원 코드 (가변) 그대로 보존 — 로그 용. 계산원 UI 는 `code` 매핑.

## 미검증 (사용자 실기 필요)
- iPad 실기 QC: Cash 50,000 + QRIS(Simulate) 주문 → Orders → Refund 전액 → PIN → 성공 토스트 · 서랍 열림 · QRIS 상태 Succeeded(모의) 전환.
- 운영 모드 (prod key) 로 실 Xendit refund path 회귀 (CI 는 mock 으로 커버 · 실 Xendit 호출은 금지).

## 기술 선택지 권장안
- 지금 PR = 최소 침습 (xendit-refund + qris-simulate 마커 + refund/route code 전파). 다른 두 호출자 (`/return`, `/refund-retry`) 는 ok=true success 를 그대로 받아 흐름 통과 — simulate 환불도 자동 커버. 추후 `/return` · `/refund-retry` 라우트의 400 응답에도 `code` 전파하면 fork UI 일관성 상승 (비필수 · 범위 밖).
- UI (Admin fork) 쪽 과제: `qris_refund_rejected` 400 수신 시 code 로 토스트 문구 분기 + `cash_fallback` 자동 유도 (M2-1117-K 옵션 B · 다음 티켓 권장).

## PR 본문 3줄
- Xendit Simulate (test) 결제 환불 불가 → 테스트 모드 + simulate 마커 이중 조건 충족 시 Xendit 호출 없이 모의 환불 성공 (운영 key 는 절대 미동작).
- 모든 환불 실패 응답에 안정 UI code (`qris_refund_*`) 추가해 계산원 토스트 선택 가능하게 함.
- `simulated_refund:true` 감사 flag 를 order metadata · 응답에 보존.

## 이연 순증감
- **+1** 다음 티켓: Admin fork UI 가 `qris_refund_rejected.code` 로 토스트 분기 + cash_fallback 자동 호출 (M2-1117-K §5 옵션 B).
