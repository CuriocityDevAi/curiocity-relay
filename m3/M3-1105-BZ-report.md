# M3-1105-BZ 착지 리포트

**결과 한 줄**: 뒤로가기 `< Checkout` 복구 · QRIS captured → receipt_id order metadata 재조회 → 결제 완료 화면 · dev-refresh `--pr/--back` · flow-tests 10 passed

---

## §0 진단 — QRIS (N1)

**서버** (`storeport-m1 apps/commerce-core/src/api/admin/pos/orders/[id]/qris-status/route.ts:81-88`):
- captured 응답: `{ ok, status: "captured", payment_request_id, test_mode, data }` — `receipt_id` / `receipt_no` **없음**
- 영수증은 Xendit 웹훅 capture 처리 후 `order.metadata.receipt_id` 에 세팅 (async)

**앱 버그** (master BV 에서 `"captured"` 체크는 이미 수정됨):
- `navigateToSuccess` else branch 가 `router.replace('/(tabs)/orders')` → 항상 목록

---

## §1 REQ1 — 뒤로가기 라벨 `< Checkout` 복구

**파일**: `app/_layout.tsx:83-95`

| 화면 | 라벨 |
|---|---|
| `checkout/tender-cash/[draftOrderId]` | `headerBackTitle: 'Checkout'` |
| `checkout/tender-qris/[draftOrderId]` | `headerBackTitle: 'Checkout'` (신규 등록) |
| `checkout/delivery/[draftOrderId]` | `headerBackTitle: 'Checkout'` |
| `checkout/split-tender/[draftOrderId]` | `headerBackTitle: 'Checkout'` |

`title: ''` 유지(겹침 재발 금지). **iOS 실기 필요** (헤더 변경은 웹 Playwright 검증 불가).

---

## §2 REQ2 — QRIS 성공 → 결제 완료 화면

**파일**: `app/checkout/tender-qris/[draftOrderId].tsx:88-124`

1. `navigateToSuccess` async 변환
2. receipt_id 없으면 `sdk.admin.order.retrieve(id, { fields: '+metadata' })` 최대 5회(2s 간격, ~10s) 재조회
3. 찾으면 `checkout/success/[orderId]` 로 이동
4. 끝까지 없으면 `/(tabs)/orders` 목록 대신 `dismissAll → /(tabs)/orders → orders/[orderId]` 주문 상세로 이동
5. `headerLargeTitle: true` 제거 (BW 금지)

**서버 리포트 (M0 발부 필요)**:
- `storeport-m1 apps/commerce-core/src/api/admin/pos/orders/[id]/qris-status/route.ts:81-88`
- captured 응답에 추가 필요 필드: `receipt_id: string | null, receipt_no: string | null`
- 추가되면 앱의 order metadata 재조회 루프 없이 즉시 success 화면 이동 가능

---

## §3 REQ3 — dev-refresh.sh `--pr/--back`

**파일**: `scripts/dev-refresh.sh`

```
# 사용법:
#   bash scripts/dev-refresh.sh           — master pull + Metro start
#   bash scripts/dev-refresh.sh --pr <N>  — PR N head detached checkout + Metro start
#   bash scripts/dev-refresh.sh --back    — master 복귀 + pull (Metro 미시작)
```

- `--pr <N>`: `git fetch origin pull/<N>/head` → `FETCH_HEAD` detached checkout → package.json/lock 비교 npm install 판단 → Metro
- `--back`: `git checkout master && git pull --ff-only`
- master 체크(`현재 브랜치 != master` 오류)는 옵션 없을 때만 실행

---

## §4 REQ4 — 테스트

**파일**: `tests/flows/m3-1105-bz.test.ts`

- (a) headerBackTitle 4개 화면 × 1 Cart 불변 = 5 tests
- (b) QRIS captured orders 미이동 · 주문 상세 이동 · order.retrieve · captured 처리 · headerLargeTitle 없음 = 5 tests
- **로컬**: 10/10 passed ✅ (전체 flow-tests 92 passed)

---

## §5 CI job 결과 (최종 run 43551165137)

| job | 결과 |
|---|---|
| lint | ✅ pass |
| assertions | ✅ pass |
| flow-tests | ✅ pass |
| playwright | 대기/완료 (헤더 변경 iOS 실기만 검증 가능) |

---

## §6 Kyu 확인 항목 (아이패드 실기)

- [ ] Takeaway → Checkout → Pay → Process payment 화면 뒤로가기 `< Checkout`
- [ ] 현금/나눠내기/배송 화면 동일하게 `< Checkout`
- [ ] QRIS Simulate payment → 결제 완료 화면 → Hand over
- [ ] `bash scripts/dev-refresh.sh --pr <PR번호>` 로 실기 진입
- [ ] `bash scripts/dev-refresh.sh --back` 으로 master 복귀

---

## §7 이연 순증감

이연 없음 → 이연 없음 (서버 리포트 M0 발부 연결)

---

**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/132
