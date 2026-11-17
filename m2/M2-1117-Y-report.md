#345 확인 금액 검증 · 테스트 정정 · mergeable

## 작업 요약

브랜치: `feat/M2-1117-W-net-refund`
커밋: `99eae59`

---

## ① confirmed=true 금액 불일치 거절 구현

**`apps/commerce-core/src/lib/loyalty/preview-recover.ts`**

- `PreviewRecoverResult` 에 `preview_ref: string` 추가 (SHA-256 hex 16자)
  - 해시 입력: `order_id` · `refund_amount` · `tenders(payment_id 정렬)` · `net_refund_amount` · `shortfall`
  - `computePreviewRef()` 내부 헬퍼로 모든 반환 경로에 주입 (`noPoints` + 최종 반환)
- `validatePreviewRef(previewResult, preview_ref, expected_net_refund_amount)` 순수 함수 export
  - `preview_ref` 없거나 `expected_net_refund_amount == null` → `{ ok: false, reason: "missing_fields" }`
  - 불일치 → `{ ok: false, reason: "stale", new_preview }`
  - 일치 → `{ ok: true }`

**`apps/commerce-core/src/api/admin/pos/orders/[id]/refund/route.ts`**

- `RefundBody` 에 `preview_ref?: string` · `expected_net_refund_amount?: number` 추가
- `preview=true` 응답에 `preview_ref` 필드 포함
- `confirmed=true` 분기에 `validatePreviewRef` 호출:
  - `missing_fields` → 400 `{ type: "invalid_data", message: "confirmed=true requires preview_ref and expected_net_refund_amount" }`
  - `stale` → 409 `{ code: "preview_stale", new_preview }` (DB 변경 0, workflow 미호출)
  - `ok` → 기존 환불 실행 경로 그대로 진행
- 하위 호환: `preview=false && confirmed=false` 시 preview 블록 전체 스킵 (기존 경로)

---

## ② §6.1 테스트 첫 케이스 설명·단언 불일치 수정

**`apps/commerce-core/src/lib/loyalty/__tests__/preview-recover.unit.spec.ts`**

기존 `it("earned 10k, used 10k (balance 0), refund 10k → shortfall 10k, net 0")` — 설명은 "shortfall 10k, net 0"이나 단언은 `total=50000` 부분환불 케이스(shortfall 2k, net 8k)로 불일치.

수정:
- `§6.1-1`: `total=refund=10000` 전액환불 → shortfall 10k, net 0 (설명·단언·계획서 §6.1 시나리오 1 일치)
- `§6.1-2`: `total=50000, refund=10000` 부분환불 20% → shortfall 2k, net 8k (기존 단언 계승)
- 두 케이스 모두 `preview_ref` 패턴 검증 추가 (`/^[0-9a-f]{16}$/`)

---

## ③ validatePreviewRef 테스트 추가

`describe("validatePreviewRef")` 5케이스:
1. `preview_ref` 누락 → `missing_fields`
2. `expected_net_refund_amount` 누락 → `missing_fields`
3. `preview_ref` 불일치 → `stale` + `new_preview` 반환
4. `net_refund_amount` 불일치 → `stale`
5. 일치 → `ok: true`

---

## 검증 결과

- TS 신규 에러: 0 (admin JSX 에러는 기존 pre-existing)
- 테스트: 482/482 pass (21 in preview-recover.unit.spec.ts)
- push: `99eae59` → origin/feat/M2-1117-W-net-refund
