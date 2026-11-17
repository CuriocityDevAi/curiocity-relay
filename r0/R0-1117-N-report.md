H #326 APPROVE · I #327 APPROVE

## H #326 — LiveSnapshotSource 서버 래퍼 unwrap

### 버그 원인 확인
`getSnapshot()`이 `(await res.json()) as OrderSnapshot`로 직접 캐스팅 → 실제 서버는 M0-1116-C부터 `{ snapshot, server_now, config_version }` 래퍼 반환 → 클라이언트가 래퍼 객체 자체를 snapshot으로 쓰면서 `status`, `items`, `grand_total` 모두 undefined → 상태 머신이 checkout 으로 전환 안 됨.

### REQ 체크

**서버 응답 타입 ↔ 클라이언트 unwrap 일치**
- `SnapshotApiResponse` 인터페이스(`{ snapshot, server_now, config_version }`) 신규 export.
- `"snapshot" in body` 가드로 래퍼/bare 판별 후 `{ ...snapshot, config_version }` 반환.
- `config_version` 주입 — `useLiveDisplayConfig`에 필요한 값 보존. ✅

**계약 테스트가 실제 응답 모양을 쓰는지**
- 기존 테스트: `json: async () => snap` (bare `OrderSnapshot`) — 이 때문에 버그를 못 잡음.
- 수정 후: `json: async () => envelope` (`SnapshotApiResponse` 형태) — 실제 서버 모양 사용. ✅
- `null envelope.snapshot` 케이스 추가, pre-M0-1116-C bare 폴백 케이스 추가. ✅

**상태 머신 main→checkout→paid→번호→잔액**
- E2E `snapshots.spec.ts` 신규 2종:
  - `envelope response triggers main→cart transition`: `status: "checkout"` 래퍼 → `cart-screen` 표시 확인. ✅
  - `envelope with null snapshot stays on main`: null → `main-screen` 유지 확인. ✅
- paid→번호→잔액 흐름은 기존 `customer-display G1a web export` 테스트(변경 없는 lines 1-139)가 커버.

**mock 모드 회귀**
- `"snapshot" in body` 조건 미충족 시 `return body as OrderSnapshot` 폴백 — mock에서 bare snapshot 반환 시 그대로 통과.
- "falls back gracefully for old-style bare snapshot" 테스트로 명시 검증. ✅

**CI**
- `customer-display` unit: pass · `e2e-admin-loyalty`: pass · `pos-integration`: pending(진행 중).

**기타**
- 파일 내 TODO(adapters 이동 권고) — 블로킹 없음, 추후 정리용 메모. 비-블로킹.

**판정: APPROVE**

---

## I #327 — toPosCustomer loyalty_consent_at 추가

### REQ 체크

**동의 최초 시각 유지(덮어쓰기 없음)**
- `toPosCustomer`는 순수 읽기 변환 함수 — DB 쓰기/갱신 없음.
- `meta.loyalty_consent_at`을 읽어 DTO에 포함할 뿐이며, 최초 기록 시점은 consent 등록 경로에서 관리(변경 없음). ✅

**검색·생성 응답에 포함**
- `PosCustomer` 인터페이스에 `loyalty_consent_at: string | null` 추가.
- `toPosCustomer`가 search·create 양쪽 응답에서 쓰이므로 양쪽 포함. ✅
- 통합 테스트: `search?q=...` 엔드포인트에서 `loyalty_consent_at` 반환 검증. ✅

**돈/적립 계산 변경 0**
- 메타데이터 필드 추가만 — 포인트·잔액·할인 계산 로직 미수정. ✅

**운영 DB 일괄 수정 없음**
- 마이그레이션 파일 없음 — `loyalty_consent_at`는 기존 `metadata` JSON 컬럼에 이미 저장 가능한 필드, 단순히 응답에서 누락됐던 것. ✅

**타입 안전성**
- `(meta.loyalty_consent_at as string | undefined) ?? null` → `string | null` 올바름. ✅

**CI**
- `unit-commerce-core`: pass · `customer-display`: pass · `pos-integration`: pending(진행 중).

**판정: APPROVE**
