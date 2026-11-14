docs/runbooks/qris-go-live.md 신규 — QRIS 라이브 전환 런북 8단계 + 위험 목록 작성 완료. PR #136.

## ① 현재 테스트 모드 근거

| 레이어 | 위치 |
|--------|------|
| Railway env | `XENDIT_SECRET_KEY` 값이 `xnd_development_` 접두 |
| 서버 응답 | `api/hooks/pos-payments.ts:96-98` — `test_mode: true` 반환 |
| 버튼 차단 | `api/hooks/pos-qris.ts:62-64` — live 키 환경 서버 403 주석 |
| UI 렌더 | `app/checkout/tender-qris/[draftOrderId].tsx:239` — `isTestMode` 플래그 |

Admin "Payment integrations" 는 storeport(서버)에서만 관리 — 이 앱은 서버 응답의 `test_mode` 필드를 신뢰.

## ⑥ Simulate payment 버튼 라이브 숨김 여부

**안전 — 코드 수정 불필요.**

- `app/checkout/tender-qris/[draftOrderId].tsx:239` 조건 `{isTestMode && !isExpired && currentPaymentRequestId ? <Button>…` — `isTestMode=false` 이면 렌더 차단.
- `api/hooks/pos-qris.ts:62-64` 이중 차단: 서버도 live 키 환경에서 `/qris-simulate` 호출 시 403 반환.
- `__tests__/qris-simulate-bk.test.ts:25` 테스트 케이스 "test_mode=false (live) 면 숨김" 존재.

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/136 (draft · base: master)
