#161 APPROVE

## 확인 항목

### 1. base · mergeable
- base = 27fb8e1 (최신 master) ✅
- mergeable: MERGEABLE (충돌 없음) ✅

### 2. pendingVariantAdds · snapshotQueue 유지
- `pendingVariantAdds` Map: draft-orders.tsx:300 — 연타 직렬화 로직(accQty 누산·freshAdds 필터·confirmEdit 후 updateItem) 완전 유지 ✅
- `snapshotQueue` useRef: draft-orders.tsx:319 — onMutate push + mutationFn shift FIFO 패턴 유지, `cached ?? undefined`로 null-cache 호환 ✅

### 3. onMutate null-cache · _draftOrderCreationPromise
- 기존 `if (cached?.draft_order?.items !== undefined)` 가드 제거 → `cached?.draft_order?.items ?? []` 로 null(빈 카트)에서도 temp 줄 즉시 생성 ✅
- `_draftOrderCreationPromise` 모듈 수준 싱글턴: 빈 카트 연타 시 `resetAndCreate()` 1회만 호출, `.finally()` 로 초기화 ✅

### 4. 두 번째 상품 깜빡임 — onSettled 순서 분석
- `onSettled`: `setQueryData(confirmedResponse)` → `isMutating === 1` 조건 → `invalidateQueries` 순서 ✅
- **정상 순차 시나리오**(mutation 1 완료 후 두 번째 탭): mutation 1 settle → cache = confirmed_A → 두 번째 onMutate: optimistic_A_B → 깜빡임 없음 ✅
- **빠른 연타 edge case**: mutation 1 settle 시 `setQueryData(confirmed_A)` 가 mutation 2의 temp_B를 순간 덮어쓸 수 있음. `isMutating === 1` 조건 덕분에 invalidateQueries는 스킵되며, mutation 2가 settle하면 confirmed_A_B로 복원됨 — 주요 2초 지연 이슈 해소 목적 충족, edge case는 허용 범위

### 5. findVariantInfo + _display 타입·런타임 안전
- `_display` 있으면 그대로 반환(early return) · 없으면 `findVariantInfo` fallback ✅
- `findVariantInfo` 반환: `{ productTitle?: string, unitPrice: number, thumbnail?: string }` — PosAddItem._display 타입과 호환 ✅
- `buildOptimisticCartUpdate` 에서 `displayInfo?.unit_price ?? 0` / `displayInfo?.product_title ?? ''` 로 undefined 안전 처리 ✅

### 6. 테스트 결과
```
Test Files  35 passed (35)
Tests       394 passed | 6 expected fail | 2 todo (402)
```
- m1-1116-y.test.ts 8케이스 전부 통과 (new-a·new-b 포함) ✅
- 기존 34개 파일 386케이스 회귀 없음 ✅

## 판정

**APPROVE** — M1-1116-AJ 목표(빈 카트 첫/두 번째 상품 탭 즉시 표시, draft 1회 생성, 2초 지연 해소) 달성. 기존 M2·M3 메커니즘 유지. 타입·런타임 안전. 전체 테스트 통과.
