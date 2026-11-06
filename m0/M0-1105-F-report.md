---
round: M0-1105-F
pr:
  storeport: storeport#189
base_pr: storeport#188
outcome: dp-math-round-restored · tenders Math.floor → Math.round · ADDENDUM §1 자구 수정 (현금 Pembulatan 줄 없음 · % 계산은 반올림) · authorize 실패 cleanup (orphan 0) · unit 24/24 · integration 9/9
kyu_checks: 1 (ADDENDUM 자구 수정 승인)
---

# M0-1105-F · % 계산 반올림 복원 + authorize 실패 cleanup

**일자**: 2026-11-06 · **허브**: M0 · **대상**: `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` + DP unit spec + tenders integration spec + `curiocity-relay/docs/research/pos-payment-flows/ADDENDUM-1104.md`.

**base**: storeport PR #188 (`feat/m0-1105-e-settings-wiring`) 위에 쌓음. 머지 순서: #185 → #187 → #188 → **#189**.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | tenders 라우트 DP 계산 2곳 Math.floor → Math.round | ✓ (line 177 · 208) |
| 2 | unit spec 기대값 round 로 복원 + half-up edge | ✓ (10 tests · 신규 1) |
| 3 | 통합 #3·#7 기대값 round 와 동일 확인 | ✓ (양쪽 모두 정수 경계) |
| 4 | ADDENDUM-1104.md §1 자구 수정 | ✓ (curiocity-relay 측) |
| 5 | authorize 실패 시 session/collection 삭제 | ✓ (best-effort try/catch) |
| 6 | 통합 #2 에 "400 뒤 collection 0건" 어설션 | ✓ |
| 7 | 산출물 기동 BOOT OK + /health 200 | ✓ |
| 8 | 금지 (`src/admin/**` · `medusa-config.ts`) 변경 0 | ✓ |

---

## 1. Kyu 11-06 재결정 자구

M0-1105-C/E 는 "현금 반올림 없음" (ADDENDUM §1 원문) 을 % 산술에까지 적용해 `Math.floor` 로 바꿨음. Kyu 11-06 자구 명확화:

> "현금 Pembulatan(단위 올림/내림) 줄 없음 · % 계산(DP·할인)의 소수점은 반올림 (Math.round · half-up)."

즉 **영수증의 Pembulatan 줄 자체가 없는 것**(현금 단위 문제)과 **DP·할인 % 산술 결과가 소수 될 때 반올림**은 **별개 의미**. 산술은 round.

---

## 2. 변경 ↔ file:line

### `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts`
- **line 177** · preorder amount
  ```diff
  - amount = Math.floor((orderTotal * dp_percent) / 100);
  + amount = Math.round((orderTotal * dp_percent) / 100);
  ```
- **line 208** · metadata.deposit_amount (amount 와 동일 식 유지)
  ```diff
  - : Math.floor((orderTotal * dp_percent) / 100);
  + : Math.round((orderTotal * dp_percent) / 100);
  ```
- **authorize catch block** 에 R0-1105-H 관찰 ④ cleanup 추가:
  ```ts
  try {
    const paymentModule = container.resolve(Modules.PAYMENT);
    const sessionId = payment_session?.id;
    if (sessionId) {
      await (paymentModule as any).deletePaymentSessions?.([sessionId]);
    }
    await (paymentModule as any).deletePaymentCollections?.([payment_collection_id]);
  } catch (cleanupErr) {
    console.warn(`[M0-1105-F] authorize cleanup failed (non-fatal): ...`);
  }
  ```

### `apps/commerce-core/src/modules/pos_settings/__tests__/preorder-dp-math.unit.spec.ts`
- `computePreorderDepositAmount`: Math.floor → Math.round.
- "floor semantics" 3건 → "round semantics" **4건** (half-up `dp=50 on 101 → 51` 신규).

### `apps/commerce-core/integration-tests/pos/tenders.spec.ts`
- #2 에 R0-1105-H 관찰 ④ 어설션 (authorize 400 뒤 order.payment_collections.length === 0).

### `curiocity-relay/docs/research/pos-payment-flows/ADDENDUM-1104.md`
- §1 자구 수정 (현금 Pembulatan 줄 없음 · % 계산은 반올림 · M0-1105-C/E 해석 오해 정정 · M0-1105-F 복원).

금지 영역 변경 **0** (`src/admin/**` · `medusa-config.ts`).

---

## 3. 기대값 영향 매트릭스

| 케이스 | floor | round | 차이 | 통합 영향 |
|---|---:|---:|---|---|
| #3 dp=50 · total=200000 | 100000 | 100000 | 동일 | 어설션 통과 (round/floor 무관) |
| #7 dp=30 · total=100000 | 30000 | 30000 | 동일 | 어설션 통과 |
| edge dp=50 · total=199 | 99 | 100 | +1 | unit 어설션만 영향 |
| edge dp=50 · total=101 | 50 | **51** | +1 | neu half-up 신규 |
| edge dp=33 · total=100 | 33 | 33 | 동일 | unit 어설션 통과 |

통합 기존 어설션 (#3·#7) 전부 그대로 통과.

---

## 4. 검증

| 상시 체크 | 결과 |
|---|---|
| ⓐ Build (`pnpm --filter commerce-core build`) | Backend 9.95s · Frontend 21.22s · **PASS** |
| ⓒ 산출물 기동 (dist · `medusa start`) | `BOOT OK unknown :9995` + `Server is ready on port: 9995 – 2157ms` + `curl /health 200` |
| Unit 테스트 | **24/24 PASS** |
| Integration 테스트 | **9/9 PASS** (#2 cleanup 어설션 추가 포함) |

### Integration log (9/9)
```
✓ #1 cash tender captures a payment_collection
✓ #2 edc tender missing approval_code returns 400 · [M0-1105-F] 400 뒤 collection 0건
✓ #3 preorder with dp_percent=50 computes amount = total * 50/100
✓ #4 takeaway fulfill decrements inventory stocked_quantity
✓ #5 preorder fulfill transitions stage without inventory decrement
✓ #6 two tenders on one order → 2 collections + aggregate
✓ #7 [M0-1105-E] settings dp_percent=30 + body.amount 없음 → amount = 30%
✓ #8 [M0-1105-E] settings show_tax_label=false → snapshot.tax.show=false
✓ #9 [M0-1105-E] settings receipt_header 3줄 → snapshot.header CRLF→LF
```

---

## 5. 산출물

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/189
- **브랜치**: `fix/m0-1105-f-rounding` (base = `feat/m0-1105-e-settings-wiring` #188)
- **커밋**: `83ac5a3` — `fix(pos): % 계산 반올림 복원 · authorize 실패 cleanup (M0-1105-F)`
- **ADDENDUM**: `curiocity-relay/docs/research/pos-payment-flows/ADDENDUM-1104.md` §1 자구 수정 (이 리포트 commit 에 포함)

---

## 6. 다음 후보

- M0-1105-E/F 머지 후 Admin UI 의 dp_percent 입력란에 "% (반올림 적용)" 미세 라벨 추가 여부 검토.
- R0-1105-H 관찰 ④ 나머지 (session/collection cleanup) 가 다른 실패 경로 (payment_collection create 실패 · update metadata 실패) 에도 필요한지 검토.
