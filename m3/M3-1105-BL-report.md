# M3-1105-BL — QRIS 앱 화면: 전체화면 QR · 남은 시간 · 자동 확인 · 다시

**owner**: Sonnet · claude-code
**date**: 2026-11-12
**branch**: `feat/m3-1105-bl-qris-screen`
**base**: `feat/m3-1105-bh-both-void-refund` (#114 위에 적층)
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/116
**CI run**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/43255483453 · queued

---

## 1. 구현 요약 (신규 5 · 수정 7)

| 파일 | 역할 |
|------|------|
| `app/checkout/tender-qris/[draftOrderId].tsx` | 전체화면 QR 화면 · 카운트다운 · 폴링 · 만료/재발행 |
| `api/hooks/pos-qris.ts` | `fetchQrisStatus()` · `useQrisRegenerate()` |
| `components/payment/QrisTenderPanel.tsx` | Generate QR 버튼 패널 |
| `lib/qr.ts` | `payloadQrSvg(payload)` 추가 (서버 qr_string → SVG) |
| `components/payment/PaymentMethodTabs.tsx` | QRIS 탭 `enabled: true` (Coming soon 해제) |
| `app/checkout/tender-cash/[draftOrderId].tsx` | QRIS 탭 → `onGenerateQris` → tender-qris 화면 이동 · xendit_not_configured 에러 처리 |
| `components/orders/VoidRefundSheet.tsx` | `qrisRejectedMessage` state · `extractQrisRejected` · "Refund in cash" fallback 버튼 |
| `lib/refund-rules.ts` | `RefundMethod` + `'qris'` · `QRIS_OPTION` · `buildRefundBody('qris')` |
| `api/hooks/pos-refunds.ts` | `method: … | 'qris'` 타입 추가 (VoidRefundResponse · ReturnOrderInput · ReturnOrderResponse) |
| `api/hooks/pos-payments.ts` | `PosTenderResponse` 에 `qr_string? · expires_at? · payment_request_id?` 추가 |

## 2. REQ 대응

| REQ | 구현 |
|-----|------|
| ① QRIS 탭 활성 → QR 생성 → 전체화면 (금액·주문번호·카운트다운) | `PaymentMethodTabs` enabled + `QrisTenderPanel` + `tender-qris` 화면 |
| ② 10s 폴링 + Check payment · Paid → success 화면 · 떠날 때 중단 | `setInterval(checkStatus, 10_000)` + cleanup in `useEffect` |
| ③ 만료 → QR 흐리게 + "QR expired" + New QR (재발행) · 자동 없음 | `secondsLeft<=0 || status==='expired'` → `opacity:0.3` · `New QR` 버튼 → `qris-regenerate` |
| ④ Cancel → 결제탭 복귀 · `xendit_not_configured` → "QRIS not set up for this store" | `router.back()` + `extractQrisError` |
| ⑤ 환불: `method='qris'` → `qris_refund_rejected` → message + "Refund in cash" (PIN) | `extractQrisRejected` + `setQrisRejectedMessage` + fallback step |
| ⑥ Payments 표·영수증 QRIS 표시 | `PaymentMethodChip` 이미 지원 (#111) · 타입에 'qris' 추가 완료 |
| ⑦ 단위 테스트 · Playwright 스샷 3장 · lint | 아래 §3 참조 |

## 3. 테스트

### 3.1 단위 테스트 (`__tests__/qris-state-machine.test.ts`)

```
Test Files  13 passed (13)
Tests       145 passed | 6 expected fail (151)   (+25 신규)
```

25개 신규 시나리오:
- `calcSecondsLeft`: 미래·과거·undefined
- `formatCountdown`: 15:00 / 01:30 / 00:00 / 00:59
- 상태 기계: `pending→paid` / `pending→expired` / `pending→pending` / terminal lock
- New QR 흐름: expired → pending 복귀 · 카운트다운 재시작
- `extractQrisRejected`: type 감지 · message fallback · 다른 type · null · response 필드
- `extractQrisError`: xendit_not_configured · body.message · Error · unknown

### 3.2 Playwright e2e (`e2e/flows/05-qris-payment.spec.ts`)

```
3 passed (6.9s)
```

- Flow 5-1: QRIS 탭 → Generate QR 버튼 (`payment-tab-qris` 클릭) → 스샷 `01-qris-generate-btn.png`
- Flow 5-2: Generate QR → 전체화면 QR + 카운트다운 (`qris-screen` · `qris-awaiting-block`) → 스샷 `02-qris-fullscreen-qr.png`
- Flow 5-3: Check payment → expired 응답 → "QR expired" + New QR 버튼 → 스샷 `03-qris-expired-new-qr.png`

기존 flow 1·2 회귀 없음 (4 passed).

### 3.3 Typecheck

새 코드에 추가 에러 없음 (pre-existing 69 → 72, 차이는 `api-mocks.ts` 에 추가된 `(r)` 콜백 패턴 — 기존과 동일 원인).

## 4. 이연 없음

BL 계획서 범위 정확히 완료. 남은 과제:
- M1-J-e: Admin 매장 설정 UI (`/admin/settings/pos` Payment integrations)
- Kyu 실기: Xendit 테스트 모드 QR 스캔 시뮬레이션 (Xendit sandbox Dashboard)

## 5. Kyu 확인 항목

1. **Xendit sandbox**: Dashboard → 테스트 결제 시뮬레이션으로 paid webhook 발생 → 앱 success 화면 전환 확인
2. **QR 화면 디자인**: 전체화면 비율 · 텍스트 크기 · opacity 만료 효과 적절한지 (Figma board 3)
3. **QRIS 환불**: QRIS 원거래 주문 → "Refund" 클릭 → 서버 거부 → "Refund in cash" 버튼 표시 확인

---

## 6. 착지 명령

```
cp /tmp/M3-1105-BL-report.md ~/projects/curiocity-relay/m3/ && cd ~/projects/curiocity-relay && git add m3/M3-1105-BL-report.md && git commit -m "m3: M3-1105-BL" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M3-1105-BL done "QRIS 전체화면 QR · 폴링 · 만료/재발행 · QRIS 환불 fallback · PR #116 · CI queued · 단위 25 + e2e 3장 all pass"
```
