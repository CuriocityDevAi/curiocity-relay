# M2-1124-O 멀티 매장(PIM · Plaza Senayan) 진단 리포트
작성: 2026-11-24

> 진단만 — 코드 수정 없음
> 조사 대상: `apps/commerce-core` (hub-m2) · `agilo-medusa-pos-fork`

---

## 종합 판정

**Commerce Core 서버는 멀티 매장 아키텍처를 절반 갖춰 있다.** `pos_settings`, `customer_display_settings` 모두 `scope = "store" | "location:<id>"` 2단 체계를 코드 레벨에서 보유한다. 그러나 **Admin UI와 POS 앱이 아직 단일 매장 전제로 동작**하고 있어, 2개 매장(PIM · Plaza Senayan)을 운영하려면 Round 1~3 작업이 필요하다.

---

## 1. 매장의 정체

### 1-A. Medusa 코어 엔티티 관계

| 개념 | Medusa 엔티티 | 역할 |
|------|------------|------|
| 매장 | **Stock Location** | 재고 소재지 · POS 세션 소속 단위 · `register_session.stock_location_id` |
| 판매 채널 | Sales Channel | 주문 귀속 채널 · Draft Order 생성 시 `sales_channel_id` 로 지정 |
| 지역/통화 | Region | 통화(IDR) · 세금 체계 · Draft Order 생성 시 `region_id` 로 지정 |
| 구매채 | Inventory Level | Stock Location × Inventory Item 교차 — 매장별 재고량 |

**실행 확인**: `src/modules/register_session/models/register-session.ts:17` — `stock_location_id: model.text()` 가 register session 에 직접 박혀 있음. 즉 "매장 = Stock Location" 이 현행 SoT.

### 1-B. 시딩/마이그레이션에서의 흔적

| 항목 | 위치 | 내용 |
|------|------|------|
| 초기 시드 | `src/migration-scripts/initial-data-seed.ts:124` | European Warehouse 1개 생성 · IDR 미반영(기본 scaffold) |
| Soopsok 시드 | `src/scripts/seed-soopsok.ts:55` | `listStockLocations({})` → 첫 번째 로케이션 사용 or 신규 생성 |

### 1-C. 매장 추가 가능성

| 질문 | 판정 |
|------|------|
| Medusa Admin UI (Settings → Locations) 로 추가 가능? | **예** — Medusa 코어 `createStockLocationsWorkflow` 사용 · 커스텀 모듈 불필요 |
| 추가 시 자동으로 따라오는 것 | 재고 슬롯(Inventory Level 테이블 행) · 고객 화면 device 토큰 결합(매장별 `customer_display_device`) |
| **안 따라오는 것** | POS Settings 매장별 row (service에 `patchLocationSettings` 있지만 API route 미연결) · Register Session(POS 태블릿 수동 세팅 필요) · 매장별 Xendit 키 · 로열티 적립률 위치 override · Order 번호 시퀀스 (scope_id 미분리) |

---

## 2. POS Settings — 매장별 vs 공통 표

