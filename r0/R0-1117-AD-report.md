#340 APPROVE · #339 APPROVE

## #340 — M0-1117-K 장바구니 담기 oneshot

verdict: **APPROVE**
(GitHub: 자기 계정 제한으로 COMMENT 이벤트로 제출)

### REQ 체크
| 항목 | 결과 |
|------|------|
| 코어 workflow 재사용 (직접 SQL 없음) | ✅ `@medusajs/core-flows` 5개 workflow 만 사용 |
| 남은 편집 세션 정리 | ✅ `runBeginWithRecovery`: `already\|pending\|existing\|in-progress\|order_change` 패턴 → cancel 후 1회 재시도 |
| 실패 롤백 | ✅ `applyChanges` 예외 → `cancelDraftOrderEditWorkflow`, 원 오류 그대로 400 반환 |
| 동시 2 요청 | ✅ `Promise.all` 테스트: begin×2 / add×2 / confirm×2, cancel 0 |
| POS 인증 동일 | ✅ `req.auth_context?.actor_id` — Medusa 미들웨어 체계 그대로 |
| 응답 subtotal/tax_total/total | ✅ `readOrderSnapshot` QUERY 조회 + `toNum()` BigInt 대응 |
| 테스트 | ✅ unit 8건 · perf 1건 전부 통과 (로컬 확인) |

### 후속 코멘트 (CHANGES 아님)
`runBeginWithRecovery` · `applyChanges` 오케스트레이션 로직이 `route.ts` 인라인 → 추후 `lib/pos/draft-order-items.ts` 또는 커스텀 workflow step 으로 분리 권장. 인라인 코멘트로 첨부 완료.

---

## #339 — M2-1117-R S7 redeem block

verdict: **APPROVE**

### REQ 체크
| 항목 | 결과 |
|------|------|
| effective_balance 계산 | ✅ `effectiveBalance = Math.max(0, creditBalance - negativeBalance)` |
| 서버 가드(앱 우회 불가) | ✅ `receipt-preview` 서버 로직에서 `creditUsed > effectiveBalance` 직접 cap |
| loyalty-info route 가드 | ✅ `LOYALTY_NEGATIVE_MODULE.getBalance()` → `redeem_blocked` / `available_use` 반환; 모듈 미등록 graceful fallback |
| 빚 0 회귀 | ✅ `negative_balance=0` 미지정/명시 2케이스 → 기존 동작 유지 |
| 금지 파일 미변경 | ✅ 3파일(`loyalty-info/route.ts`, `receipt-preview.ts`, 신규 spec) — 허용 범위 |
| 테스트 | ✅ 신규 7건 전부 통과 (로컬 확인) |

---

테스트 실행 환경: `M0-1117-K-wt` (feat/M0-1117-K-pos-cart-items-oneshot) · `hub-m2` (feat/M2-1117-R-redeem-block)
실행일시: 2026-11-17
