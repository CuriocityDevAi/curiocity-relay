#345 APPROVE · 문제 0건

## 리뷰어: R0 (re-review R0-1117-AJ CHANGES 2건 반영 확인)

---

## R0-1117-AJ CHANGES 해결 확인

### ✅ 문제 1 (blocking) — `confirmed=true` 금액 불일치 거절 미구현 → 해결

`preview_ref?: string` + `expected_net_refund_amount?: number` 가 `RefundBody` 에 추가됨.  
`validatePreviewRef()` 순수 함수 신설 (`preview-recover.ts`):
- `preview_ref` 또는 `expected_net_refund_amount` 누락 → `missing_fields` → route 에서 **400** 반환 ✅  
- `preview_ref` 불일치 또는 금액 불일치 → `stale` → route 에서 **409 `code: "preview_stale"`** 반환 ✅  
- 모든 validation 실패 경로는 `return;` (early exit) → DB 변경 0 보장 ✅  
- `body.preview`/`body.confirmed` 모두 없으면 기존 로직 그대로 → 하위 호환 ✅

`preview_ref` = SHA-256(input + result 슬라이스 16자) deterministic → preview→confirmed 사이 잔액 변화 시 hash 재불일치 → 409 올바름.

### ✅ 문제 2 (minor) — §6.1 테스트 description-assertion 불일치 → 해결

`describe("§6.1 현금 전액환불")` 가 두 케이스로 분리:
- `§6.1-1`: `total: 10000`, shortfall 10000, net 0 → description 일치 ✅  
- `§6.1-2`: `total: 50000`, shortfall 2000, net 8000 → description 일치 ✅

---

## REQ 체크리스트

### REQ 1 — preview_ref + expected_net_refund_amount 검증
| 항목 | 결과 |
|------|------|
| 필드 누락 → 400 | ✅ `validatePreviewRef` → `missing_fields` → `res.status(400)` |
| 금액/ref 불일치 → 409 `preview_stale` | ✅ `stale` → `res.status(409).json({ code: "preview_stale", new_preview })` |
| 검증 실패 시 DB 변경 0 | ✅ early return (workflow 호출 이전) |
| 하위 호환 | ✅ `isPreview || isConfirmed` 블록 밖은 기존 로직 |

### REQ 2 — 테스트
| 항목 | 결과 |
|------|------|
| preview-recover 단위 테스트 | ✅ 21/21 passed |
| pos-refund workflow 테스트 | ✅ 13/13 passed |
| 전체 테스트 | ✅ 482/482 passed |
| tsc 신규 에러 | ✅ 0건 (기존 245건 동일, PR 신규 파일 에러 없음) |
| 테스트 설명·단언 일치 | ✅ 모든 describe/it 제목 계산값 일치 확인 |

---

## 긍정 사항
- `validatePreviewRef` 순수 함수 분리 → 테스트 용이, 사이드이펙트 없음  
- `preview_ref` SHA-256 해시 deterministic 설계 → 잔액 변화 감지 자동화  
- `confirmed=true` + shortfall=0 경우도 동일 경로로 처리 (일관성)  
- `effectiveHasQris` / `effectiveMatched` 적용 범위 정확
