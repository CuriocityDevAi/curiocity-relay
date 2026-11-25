# R0-1125-AE 리포트

#442 resolve 완료 · #441 APPROVE · #265 APPROVE

## #442 — 블로커 스레드 resolve + APPROVE COMMENT

- 스레드 `PRRT_kwDOTe-UYs67z_Sl` → GraphQL `resolveReviewThread` → `isResolved: true` 확인.
- 커밋 `9884684` (M1-1125-R) 확인: `fix(dockerfile): runtime WORKDIR /app/.medusa/server 복원`. PR #442 헤드 커밋이자 Option A 그대로 반영. SSH 스크립트 경로 일치.
- APPROVE COMMENT (`PRR_kwDOTe-UYs8AAAABaOkJEw`) 추가 — 블로커 없음, 머지 가능.

## #441 (storeport) — qris-regenerate pr_... ID 매칭 + 돈 안전

**판정: APPROVE**

| 항목 | 결과 |
|------|------|
| `pr_...` → `session.data.payment_request_id` 매칭 | PASS — 기존 `s.id` 비교는 payses_... vs pr_... 로 항상 실패, 정확히 수정 |
| PAID/CAPTURED/SUCCEEDED → 409 거절 | PASS — EXPIRED 마킹 전 선체크, 위치 올바름 |
| 웹훅 경합(만료 직후 옛 QR 결제 도착) | 낙관적 체크 — 체크~EXPIRED 마킹 사이 짧은 창 존재. Xendit PR idempotency 가 최종 방어선. 현 구조에서 최선. |
| 행동 테스트 7건 | PASS — pr_... 매칭·PAID/SUCCEEDED 409·captured 409·first-session fallback 커버 |
| CI | PASS — pnpm test 737 passed |

## #265 (fork) — 409 이어하기 qris-pending 전환

**판정: APPROVE**

계약표 대조:

| 필드 | 서버 타입 | POS 타입 | 판정 |
|------|-----------|----------|------|
| `status` | `'pending'|'none'` | 동일 | OK |
| `qr_string` | `string|null` | `string` | OK — 서버가 qr_string 없으면 candidate 제외하므로 실질 null 없음 |
| `payment_collection_id` | `string` | `string` | OK |
| `payment_session_id` | `string` | `string` | OK (미사용) |
| `payment_request_id` | `string|null` | `string` | OK — `&& pendingRes.payment_request_id` null-guard로 런타임 안전. 경미한 타입 불일치. |
| `expires_at` | `string|null` | `string|null` | OK |
| `amount` | `number|null` | `number|null` | OK (미사용) |

행동 테스트 4건 (simulateResume: pending→resume, paid→success, none→error, throw→error) — PASS. CI all pass.
