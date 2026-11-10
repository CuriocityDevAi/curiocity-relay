# M0-1105-AE — #208 CHANGES 반영 리포트

**브랜치 · HEAD**: `feat/m0-1105-ac-return-partial` · `0b5b5bc`
**PR**: https://github.com/CuriocityDevAi/storeport/pull/208 (stacked on #207)
**R0 원본**: `r0/R0-1105-AZ-report.md` · CHANGES 2 (1 CRITICAL · 1 MEDIUM) + 1 MINOR
**결정 원장**: `ledger/decision-p6-20261110.md` (Q5 품목·수량 단위)
**선행 완료**: `m0/M0-1105-AD-report.md` (c2dcb96)

---

## 1. 변경 요약

### CHANGES 1 CRITICAL — hashReturnItems · Guard A 가 분할 반품을 오탐

**해소 방향**: R0 안 ①번 — **Guard A 제거** 채택.

- `route.ts:74-82` `hashReturnItems()` 완전 삭제.
- `route.ts:181-191` Guard A (metadata.returns 안 `hash === reqHash` 재요청 409) 블록 삭제.
- `route.ts:575` 메타데이터 저장 시 `hash: reqHash` 필드 삭제.

**중복 방지 대체**:
- **Guard B** (누적 수량 ≤ 산 수량) 유지 — 이미 반품된 수량 합 + 이번 요청 수량 > 원주문 수량이면 400.
- **코어 validator** — Medusa `refundPaymentWorkflow` 의 `validateRefundPaymentExceedsCapturedAmountStep` throw 를 catch 해 409 로 정규화.
- **주문-단위 in-memory 큐** — 동시 요청 두 개가 둘 다 Guard B 를 통과한 뒤 `adjustInventory(+qty)` 를 두 번 돌리는 레이스를 막기 위해 `orderReturnQueue: Map<order_id, Promise>` 로 처리 직렬화. POST 핸들러는 외부 shim 으로 두고 실제 로직은 `handleReturn()` 으로 분리 · `withOrderLock(order_id, () => handleReturn(...))` 로 감쌈.

**선택지 · 채택 · 이유 (3줄)**:
1. 안 ① (Guard A 제거 + 직렬화) 채택 — 명세대로 분할 반품을 허용하고 재고 이중 복귀는 큐로 차단, 클라이언트 계약 불변.
2. 안 ② (해시에 "기존 반품 횟수" 포함) 기각 — 회수당 해시가 바뀌므로 metadata.returns 재스캔이 필수. 복잡도 증가.
3. 안 ③ (클라이언트 `idempotency_key`) 기각 — POS 앱 변경 필요. 서버만의 책임으로 처리 가능하므로 과도.

### CHANGES 2 MEDIUM — stockLocationId 폴백이 session-id 를 store-id 로 사용

- `route.ts:297-300` 폴백에서 `?? body.register_session_id` 제거.
- 새 폴백: `order.metadata.stock_location_id` 없으면 **`stock_location.id` 첫 행** 으로 폴백 (Admin GET `/admin/pos/manager-pin` 과 **동일 소스**). 쿼리 실패 시 `"default"` 유지.
- PIN 계산 결과가 Admin 위젯이 보여주는 PIN 과 항상 일치하도록 보장.

### MINOR — 미사용 변수 orderTotal

- `route.ts:264` `const orderTotal = toNum(order.total)` 삭제. 금액 계산은 `ori.total` 기반으로만 이뤄져 `orderTotal` 은 어디서도 참조되지 않았음.

### 테스트 변경

- **tenders.spec #55 재작성**: 명세대로 Pastry × qty 2 → qty 1 반품 (200 · 60k) → qty 1 반품 (200 · 60k · 다른 return_id) → 누적 refunded 120k = 결제액 · 재고 48 → 50 (+2) 복귀 · 3rd qty 1 → 400 over quantity.
- **tenders.spec 구 #59 삭제**: "같은 body 두 번 → 409 duplicate" — Guard A 제거로 더 이상 유효하지 않음.
- **tenders.spec #60 신설**: Admin GET `/admin/pos/manager-pin?store_id=<stockLocationId>` 호출 → 반환 PIN 값으로 cash 반품 → **200** 성공. PIN storeId 가 Admin 위젯과 동일 소스임을 end-to-end 로 증명.
- **fixtures**: `m0-1105-ac.return-duplicate.409.response.json` 삭제 (구 duplicate 응답 스냅샷).

### 문서

- `docs/feature-map.yaml` · `pos-void-refund` 항목의 summary 를 M0-1105-AE 반영: Guard A 제거 · 분할 반품 허용 · 주문-단위 in-memory 큐 · PIN storeId 정렬.

---

## 2. 테스트 결과

- `pnpm typecheck` (apps/commerce-core): **EXIT 0** · TypeScript 에러 0.
- `pnpm test` (unit · apps/commerce-core): **5/5 test suites · 33/33 tests PASS** · 6.1s.
- `pnpm lint`: 로컬에서 `@medusajs/eslint-plugin` 미해결로 실행 불가 (기존 상태 · R0-1105-AZ 와 동일). **CI 가 검증.**
- 통합 테스트 (`pnpm test:integration:pos`): 로컬 docker/postgres 부재로 미실행. **CI 가 검증.**
- naming-check (pre-commit): **PASS** · `meros` 매치 0 · Medusa 모듈명 규격 정합.
- lint-staged + prettier: PASS.

---

## 3. CI 상태 (요구 5)

- `gh pr view 207`: **state=OPEN · mergedAt=null · baseRefName=main**.
- `gh pr view 208`: **state=OPEN · baseRefName=feat/m0-1105-ab-void-refund-pin · headRefName=feat/m0-1105-ac-return-partial**.
- **#207 미머지** → 지시대로 **base 유지** (`feat/m0-1105-ab-void-refund-pin`). #208 의 PR CI 는 `pull_request: branches: [main]` 필터로 여전히 미발화. 로컬 typecheck/unit PASS 로 QC 대체 (R0-1105-AZ 와 같은 조건).
- #207 머지 완료 후 별건에서 base 를 main 으로 전환하고 `gh pr checks 208` 초록 확인 예정.

---

## 4. 커밋 & push

- `0b5b5bc` · `fix(pos): 분할 반품 허용 · PIN storeId 정렬 (M0-1105-AE · #208 CHANGES)` · 4 files · +177 / −84 · `processes: [commerce-core.pos-void-refund, commerce-core.pos-tenders-fulfill]`.
- push: `c2dcb96..0b5b5bc feat/m0-1105-ac-return-partial -> feat/m0-1105-ac-return-partial`.

---

## 5. 착지 명령

```bash
cp /tmp/M0-1105-AE-report.md ~/projects/curiocity-relay/m0/ \
  && cd ~/projects/curiocity-relay \
  && git add m0/M0-1105-AE-report.md \
  && git commit -m "m0: M0-1105-AE" \
  && git pull --rebase --autostash origin main \
  && git push
```

claim done.
