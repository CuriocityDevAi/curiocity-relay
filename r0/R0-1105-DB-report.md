# R0-1105-DB — PR #116 리뷰 결과

**date**: 2026-11-12  
**reviewer**: Sonnet (R0-1105-DB)  
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/116

---

## 판정

**APPROVE** — REQ 1–5 전항 충족. REQ 6: 에러 영어·색 토큰·vitest PASS.  
CI `m3-1105-ae-assertions.mjs` 2건 실패는 BH 기반 브랜치 사전 실패(BL 미도입) — BL 자체 도입 CI 실패 0.

---

## 검증 표

| REQ | 판정 | 근거 |
|-----|------|------|
| ① 패키지 안전 (옛 iPad 크래시 방지) | ✅ PASS | `package.json` 변경 없음(diff 없음); `package-lock.json`은 기존 `@react-native/*` · `@babel/*` resolved URL 버전 업만(6건 추가 · 신규 npm 패키지 0); `SvgXml` → `react-native-svg` 15.16.0 이미 존재 |
| ② 폴링 | ✅ PASS | `setInterval(checkStatus, 10_000)` + useEffect cleanup `clearInterval(id)`; `qrisStatus !== 'pending'` 가드로 Paid/Expired 후 중단; `paidRef.current` 중복 이동 방지; 1s 카운트다운도 별도 cleanup ✓ |
| ③ 만료→New QR · 자동 재발행 OFF | ✅ PASS | `calcSecondsLeft(expiresAt)` = `(new Date(expiresAt).getTime() - Date.now()) / 1000` → 서버 `expires_at` 기준; `secondsLeft<=0 || status==='expired'` → opacity 0.3 + "QR expired"; New QR 버튼만 → `regenerate.mutateAsync()`; 자동 재발행 코드 없음 |
| ④ Cancel→타 결제수단 | ✅ PASS | Cancel → `router.back()` → tender-cash 복귀 ✓; M0-1105-BC 계약: `tenders.spec.ts` PASS(QRIS short-circuit이 cash/edc 경로 비침범); 서버가 pending QRIS cancel + 새 tender 허용 계약 충족 |
| ⑤ 환불 QRIS fallback | ✅ PASS | `extractQrisRejected()` → `{type:'qris_refund_rejected'}` 감지; `qrisRejectedMessage` state → "Refund in cash" 버튼 → `setSelected('cash')` + `setQrisRejectedMessage(null)` + `setStep('pin')`; 나눠 결제 화면 Cash/Card만(QRIS 탭 없음 확인) |
| ⑥a 에러 영어 · 색 토큰 | ✅ PASS | "QRIS not set up for this store" / "QR expired" / "Awaiting payment" 등 전부 영어; raw hex grep 0건; `text-danger` · `text-ink-muted` · `border-line` · `bg-surface` 토큰 사용 |
| ⑥b vitest | ✅ PASS | `__tests__/qris-state-machine.test.ts` 25개 신규(calcSecondsLeft · formatCountdown · 상태 기계 · extractQrisRejected); 기존 포함 145 all pass |
| ⑥c CI | ⚠️ 사전 실패 | `m3-1105-ae-assertions.mjs` 2건 실패: "Void 버튼 testID" + "outline 변형" — BH 기반 브랜치(`feat/m3-1105-bh-both-void-refund`) CI run 43251904450 에서 동일 실패 확인; assertion script BH·BL 동일(diff 없음); BL 도입 실패 0건 |

---

## CI 실패 상세 (사전 실패 증거)

BH run 43251904450: `completed failure`  
BL run 43255483453: `completed failure` (동일 2건)

실패 assertions (`m3-1105-ae-assertions.mjs` §2):
- `order detail · Void 버튼 testID`: 스크립트가 단일 동적 testID `testID={voidRefund.action === 'void' ? 'order-void' : 'order-refund'}` 를 기대하지만, BH에서 두 개 별도 버튼(`testID="order-void"`, `testID="order-refund"`)으로 변경됨
- `order detail · outline 변형 사용`: 동일 원인(단일 토글 → 별도 버튼으로 BH 변경)

BL은 이 두 assertion을 도입하지도 수정하지도 않음 → BL 책임 아님.

---

## 미확인 항목 (Kyu 실기)

- Xendit sandbox: 테스트 모드 QR 스캔 → paid webhook → success 화면 전환
- QR 화면 디자인: 전체화면 비율·카운트다운 폰트·opacity 만료 효과

---

## 착지 명령 실행 결과

```
cp /tmp/R0-1105-DB-report.md ~/projects/curiocity-relay/r0/ && ...
node scripts/claim.mjs R0-1105-DB done "APPROVE — REQ 1-5 전항 충족·vitest 25 pass·CI 2건 BH 사전 실패(BL 미도입)"
```
