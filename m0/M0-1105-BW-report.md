# M0-1105-BW — #251 R0 CHANGES 반영: refund-retry-qris 를 CI 통합 테스트 스크립트에 편입 (auto-discovery)

**결과 한 줄**: done · #251 head SHA `46e3f2d` · base 가 `feat/m0-1105-bs-qris-split-tender-status` (main 아님) → CI 미실행 · **로컬 7 tests passed 로그 첨부**.

## 변경 요약

`apps/commerce-core/package.json` 의 `test:integration:pos` 를 **명시 목록 (`&&` 체인)** → **glob 기반 auto-discovery (shell script)** 로 교체.

- `apps/commerce-core/scripts/test-integration-pos.sh` 신설 (executable).
  - `integration-tests/pos/*.spec.ts` 를 glob 로 열거 → spec 당 jest 재기동.
  - 더블-부트 격리 유지 (M0-1105-AP · `medusaIntegrationTestRunner` cross-realm `Map.prototype.set` 충돌 회피).
- `apps/commerce-core/package.json` · `test:integration:pos` = `"bash scripts/test-integration-pos.sh"`.
- `docs/feature-map.yaml` · `pos-tenders-fulfill.files` 에 신 script 등록.

## REQ1 — 패턴/목록 선택 (PR 본문 3줄 소재)

명시 목록 방식은 신규 spec 가 package.json 재편집 없이는 자동 편입되지 않아 **silent-drop 재발 원인**. glob + per-spec jest 재기동으로 "미래 신규 spec 자동 편입 + 더블-부트 격리 유지" 둘 다 달성. 로컬 `pnpm test:integration:pos` 는 12 spec 전부 돌림.

## REQ2 — 전수 확인 (silent-drop spec 더 있나)

기존 `&&` 체인 포함 6 spec: `tenders` · `pos-tax-lines` · `p6-e2e` · `refund-ghost-reservation` · `pos-qris-simulate` · `refund-receipt-kind`.

`integration-tests/pos/` 실존 12 spec 중 **6건 누락 확인**:

- `refund-retry-qris.spec.ts` ← 이번 라운드 추적 대상 (M0-1105-BT)
- `open-order-reservations.spec.ts` (M2-1105-AW)
- `partial-refund-anytime.spec.ts` (M0-1105-BF)
- `refund-decision-bc.spec.ts` (M2-1105-BC)
- `stock-cleanup.spec.ts` (M2-1105-AQ)
- `void-refund-restock.spec.ts` (M0-1105-AR)

glob 로 전부 자동 편입됨 (검증: `ls integration-tests/pos/*.spec.ts` 12건 → bash script dry-enumerate 12건 일치).

## REQ3 — 로컬 refund-retry-qris 7건 확인

```
cd apps/commerce-core && TEST_TYPE=integration:pos NODE_OPTIONS=--experimental-vm-modules \
  npx jest --silent=false --runInBand --forceExit --testPathPattern='refund-retry-qris\.spec'
```

```
PASS integration-tests/pos/refund-retry-qris.spec.ts (12.283 s)
    M0-1105-BT · /refund-retry mode 분기 · 이중 환불 가드
      ✓ #BT-a QRIS refund FAILED → mode=retry → SUCCEEDED · tender_results succeeded · xendit.status=SUCCEEDED (945 ms)
      ✓ #BT-b QRIS refund FAILED → mode=cash_fallback (PIN) → Cash Movement −금액 · succeeded_via_cash (684 ms)
      ✓ #BT-c cash_fallback 뒤 늦게 오는 Xendit SUCCEEDED 웹훅 → r.status 불변 + dup_refund_alerts 1건 (791 ms)
      ✓ #BT-d Xendit refund PENDING 상태에서 mode=retry → 409 xendit_refund_still_pending (729 ms)
      ✓ #BT-e cash_fallback · PIN 누락 → 400 · 실패 QRIS 없음 → 400 (661 ms)
      ✓ #BT-f split CASH+QRIS 주문의 QRIS 몫 실패 → mode=retry QRIS 재환불 · CASH 몫 영향 없음 (660 ms)
      ✓ #BT-g (회귀) mode 생략 (=retry default) · CARD-only 실패 → terminal_approval_code 재입력 성공 (845 ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

## 커밋

- SHA `46e3f2d` · branch `feat/m0-1105-bt-qris-split-refund-retry` (#251).
- `3 files changed, 35 insertions(+), 1 deletion(-)`.
- pre-commit (naming-check · 전 workspace test 132 passed) PASS.
- `git push origin feat/m0-1105-bt-qris-split-refund-retry` 완료 (fd375ce..46e3f2d).

## 금지선 준수

- 앱(fork) 미수정 · 기능 코드 미수정 · 테스트 스크립트/설정/feature-map 만 수정.
- PR 미머지 · 실 Xendit 호출 없음 (local jest 는 테스트 fixture only).
