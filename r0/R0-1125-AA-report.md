# R0-1125-AA — APPROVE (이전 CHANGES 모두 해소 · CI green · 계약 일치)

## 대상

PR #262 (CuriocityDevAi/agilo-medusa-pos-fork) · 커밋 `c14d3b5` (M3-1125-O)

## 확인 항목

### 1. 이전 지적 해소 여부

| R0-1125-Y 지적 | 해소 여부 |
|----------------|---------|
| Q2 blocking · 소스 순서 확인 → `isTenderFinalComplete` 행동 테스트 | ✅ `lib/tender-cleanup.ts` 순수 함수 추출 + `mockDelete` 호출 시뮬레이션(참·거짓 양 경로) |
| Q3 · `paymentCollectionId ?? ''` 빈 문자열 전달 가능성 | ✅ `if (!paymentCollectionId)` guard 추가 · `?? ''` 폴백 제거 |

스레드: 이전 리뷰는 top-level COMMENTED 리뷰였고 inline 스레드 없음 — resolve 없음.

### 2. navigateToSuccess 소스 순서 검사 — 행동 테스트로 충분한가

삭제 호출이 `navigateToSuccess` 최상단에서 **무조건** 실행(분기 없음)이므로 소스 순서 확인은 충분한 대리 검증. 조건부 경로(`useCreateTender.onSuccess`)는 `isTenderFinalComplete` 행동 테스트로 완전 커버됨. → **허용(acceptable)**.

### 3. 계약 대조 (storeport#438 머지 기준)

#### POST /admin/pos/orders/:id/qris-regenerate

**요청**: `payment_collection_id`(필수) · `previous_payment_request_id`(옵션) — 클라이언트 전송 필드가 서버 필수 필드와 일치 ✅

**응답 — 클라이언트 사용 필드**:

| 필드 | 서버 | 클라이언트 | 일치 |
|------|------|----------|------|
| `payment_request_id` | `string\|null` | `string` | ✅ |
| `qr_string` | `string\|null` | `string` | ✅ |
| `expires_at` | `string\|null` | `string` | ✅ |

> ⚠️ **non-fatal 불일치**: 클라이언트가 Xendit `pr_...` ID를 `previous_payment_request_id`로 전송하지만 서버는 Medusa `payment_sessions[].id`(`payses_...`)와 비교 → 매치 안 됨 → 옛 세션 EXPIRED 마킹 누락. Regenerate 자체는 작동.

#### GET /admin/pos/orders/:id/qris-pending (#438 신규)

#262에서 미사용. 409 이어하기 경로는 `order.metadata.tenders` 스캔으로 구현 — 기능 동작하나 `qris-pending` endpoint가 더 명시적. 별도 follow-up.

#### POST /admin/pos/orders/:id/qris-cancel (#438 신규)

#262에서 UI 주석 처리 중 — 서버 준비 완료되었으므로 다음 PR에서 활성화 가능.

### 4. CI

커밋 `c14d3b5` 기준 전 항목 green: `playwright` · `unit-tests` · `flow-tests` · `assertions` · `lint` · `route`(×2) ✅ · `heavy-cloud` SKIPPED(정상).

## 액션

- PR #262에 계약 대조표 댓글 첨부 (issuecomment-7156672295)
- COMMENT 리뷰로 APPROVE 제출
- 해결된 inline 스레드 없음
