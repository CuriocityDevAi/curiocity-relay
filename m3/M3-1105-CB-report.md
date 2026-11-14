# M3-1105-CB 착지 리포트

**결과 한 줄**: #134 REQ1~4 전항목 구현 확인 · 보완 커밋 없음 · CI assertions/flow-tests/playwright 3종 all pass · PR 본문 대사 표·CI 결과·Kyu 확인 항목 7종·Xendit 재현 방법 명세 업데이트 완료

**head SHA**: bd87d24bbfe51f99543bbc1b0676cfb80869f9ea

**이연 순증감**: CB 처리 완료 · 이연 없음

---

## §1 REQ 대사

| REQ | 항목 | 파일:줄 | 결과 |
|-----|------|---------|------|
| REQ1 | split 1차 QRIS 탭 | split-tender/[draftOrderId].tsx:483-490 | ✅ |
| REQ1 | split 2차 QRIS 탭 | split-tender/[draftOrderId].tsx:645-653 | ✅ |
| REQ1 | 2차 QRIS 금액 = remaining 자동 | split-tender/[draftOrderId].tsx:324 | ✅ |
| REQ1 | 1차 QRIS 대기 중 비활성 + 안내 | split-tender/[draftOrderId].tsx:549-577 | ✅ |
| REQ1 | 409 qris_pending_cannot_split_next 토스트 | split-tender/[draftOrderId].tsx:171-176 | ✅ |
| REQ1 | 1차 QRIS 취소(만료/실패 재선택) | split-tender/[draftOrderId].tsx:275-279 | ✅ |
| REQ2 | "Retry QRIS refund" 버튼 (mode=retry) | RefundRetrySheet.tsx:236-244 | ✅ |
| REQ2 | "Give cash instead" 버튼 (mode=cash_fallback) | RefundRetrySheet.tsx:245-253 | ✅ |
| REQ2 | 매니저 PIN 입력 | RefundRetrySheet.tsx:192-215 | ✅ |
| REQ2 | 성공 시 서랍 열림 안내 + 금액 | RefundRetrySheet.tsx:120-134 | ✅ |
| REQ2 | xendit_refund_still_pending 메시지 | RefundRetrySheet.tsx:57 | ✅ |
| REQ2 | cash_fallback_blocked_by_succeeded_xendit 메시지 | RefundRetrySheet.tsx:58 | ✅ |
| REQ2 | cash_fallback_requires_pin (PIN 오류 경로) | RefundRetrySheet.tsx:144-162 | ✅ |
| REQ2 | cash_fallback_no_failed_qris 메시지 | RefundRetrySheet.tsx:59 | ✅ |
| REQ2 | 단일 QRIS 주문 포함 (hasQrisFailed) | RefundRetrySheet.tsx:81 | ✅ |
| REQ3 | succeeded_via_cash → "Refunded in cash (QRIS failed)" | RefundRetrySheet.tsx:120-126 | ✅ |
| REQ4 | tests/flows/m3-1105-ca.test.ts (8 describe, 125 assertions) | tests/flows/m3-1105-ca.test.ts | ✅ |

**보완 커밋**: 없음 — 전항목 기존 3개 커밋(202f701 · 1a63dbb · bd87d24)에 완비

---

## §2 CI 결과 (run 43557478967 · head bd87d24)

| Job | 결과 |
|-----|------|
| assertions | ✅ pass (1m 59s) |
| flow-tests | ✅ pass (48s) |
| playwright | ✅ pass (15m 5s) |

> lint: CI에 별도 job 없음. BZ 브랜치와 동일한 11개 경고(Array\<T\> 8개 · set-state-in-effect 2개 · require() 1개) — CA에서 신규 경고 없음 확인.

> 로컬 추가 확인: `npx vitest run tests/flows/` → 8 files, 119 passed, 6 expected fail (125 total)

---

## §3 Kyu 확인 항목 (계획서 §6-1 실기 7종)

1. **아이패드 split 1차 QRIS**: Split 선택 → QRIS 탭 → 금액 입력 → Pay with QRIS → tender-qris 화면 이동 (isSplitFirst=1) → Simulate payment → split 2차 화면 자동 전환
2. **아이패드 split 2차 QRIS**: 2차 QRIS 선택 → Pay with QRIS → tender-qris → Simulate payment → 성공 화면
3. **아이패드 split 1차 QRIS 취소(대기)**: tender-qris Cancel → split 화면 "QRIS payment is pending" 배너 · Return to QR / Cancel QRIS 버튼
4. **아이패드 QRIS 환불 실패 Retry**: 주문 상세 환불 불완전 배너 → "Retry QRIS refund" → PIN → 성공 토스트
5. **아이패드 QRIS 환불 실패 Cash Fallback**: "Give cash instead" → PIN → "Refunded in cash (QRIS failed)" 토스트 + 서랍 열림 안내
6. **에러 코드 토스트**: xendit_refund_still_pending → "QRIS refund is still being processed" / cash_fallback_blocked_by_succeeded_xendit → "QRIS refund succeeded — do not give cash"
7. **단일 QRIS 주문 환불 실패**: 단일 QRIS 주문 → 환불 → 실패 시 같은 2버튼 UI 확인

### 환불 실패(Xendit refund FAILED) 재현 방법

Xendit 테스트 모드에서 refund FAILED 상태를 직접 트리거하는 공식 UI 없음.
- **서버 측 fixture 주입**: storeport에서 테스트용 엔드포인트 또는 직접 DB row를 partial_failed 상태로 삽입 후 앱에서 `/refund-status` 조회 → 환불 불완전 배너 확인.
- **fixture 기반 flow-tests로만 검증** (현재 채택): `m3-1105-ca.test.ts`의 `cashFallback200` / `qrisErrors` fixture가 실제 Xendit 응답 계약을 대사. **앱 UI 계약은 서버 통합 테스트로만 검증.**

---

**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/134
