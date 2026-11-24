판정: COMPLETE — order-number 7/7 · orders-list 10/10 · heavy-mac pass

## CI 결과 (run 45342112511 · 2026-11-24)

| suite | result | count |
|---|---|---|
| order-number.spec.ts | ✅ PASS | 7/7 |
| orders-list.spec.ts | ✅ PASS | 10/10 |
| heavy-mac 전체 | ✅ pass | — |

## 적용된 수정

### R0-1 `reserve.ts` — `$1/$2/$3` → `?`
- 닉네임 조회, start_override 조회, counter UPSERT, lock UPDATE 4개 쿼리 모두 변환
- 커밋: `76188cc`

### R0-2 `orders-list.spec.ts` — `custom_display_id` 추가
- 291행 expected shape에 알파벳 순 (`currency_code` 뒤) 삽입
- 커밋: `76188cc`

### 부수 수정 (동일 커밋)
- `order-number.spec.ts` ①③④⑤ — `createTestOrder` 에 누락된 `total/items/withInventory` 추가
- 테스트 ⑦ 신설 — POS draft→order 변환 경로 (metadata.stock_location_id 추출) 증명
- 커밋: `76188cc`

### R1 `order-number.spec.ts` ② — 동시 20→5건
- `Promise.all(20)` 이 CI knex connection pool 고갈 (KnexTimeoutError)
- 5건으로 축소 — atomic UPSERT 중복 없음 검증 유지
- 커밋: `ccf43b8`

## 통합 테스트 실제 발급 번호 예시

```
[order_number ⑦] draft order custom_display_id = PIM26B1000
```

형식: `PIM` (닉네임) + `26` (연도 YY) + `B` (11월 monthChar) + `1000` (첫 serial) = `PIM26B1000`

## order-number 7개 테스트 결과

```
✓ ① nickname 설정 후 주문 생성 → custom_display_id 발급 (570 ms)
✓ ② 동시 5건 → 1000~1004 중복·건너뛰기 없음 (651 ms)
✓ ③ last_serial 9999 다음 10000 (5자리 자연 확장) (634 ms)
✓ ④ 다음 달 start_serial override 는 당월 미적용 (453 ms)
✓ ⑤ 닉네임 없음 → 주문 성공 + custom_display_id=null (459 ms)
✓ ⑥ 닉네임 중복 → 다른 매장이 같은 닉네임 등록 거부 (422 ms)
✓ ⑦ POS draft order → tender → order 변환 경로에서 custom_display_id 발급 (PIM26B1000 형태) (496 ms)
```
