# R0-1105-DK — storeport #238 리뷰 보고서

**판정: APPROVE 상당**
head SHA: `a8e3ee1029a46b686c2440360fe813da6ae6929c` · base `19f38d5` · CI all-pass

---

## CJ-3 (route.ts:800–833)

**결제 성공 경로·금액 불변** ✅
- 마커 코드 전체가 외부 `catch(e)` 안 + 내부 `try/catch(cj3Err)` 이중 보호(route.ts:806–832).
- PaymentCollection 생성은 라인 836 이후 — 마커 코드가 결제 흐름에 개입 불가.
- 응답 금액(`amount`, `grand_total`)은 `computedGrand`/`PaymentCollection.amount`를 SoT로 사용하며 무관.

**마커 키값·개인정보 없음** ✅
- `reason: (e as Error).message`(에러 메시지) + `at: new Date().toISOString()`(타임스탬프)만 기록.

**metadata merge (기존 키 보존)** ✅
- route.ts:807–811: 기존 metadata 조회 후 `{ ...cj3Md, pos_tax_lines_insert_failed: {...} }` spread merge.

---

## CJ-3 테스트 — jest.spyOn 복원

**타 케이스 오염 없음** ✅
- `mockRejectedValueOnce` → 1회 소비 후 원본으로 패스스루.
- Jest config `restoreMocks: true` 미설정이나 `Once` 한정으로 충분히 보호.

---

## CJ-4 — `it.failing` 정당성 · 영향 범위

**정당함** ✅
- Medusa query.graph의 `items.tax_total` 집계가 0 반환 → known issue (spec 주석 line 32–36 + route.ts "Medusa tax_total 은 0 전제").

**CJ-4 영향 범위 — 현재 화면/영수증/Admin 세금 표시에 직접 영향 없음**
- `items.tax_total`(query.graph per-item)을 직접 사용하는 화면·출력 경로 없음.
- `anchor/src/components/order/summary/index.tsx`, `usePrinterService.ts`, `receipt/service.ts`, `payment-dialog/hooks.ts` 모두 order-level `order.tax_total`(Medusa SDK retrieveOrder 집계 경로) 사용.

**권장 수정안**: `retrieveOrder` > `items.total - items.subtotal` — 후자도 동일한 BigNumber query.graph 직렬화 문제 가능성.

---

## CI 결과

| 체크 | 결과 |
|---|---|
| pos-integration | ✅ pass (3m13s) |
| unit-commerce-core | ✅ pass (1m2s) |
| markers-and-forbidden | ✅ pass |
| changes-filter | ✅ pass |
| check | ✅ pass |
| docker-smoke-* / wrangler-* | skipping (의도적) |

mergeable_state: CLEAN