| 항목 | 현재 범위 | 파일:줄 | 매장별 필요 여부 |
|------|-----------|---------|-----------------|
| 세금 (PB1 `pb1_pct` · SC `service_charge_pct`) | **store 전역** (API route 는 `patchStoreSettings` 고정) | `src/api/admin/pos/settings/route.ts:124` | **필요** — PIM 10% PB1, PS 다를 수 있음 |
| 세금 표시 (`show_tax_label` · `tax_label` · `tax_rate_pct`) | **store 전역** | `src/modules/pos_settings/service.ts:12–35` | 매장별 PKP 여부에 따라 필요 |
| 영수증 로고 (`logo_file_id` · `logo_url` · `receipt_logo_mode`) | **store 전역** | `src/modules/pos_settings/service.ts:21–25` | **필요** — 매장별 로고 |
| 영수증 헤더/푸터 (`receipt_header` · `receipt_footer`) | **store 전역** | `src/modules/pos_settings/service.ts:23–24` | **필요** — 매장명/주소 |
| 매장명 (`store_name`) | **store 전역 (DEFAULT 없음)** · `settings.store_name` 으로 참조 | `src/workflows/pos-fulfill/steps/mint-sale-receipt.ts:121` | **필요** — PIM vs PS |
| Pre-order DP% (`dp_percent`) | **store 전역** | `src/modules/pos_settings/service.ts:12` | 선택적 매장별 필요 |
| Xendit 키 (`settings.xendit` JSONB) | **store 전역** (`getOrCreateStoreSettings` 고정) | `src/modules/payment_xendit/lib/creds.ts:110–111` | **필요** — 법인 분리 시 각 매장 계정 |
| 매니저 PIN | store 단위 HMAC (`storeId = stock_location_id`) | `src/lib/manager-pin.ts:71–84` | 이미 매장별 — `storeId` 로 계산함 |
| 로열티 적립률 (`earn_rate_pct`) | **store 전역** (`loyalty_settings.scope = "store"` 하드코딩) | `src/modules/loyalty_settings/service.ts:97–98` | 매장별 다를 경우 필요 |
| 손님 화면 페어링 | **매장별 완성** (`customer_display_device.stock_location_id`) | `src/modules/register_session/models/customer-display-device.ts:9` | 완료 |
| Order 번호 시퀀스 (Receipt No) | `receipt_sequence.scope_id` nullable — 현재 호출부는 `scope_id` 미전달 | `src/modules/receipt/service.ts:164–166` | **필요** — 매장별 번호 리셋 |

**핵심 결론**: `pos_settings` 서비스는 `getForLocation` / `patchLocationSettings` 를 보유하지만 Admin API route (`GET/PUT /admin/pos/settings`) 는 `location_id` 쿼리 파라미터를 받지 않아 항상 `"store"` scope 에 쓴다. `customer_display_settings` route는 이미 `?location_id=` 를 지원한다.

---

## 3. POS 태블릿 ↔ 매장 연결

### 현재 방식

1. **기기 로컬 저장소** (`expo-secure-store`): `sales_channel_id`, `stock_location_id`, `region_id` 를 태블릿에 저장 (`contexts/settings.tsx:40–42`)
2. **세팅 화면** (`app/settings/stock-location.tsx`): Settings 탭 → Stock Location 선택 → SecureStore 갱신
3. **레지스터 오픈**: `app/register/open.tsx:52` — `stock_location_id: stockLocation.id` 를 서버 `POST /admin/register-sessions` 에 전송
4. **Draft Order 생성**: `api/hooks/draft-orders.tsx:136–137` — `region_id` + `sales_channel_id` 를 담지만 `stock_location_id` 는 Draft Order body 에 미전송 (서버가 register session 에서 조인)
5. **손님 화면 페어링**: `customer_display_device.stock_location_id` — 이미 매장별 완성

### 권고 방식 (멀티 매장 전환 시)

| 현재 갭 | 권고 |
|---------|------|
| 단일 URL (`MEROS_API_URL = "https://api.meros.id"`) — 서버 엔드포인트 1개 | 멀티 매장이어도 서버는 1개 가능 · 태블릿별 `stock_location_id` 선택으로 충분 |
| 태블릿마다 Settings → Stock Location 수동 선택 | 현재 구조 그대로 유효 · PIM 태블릿엔 PIM 로케이션 선택 |
| `GET /admin/pos/settings` 가 항상 store 전역 반환 | 쿼리 파라미터 `?location_id=` 추가 + POS 앱이 세팅된 `stock_location_id` 를 함께 전송해야 함 |
| Orders 목록이 `stock_location_id` 필터 없이 전체 조회 | 서버 route 에 `?stock_location_id=` 필터 추가 필요 (현재: 전 매장 주문 혼재) |

---

## 4. Admin 계정 모델

### 현재 구조

| 항목 | 현황 |
|------|------|
| Medusa 코어 User 모듈 | 존재 · invite 지원 · role/permission = Enterprise(paid) 전용 |
| 자체 RBAC 모듈 | `src/modules/rbac/` — 등록됨 (`medusa-config.ts:135`) 그러나 **스캐폴드 뿐** (`RbacService` 메서드 없음 · migration 없음) |
| 현재 Admin 접근 제어 | Medusa 기본: JWT 인증 통과 → 전체 Admin 엔드포인트 접근 가능 · 매장 범위 제한 없음 |
| 외부 RBAC 패키지 | package.json에 없음 (`@devx-retailos/rbac` · `medusa-plugin-rbac` 미설치) |

