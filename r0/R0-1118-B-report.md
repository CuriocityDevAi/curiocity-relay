#356 APPROVE · 불변 O(단 draft-orders ORDER BY 미세 추가) · CI 빌링 블록 · 문제 2건

## REQ 1 · 전/후 대조 — 필드·정렬·필터·페이지·전화 정규화

### orders-list (`route.ts` → `listPosOrdersHandler`)

| 항목 | Before | After | 판정 |
|------|--------|-------|------|
| 필드 | id/display_id/created_at/status/fulfillment_status/payment_status/total/currency_code/metadata/customer_id/payment_collections.payments.* | BASE_FIELDS = 위 모두 + `is_draft_order` + `subtotal` (추가) | ✓ 상위호환 |
| filters | `{}` | `dbFilters = {}` (q 없을 때) | ✓ |
| pagination | `q==="" ? {skip,take,order:DESC} : {order:DESC}` | `hasQ ? {order:DESC} : {skip,take,order:DESC}` | ✓ 동치 |
| customerPhoneMap | route 내 `customerModule.listCustomers` 블록 | handler 내 동일 로직 → 반환 | ✓ |
| phone normalize | `normalizePhone/maskE164` route 잔류 | route 잔류 (unchanged) | ✓ |
| count | `metadata.count ?? orders.length` | handler 내 동일 → 반환 | ✓ |
| register_session | post-fetch metadata 비교, route 잔류 | route 잔류 (unchanged) | ✓ |
| stock_location | post-fetch 비교, route 잔류 | route 잔류 (unchanged) | ✓ |

**orders-list 불변 ✓**

### draft-orders (`route.ts` → `listPosOrdersHandler`)

| 항목 | Before | After | 판정 |
|------|--------|-------|------|
| 필드 | id/display_id/created_at/currency_code/is_draft_order/metadata/total/subtotal | BASE_FIELDS 상위호환 (전부 포함) | ✓ |
| is_draft_order filter | `filters.is_draft_order: true` | `input.filters.is_draft: true` → `dbFilters.is_draft_order = true` | ✓ |
| created_at 7일 | `filters.created_at: { $gte: cutoff }` | `filters.created_at_gte: cutoff` → `dbFilters.created_at = { $gte: cutoff }` | ✓ |
| pagination | `{ take: 200, skip: 0 }` *정렬 없음* | `{ skip: 0, take: 200, order: { created_at: "DESC" } }` **정렬 추가** | ⚠️ |
| register_session | post-fetch metadata 비교, route 잔류 | route 잔류 (unchanged) | ✓ |
| stock_location | post-fetch 비교, route 잔류 | route 잔류 (unchanged) | ✓ |
| tenders / paid_so_far | route 잔류 | route 잔류 (unchanged) | ✓ |

**⚠️ ORDER BY 추가**: draft-orders 는 기존에 ORDER 절이 없었는데 `created_at DESC` 가 붙었다.
route 는 fetch 후 전체를 가공하므로 UI 소비에는 영향 없음. 단 엄밀히 "동작 불변"은 아님.

---

## REQ 2 · #355 교훈 (정의 시점 JS 연산 · boot-smoke)

**정의 시점 JS 연산**: `list-pos-orders.ts` 모듈 최상위에는 정적 상수 `BASE_FIELDS: string[]` 과
`listPosOrdersHandler` 함수 선언, `createStep(...)` 호출뿐. `createStep` 내부는 `async` 함수로만
구성되어 정의 시점에 proxy 값을 JS 연산하는 코드 없음. ✓

**boot-smoke**: `listPosOrdersStep` 은 아직 어떤 workflow 에도 import 되지 않는다(코멘트:
"Phase 4 · Map 직렬화 해결 필요"). boot-smoke 는 workflow 모듈 import 로 proxy-at-define
오류를 감지하는데, 현재 step 파일은 route 가 `listPosOrdersHandler` 직접 호출하는 형태라
boot path 미진입. **boot-smoke 추가 불필요**. ✓

---

## REQ 3 · 스냅샷 대체 근거 — `orders-list.spec.ts`

| §3-C 체크포인트 | spec 커버 여부 |
|----------------|---------------|
| 응답 shape (13 필드 고정) | ✓ `Object.keys(r).sort()` 명시 assertion |
| phone mask 형식 (0813-****-2480) | ✓ #1·phone-norm 테스트 |
| 081/6281/+6281 세 저장 모양 모두 검색 | ✓ seedThreeShapes + 3-way q 비교 |
| loyalty_earn 객체 → 숫자 | ✓ #1 |
| loyalty_earn applied=false → null | ✓ #5 |
| loyalty_earn 없음 → null | ✓ #4 |
| loyalty_earn − recover → 순적립 | ✓ #6 |
| q=display_id 필터 | ✓ #3 · phone-norm display_id 회귀 |
| q=phone 부분검색 | ✓ #2 |
| skip/take pagination | △ limit/offset 파라미터 사용 중이나 count 필드 미단언 |
| draft-orders 응답 shape | ✗ **IT 없음** |
| draft-orders is_draft_order filter | ✗ **IT 없음** |

**머지 전 권장 추가 테스트** (필수는 아님 — draft-orders 추출 부분이 proxy call 수준으로 단순):
> `draft-orders.spec.ts` — is_draft_order=true 필터 작동 + 7일 cutoff + 응답 shape 불변.
> CI pos-integration 통과 대체 근거로 삼을 경우 필수.

---

## REQ 4 · CI `gh pr checks 356`

| 잡 | 결과 | 원인 |
|----|------|------|
| check | fail | GitHub Actions **빌링 한도 초과** (러너 미할당 · steps: []) |
| changes-filter | fail | 빌링 블록 (runner_id=0) |
| markers-and-forbidden | fail | 빌링 블록 (runner_id=0, steps: [], 3초 완료) |
| unit-commerce-core | skipping | changes-filter 실패 종속 |
| pos-integration | skipping | changes-filter 실패 종속 |
| e2e-admin-loyalty | skipping | changes-filter 실패 종속 |
| docker-smoke-* | skipping | changes-filter 실패 종속 |

**로컬 검증 (브랜치 체크아웃 후 직접 실행)**:
- `upstream-tracking-check.sh` PASS
- `naming-check.sh` PASS (meros 0건 · Medusa 모듈명 규격 정합)

단위 테스트·통합 테스트는 빌링 해소 후 CI 재실행 필요.

---

## 판정

**APPROVE · ready 전환 가능**

조건:
1. CI 빌링 해소 → 재실행 → `unit-commerce-core` + `pos-integration` PASS 확인
2. draft-orders ORDER BY 추가는 허용 범위 (실질 영향 없음, 오히려 결정론적 정렬로 개선)
3. draft-orders IT 부재 → 머지 전 권장 추가 (필수 차단 아님)

코드 품질: handler 추출이 깔끔하고 route 고유 로직(loyalty·tenders·location·session)은
잘 분리됨. BASE_FIELDS 합집합 전략으로 양방향 하위호환 ✓.
