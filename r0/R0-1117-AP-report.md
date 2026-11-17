#347 APPROVE · 문제 0건

## R0-1117-AP 리뷰 결과

검토일: 2026-11-17  브랜치: feat/M0-1117-O-void-net  커밋 2개 (8a7e9e1 · b50d637)

---

### REQ1 — 커밋 목록 · main 충돌 · mergeable

| 항목 | 결과 |
|------|------|
| `4aa3bde` (M2-1117-W) 없음 | ✓ PR 커밋: 8a7e9e1(M0-1117-O) · b50d637(M0-1117-P) 2개만 |
| main 충돌 | ✓ merge-base = origin/main HEAD (0154afe) · PR이 main 직상위 |
| mergeable_state blocked | 브랜치 보호(required review) 규칙 — 코드 충돌 아님 ✓ |

---

### REQ2 — void confirmed 금액 검증

| 검사 | 위치 | 결과 |
|------|------|------|
| `validatePreviewRef` import | route.ts (isPreview\|\|isConfirmed 블록) · `await import("…/preview-recover.js")` — preview-recover.ts 미수정 | ✓ main 것 import |
| 누락 → 400 | `validation.reason === "missing_fields"` → `res.status(400)` | ✓ |
| 불일치 → 409 `preview_stale` | `res.status(409).json({code:"preview_stale", new_preview})` · return 후 workflow 미호출 | ✓ DB 변경 0 |
| 하위 호환 | `isPreview||isConfirmed` false → 블록 skip · workflow 바로 호출 | ✓ |

---

### REQ3 — 테스트 · typecheck

```
Test Suites: 44 passed, 44 total
Tests:       523 passed, 523 total
Snapshots:   18 passed, 18 total
Time:        17.414 s
```

신설 파일:
- `pos-void-net.unit.spec.ts` — 12케이스 (doRecordPaymentRefunds·doRecoverLoyaltyVoid)
- `pos-void-route.unit.spec.ts` — 7케이스 (confirmed 400/409/200·하위호환·preview_ref)

```
typecheck 신규 에러: 0
  (사전 존재 TS2871 — mint-sale-receipt.ts:160 — origin/main 동일)
naming-check: PASS
```

---

### 변경 파일 요약 (6개)

| 파일 | 내용 |
|------|------|
| `api/admin/pos/orders/[id]/void/route.ts` | preview/confirmed 분기 + validatePreviewRef 검증 추가 |
| `workflows/pos-void/index.ts` | recoverLoyaltyVoidStep 편입 · payment_adjustments 입력 |
| `workflows/pos-void/steps.ts` | doRecordPaymentRefunds — payment_adjustments 파라미터 |
| `workflows/pos-void/recover-loyalty.ts` | 신설 · §1.6 공백 메움 |
| `workflows/pos-void/__tests__/pos-void-net.unit.spec.ts` | 신설 12케이스 |
| `workflows/pos-void/__tests__/pos-void-route.unit.spec.ts` | 신설 7케이스 |

---

**판정: APPROVE · 문제 0건**
