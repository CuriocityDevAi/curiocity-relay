#157 APPROVE · #158 CHANGES · 연타 중복 줄 위험 있음

## #157 — M3-1116-R (Checkout 뱃지 조회 키)

**판정: APPROVE**

`registerId = openSession.data?.id`(register_session_id)로 변경 — 올바른 수정.
`stock_location_id`를 사용하면 `order_snapshot` 조회가 항상 null → 뱃지 hidden 고정 버그를 정확히 수정.

**M3-1116-S 호환성 (블로커 아님)**
현재 `GET /admin/pos/registers/:register_id/snapshot`의 `:register_id`는 register_session_id 기대 → `openSession.data?.id` 맞음.
M3-1116-S 머지 후: 짝짓기가 stock_location 기준으로 바뀌면 조회 키도 `settings.data?.stock_location?.id`로 되돌려야 함.
`startSnapshot` / `cancelSnapshot`의 `registerSessionId` 파라미터도 같이 재검토 필요. M3-1116-S 머지 직후 양쪽 확인 권장.

## #158 — M2-1116-U (Add to cart 낙관적 표시)

**판정: CHANGES REQUESTED**

**[블로커] 연타(새 상품) → `addItems` 2회 → 서버 라인 2개 생성 위험**

테스트 `[REQ 연타]`가 명시적으로 확인: 새 상품 2회 연타 시 두 mutation 모두 `toAdd = [{var_new, qty:1}]` 전송.
Medusa v2 `addItems`는 같은 variant_id라도 호출마다 별도 라인 생성(merge 없음).
결과: `onSettled` 후 서버에 qty=1 라인 2개 → POS 영수증 같은 상품 2줄.

원인: `mutationFn`이 snapshot에서 `__temp_` 필터링 → 두 번 모두 빈 serverItems → 두 번 모두 `toAdd` 판단.

수정 방향: temp qty 누산 + mutation 차단(첫 번째 resolve 후 `updateItem`), 또는 연타 debounce.

기존 상품 연타(snapshot 큐), 실패 롤백(`onError` 복원), 빈 상태 조건(`isUpdatingDraftOrder === 0`), Checkout 버튼 대기 유지는 모두 올바름.
