# R0-1105-BS · storeport #217 리뷰 리포트

**판정: APPROVE**

---

## 바뀐 파일 표

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `apps/commerce-core/integration-tests/pos/p6-e2e.spec.ts` | ADDED +643 | P6 E2E spec 신설 (8 시나리오) |
| `apps/commerce-core/package.json` | MODIFIED +1/-1 | `test:integration:pos` 더블-부트 fix (tenders↔p6-e2e 프로세스 분리) |

src 코드 무변경. CI workflow 무변경.

---

## 전수 체크

### src/CI 무결
변경 파일 2개 모두 테스트 범주(spec + package.json 스크립트). src 건드림 없음.

### 다른 테스트 약화 없음
`package.json` 변경은 `tenders.spec` 프로세스(첫 번째) → `p6-e2e.spec` 프로세스(두 번째) 순 직렬 실행으로 분리.
`tenders.spec` 는 그대로 완전 실행, skip 없음. 약화 없음.

### `computeDailyPin` / `computePinForTest` 직접 호출: 0건
전 spec 에서 PIN 취득 경로는 오직 `fetchAdminPin()` → `GET /admin/pos/manager-pin` API 경유.
`computeDailyPin` / `computePinForTest` 문자열 없음(grep 확인).

### 8 시나리오 — 빈 테스트 아님
| 시나리오 | 핵심 assert |
|---|---|
| (a) 현금 Void | `voidRes.status 200`, `data.ok true`, `order.status "canceled"` |
| (b) fulfill→Void | 위 + fulfillments 전체 `canceled_at` truthy |
| (c-i) 오답 4→정답 | `remaining_attempts` 카운트다운 + 5번째 성공 |
| (c-ii) 오답 5→423 | 5번째 `423 locked`, 정답 재시도도 `423` |
| (d) 품목 반품 | `refunded_amount 60000`, `open_drawer true`, `receipt_id` truthy |
| (e) 교대간 Refund | `refunded_amount 90000` |
| (f) split CASH-first | `refund_distribution[0].method "cash"`, `dist[0].amount 40000` |
| (g) partial→retry | `retryRes.status 200` + `already_complete true` on 2nd retry |

### CI (M0-1105-AP 확인 · run 43051096526)
- ✅ changes-filter (5s)
- ✅ unit-commerce-core (54s)
- ✅ markers-and-forbidden (6s)
- ✅ pos-integration (2m34s)

---

## (b) fulfill→Void 가 운영 Void 버그를 왜 못 잡는지

운영에서 `cancelOrderFulfillmentWorkflow … required_quantity` 실패는 실 주문의 fulfillment 에 연결된 reservation 이 이미 소진·해제됐거나 애초에 생성되지 않은 케이스(예: inventory tracking 없는 품목, 혹은 fulfill 직후 reservation 자동 해제)에서 `required_quantity` 가 0 또는 미조회 되어 발생하는 것으로 추정.
반면 (b) 는 `createTestOrder({ initialStock: 10 })` + `seedReservationForLineItem(quantity: 1)` 로 항상 유효한 reservation 을 명시 주입하므로 workflow 가 `required_quantity > 0` 으로 정상 진행 → 해당 에러 경로 미통과.
**시드 데이터 차이 본질**: 테스트는 "reservation 보장" 경로만 재현, 운영의 "reservation 소진·미생성" 경로는 미커버.

---

## 이연 순증감

- 신규 이연 없음
- 기존 이연 변동 없음
