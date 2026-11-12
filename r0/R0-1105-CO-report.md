# R0-1105-CO 리포트 — #224 재리뷰 (M0-1105-AY 반영분)

작성: 2026-11-12 · beb89bd · PR #224

---

## 판정

**CHANGES** — CI pos-integration RED: `p6-e2e.spec.ts:184` void 400 (`(b)` test)  
필요 조치: `main(7a7ad02)` rebase 1회 (#223이 동일 뿌리 fix 포함, 추가 코드 불필요)

---

## 검증 표

| REQ | 항목 | 결과 |
|---|---|---|
| 1 | beb89bd 변경 범위 | ✅ 테스트 기대값 교정 + CI 패턴 확장뿐 (구현 무변경) |
| 2 | CI pos-integration `tenders.spec` | ✅ PASS 88/88 |
| 2 | CI pos-integration `pos-tax-lines.spec` | ✅ PASS 7/7 |
| 2 | CI pos-integration `p6-e2e.spec` | ❌ FAIL 1/9 — `(b)` void 400 (`p6-e2e.spec.ts:184`) |
| 3 | main(7a7ad02) 충돌 | ✅ 없음 (merge-tree 3파일 all merged) |

### REQ 1 상세

beb89bd 변경 파일 2개:
- `integration-tests/pos/tenders.spec.ts` (+17 / −12): `#61·#82` 기대값 교정 (restock:true 추가, preFulItemInvId 가드 삭제, 주석 재작성)
- `apps/commerce-core/package.json` (+1 / −1): `test:integration:pos` 2 패스 → 3 패스 (`pos-tax-lines` 편입)
- `tenders/route.ts` · `pos-tax-lines.spec.ts` 등 구현/설계: **수정 0** ✅

### REQ 2 상세 — p6-e2e.spec FAIL 원인

```
FAIL integration-tests/pos/p6-e2e.spec.ts (23.458 s)
  ✕ (b) 결제 → fulfill(hand_over) → Void 성공 (1053 ms)
    AxiosError: Request failed with status code 400
    at p6-e2e.spec.ts:184
```

- 뿌리: `#221 M0-1105-AR` restock_required 계약 — `hadFulfillment` void 에 `restock` boolean 필수 (`void/route.ts:303`)
- `p6-e2e.spec.ts:184` 의 void body 에 `restock` 누락
- **beb89bd 비원인**: AY 이전부터 존재하는 p6-e2e (b) RED (AY 이연 항목)
- **fix 위치**: main(7a7ad02 / #223) 이미 포함 — `test(p6-e2e): (b) restock:true + (b-restock) 400 계약 고정 (M2-1105-AW)`

### REQ 3 상세 — 충돌 없음

- merge-base: `6f15ef7` → main head: `7a7ad02` (1커밋 차이)
- 7a7ad02(#223) 변경 파일: `_helpers/prod-shape-seed.ts`(신규) · `p6-e2e.spec.ts` · `stock-cleanup.spec.ts`
- #224 변경 파일: `tenders.spec.ts` · `package.json` — **겹침 0** · merge-tree all merged ✅
- 단, `p6-e2e.spec.ts` 의 (b) fix 가 #223 에 있으므로 **rebase 후 CI 초록** 으로 전환 예상

---

## Kyu 실기 항목 (쉬운 말)

#224 는 "세금을 Medusa 주문 총액에 넣는" 기능(Path D)입니다. 머지 후 Admin 에서 확인할 항목:

1. **세금 줄 표시**: 주문 상세 → Tax 항목에 "POS Tax (PB1 10%)" 3,000원 보임
2. **Outstanding 0**: 결제 후 미결 금액(Outstanding)이 −3,000이 아니라 **0** 이어야 함 (R6 해소)
3. **환불 금액 세금 포함**: 품목 1개 반품 시 환불이 30,000이 아니라 **33,000** (세금 포함) 이어야 함 (R11 해소)
4. **Z-report**: Tax total 항목이 별도 집계되어야 함

이 4가지는 코드 변경이 맞는지 눈으로 확인하는 최종 검증입니다. main rebase 후 CI 초록이 되면 실기 가능합니다.
