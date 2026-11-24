CHANGES

## R0-1124-S — PR #418 (M0-1124-E) 리뷰 결과

판정: **CHANGES** (코드 수정 불필요 · PR 본문 보완 1건)

---

## REQ 대조

### REQ 1 — 매장별 override 2개뿐 ✅

`LOCATION_PATCH_KEYS = new Set(["store_address", "pb1_pct"])` — 2개 화이트리스트.
금지 키 무시 → 허용 키 없으면 400. `getForLocation()` 이 store + location merge → 나머지 브랜드 fallback 확인.

### REQ 2 — `location_id` 없을 때 기존 동작 100% 보존 ✅

`toLocationIdParam` : null / 빈 문자열 → null. GET·PUT 모두 `locationId === null` → 기존 경로 그대로.
GET 응답에 `location_id: null` 신규 추가되지만 기능 하위 호환 유지. `src/admin/**` 미변경 → #417 충돌 없음.

### REQ 3 — 영수증 location 기반 · PB1 합계 ⚠️

**서버 구현 정확**: `pb1_pct=0` 위치 → `snapshot.posSettings.pb1_pct = null` → 영수증 PB1 줄 제외.
`store.address = settings.store_address` pass-through 추가 확인.
`getForLocation(stock_location_id)` 로 register session location 기반 동작 확인.

**M3 이전 운영 갭 존재 (문서화 필요)**:
`grandTotal` 은 `order.metadata.pos_totals.grand_total` (POS 앱 계산) 에서 옴.
현재 POS 앱은 store-scope (pb1=10%) 로 총합을 계산한다.
M3 이전에 PS `pb1_pct=0` 설정 시:
- receipt snapshot: PB1 줄 없음
- grand_total: PB1 금액 포함
→ REQ 3 "영수증 표시만 빠지고 돈 계산은 그대로면 안 됨" 상황 발생.

**요청**: PR 본문 "범위 밖" 또는 "Kyu 실기 항목" 에 아래 추가.
```
주의: PS pb1_pct=0 설정은 M3 완료(POS 앱 ?location_id= 전환) 후 운영 적용.
      M3 이전 적용 시 grand_total PB1 포함 ↔ 영수증 PB1 줄 없음 불일치.
```

### REQ 4 — 주문 목록 `?stock_location_id=` 필터 ✅

in-memory filter 구현 확인. `q + stock_location_id` 동시 사용 시 count 정합성:
q-branch 말미 `totalCount = orders.length` 재설정 → 올바름.

### REQ 5 — 매장 준비 스크립트 dry-run ✅

기본 dry-run (`dryRun = !parsed.apply`). 모든 DB write 가 `if (!dryRun)` 가드.
기존 location rename = ID 보존(이름만 변경). 재고·주문·번호 카운터 그대로.

### REQ 6 — 마이그레이션 추가만 / 테스트 / CI ✅

migration 파일 없음 — `store_address` 는 기존 `settings` JSONB 신규 키 (schema ALTER 없음).
테스트 588 passed · typecheck 에러 0 · lint 신규 error 0.

---

## 미실행 항목

로컬 테스트 재실행 미수행 (R0 환경에 storeport dev 미설정). PR 본문 test log (588 passed) 로 대체.