### RBAC 선택지 비교 (Medusa 2.17.2 기준)

| 패키지 | 접근 | Medusa 2.x 호환 | 성숙도 | 특징 |
|--------|------|-----------------|--------|------|
| **자체 RBAC 모듈** (현재 스캐폴드) | 소스 직접 | 완전 호환 | 미완성 | Role×Scope×Capability 3차원 설계 이미 주석에 명시됨 · Phase 1a 대상 |
| `@devx-retailos/rbac` | npm | 불확실 (Medusa 1.x 계열 플러그인) | 낮음 | npm에 활동 적음 |
| `medusa-plugin-rbac` | npm | Medusa 1.x 전용 · 2.x 미지원 | 낮음 | 경로 단위 ACL · 2.x 미이식 |

**권고**: 자체 `src/modules/rbac/` 를 Phase 1a에서 완성하는 것이 가장 안전. 필요 최소 테이블: `role` (store/location scope 포함) · `role_assignment` (user × role).

---

## 5. 구현 라운드 분할

### Round 1 — 서버 설정 API 위치 scope 확장 (1~2 dev-day)

| 파일 | 변경 |
|------|------|
| `src/api/admin/pos/settings/route.ts` | `GET/PUT` 에 `?location_id=` 쿼리 파라미터 추가 → `patchLocationSettings` / `getForLocation` 호출 |
| `src/api/admin/pos/settings/xendit/route.ts` | `?location_id=` 추가 → 매장별 Xendit 키 |
| `src/api/admin/pos/loyalty/settings/route.ts` | 로열티도 `scope` 분리 (단기 불필요 시 defer 가능) |
| `src/modules/receipt/service.ts` | `createReceiptForOrder` 호출 시 `scope_id = register_session_id` 전달 경로 연결 |

### Round 2 — POS 앱 위치 인식 (1~2 dev-day)

| 파일 | 변경 |
|------|------|
| `api/hooks/draft-orders.tsx` | 주문 목록 조회에 `?stock_location_id=` 필터 추가 |
| `contexts/settings.tsx` | Settings fetch 시 `GET /admin/pos/settings?location_id={stock_location_id}` 로 전환 |
| `app/(tabs)/settings.tsx` / Settings screen | 현재 위치를 헤더에 표시 (어느 매장 세팅인지 명확화) |

### Round 3 — Admin UI + RBAC 최소 구현 (3~5 dev-day)

| 파일 | 변경 |
|------|------|
| `src/admin/` (Admin 위젯) | Stock Location 선택 드롭다운 추가 → 위치별 POS Settings 편집 |
| `src/modules/rbac/` | Phase 1a: `role` · `role_assignment` 모델 · middleware · API route |
| `src/modules/rbac/migrations/` | 신규 테이블 DDL |

---

## 현황 요약 매트릭스

| 기능 | 코어 있음 | 우리 코드 있음 | 신규 필요 |
|------|-----------|--------------|-----------|
| Stock Location 2개 생성 | O (Medusa Admin) | — | — |
| register_session 매장별 | O | O | — |
| POS 태블릿 ↔ 매장 연결 | — | O (SecureStore) | — |
| 손님 화면 페어링 매장별 | — | O | — |
| POS Settings 매장별 서비스 | — | O (service 메서드) | API route 연결 |
| POS Settings 매장별 Admin UI | — | X | O |
| Xendit 키 매장별 | — | X | API route 연결 |
| 영수증 번호 매장별 | — | O (scope_id 컬럼) | 호출부 scope 전달 |
| Orders 목록 매장 필터 | — | X | POS 앱 hook |
| 로열티 적립률 매장별 | — | X (store 전용) | 선택적 |
| Admin 매장별 계정 | — | X (스캐폴드만) | Phase 1a RBAC |

---

*실행 확인 = 코드에서 직접 발견 · 코드 추정 = 구조로 추론*
