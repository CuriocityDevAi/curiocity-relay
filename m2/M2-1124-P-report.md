PLAN

# M2-1124-P — Admin POS Settings Receipt 탭 구현 계획서

작성: 2026-11-24 · 근거: decision-receipt-tab-20261124 (Kyu 18:13 원문) · R1~R6

---

## 0. 전제 조건

**#420 (M0-1124-H) 머지 완료 후 착수.**

이 PR이 도입한 것:
- `@medusajs/ui Tabs` 구조 (General · Tax · Payments · Pre-order · Order numbers, `?tab=` URL 반영)
- 최상단 Store picker (Brand / 개별 location)
- `null = 브랜드 상속` 오버라이드 모델 (`patchLocationSettings` nullDeletes)
- location scope row는 **빈 settings**로 생성 (기존 DEFAULT 복사 버그 수정)
- `getForLocation` 응답에 `overrides` 포함 (UI가 "override vs 상속" 판별용)

현재 각 탭 내용 (#420 기준):

| 탭 | 담당 필드 |
|---|---|
| General | receipt_header, logo_url, store_address |
| Tax | show_tax_label, service_charge_pct, pb1_pct |
| Payments | Xendit SK/webhook/expiry |
| Pre-order | dp_percent |
| Order numbers | OrderNumbersSection (location nickname + 월별 시작 serial) |

---

## 1. 코어/기존 코드 대사표

### 1-A. R1 — 지점 닉네임 → General 탭

| 항목 | 판정 |
|---|---|
| nickname 필드 위치 | **이미 있음** · `OrderNumbersSection.tsx` (Row.nickname) · `/admin/order-numbers` API |
| General 탭 UI | **우회** — 기존 store_address 섹션 옆에 nickname Input 추가 (별도 컴포넌트 불필요) |
| 저장 API | **이미 있음** · `PATCH /admin/order-numbers/:location_id` (OrderNumbersSection이 사용하는 엔드포인트). General 탭에서도 같은 endpoint 호출. |
| nickname 중복 관리 | **이미 있음** · OrderNumbersSection이 per-row로 저장. nickname만 별도 저장도 가능. |

**작업**: `OrderNumbersSection.tsx` nickname 입력 부분을 추출하거나, General 탭 내 location 선택 시 nickname Input을 직접 렌더. Store picker가 Brand 모드이면 nickname 필드 비활성화.

### 1-B. R2 — "Order numbers" → "Receipt" 탭 이름 변경

| 항목 | 판정 |
|---|---|
| Tab trigger 텍스트 | **신규** · `page.tsx` TABS 배열 `"order-numbers"` → `"receipt"`, trigger 텍스트 "Order numbers" → "Receipt" |
| `?tab=order-numbers` URL backward compat | **우회** · `normalizeTab`에 alias 추가 (`"order-numbers"` → `"receipt"`) |
| OrderNumbersSection 잔류 | 주문번호 형식/시작번호 설정은 Receipt 탭 하위 섹션으로 그대로 유지. 제목만 "Order number format" 소섹션으로 명칭 변경. |

### 1-C. R3 — General의 영수증 관련 → Receipt 탭 이동

이동 대상 필드:

| 필드 | 현재 위치 | 이동 후 |
|---|---|---|
| receipt_header | General | Receipt |
| logo_url | General | Receipt |
| receipt_footer | General (저장되지만 UI 미노출) | Receipt (새 Input 추가) |
| receipt_logo_mode | General (저장되지만 UI 미노출) | Receipt (새 Select 추가) |
| reprint_limit | — (저장만, UI 없음) | Receipt (관리자용 소섹션) |
| reprint_watermark / refund_watermark | — (저장만, UI 없음) | Receipt (고급 설정 소섹션 · collapsed) |

General 탭에 남는 것: **store_address**, **location nickname** (R1에서 추가).

### 1-D. R4 — 매장별 영수증 표시 항목 설정

#### 영수증 렌더 항목 목록 (buildSnapshot 전수 추출)

| 항목 | 코드 경로 | 위치 |
|---|---|---|
| store.name | snapshot.store.name | pos_settings or store metadata |
| store.address | snapshot.store.address | pos_settings → store_address 키 |
| store.logo_url | snapshot.store.logo_url | pos_settings → logo_url |
| header (3줄) | snapshot.header | receipt_header |
| footer | snapshot.footer | receipt_footer |
| logo_mode | snapshot.logo_mode | receipt_logo_mode |
| items (title·qty·price·discount) | snapshot.items | order.items |
| subtotal | snapshot.subtotal | order.subtotal |
| discount_total | snapshot.discount_total | — |
| service_charge 블록 | snapshot.service_charge | service_charge_pct |
| tax 블록 | snapshot.tax | show_tax_label / pb1_pct |
| grand_total | snapshot.grand_total | — |
| tenders (결제수단) | snapshot.tenders | order.metadata.tenders |
| cashier | snapshot.cashier | actor_id |
| order_type | snapshot.order_type | 'takeaway'·'preorder'·'delivery' |
| preorder 블록 | snapshot.preorder | order.preorder |
| delivery 블록 | snapshot.delivery | order.delivery |
| labels (고정 영문) | snapshot.labels | DEFAULT (변경 불가) |
| reprint/refund watermarks | snapshot.labels.copy_watermark | reprint_watermark / refund_watermark |

#### 매장별 override 권장안

| 필드 | 권장 | 근거 |
|---|---|---|
| logo_url | **location-overrideable** | 각 지점 고유 로고 가능 |
| receipt_header | **location-overrideable** | 지점 주소·전화번호가 다름 |
| receipt_footer | **location-overrideable** | 지점별 감사 메시지 |
| service_charge_pct | **location-overrideable** | 이미 M0-1124-G에서 가능 (G에서는 미구현, H 모델 적용) |
| pb1_pct | **이미 location-overrideable** (M0-1124-H) | — |
| store_address | **이미 location-overrideable** (M0-1124-G) | — |
| show_tax_label | **브랜드 고정 권장** | PKP 등록은 사업자 단위 |
| tax_label / tax_rate_pct | **브랜드 고정 권장** | 세무 단위 |
| dp_percent | **브랜드 고정 권장** | 운영 정책 단일화 |
| receipt_logo_mode | **브랜드 고정 권장** | 디자인 일관성 |
| reprint_limit / watermarks | **브랜드 고정 권장** | 보안/감사 정책 |

**상속 모델**: `null in location row` = 브랜드 값 추종 (M0-1124-H 패턴 그대로).  
UI: 각 항목 옆 "Use brand default" 체크박스(=toggle). 체크 시 → null 저장 → 브랜드 상속. 해제 시 → 편집 가능 Input 노출.

#### 데이터 모델 변경

**신규 DB 마이그레이션 불필요.** pos_settings.settings는 JSONB이므로 새 키를 추가해도 schema 변경 없이 저장됨.

단, `ALLOWED_PATCH_KEYS` (route.ts:11-30)에 신규 키 추가 필요:
- `receipt_footer` (기존 DEFAULT에 있으나 API whitelist 미등록)
- `receipt_logo_mode` (동상)
- `reprint_limit`, `reprint_watermark`, `refund_watermark` (동상)

`pos-settings-api.ts`의 `PosSettings` 타입에도 누락 없이 모두 선언되어 있으므로 타입 추가 불필요. API whitelist 추가 + UI 노출만.

### 1-E. R5 — 영수증 샘플 미리보기

**가장 중요한 판단: 렌더러 재사용 여부**

| 옵션 | 설명 | 판정 |
|---|---|---|
| Anchor `buildReceipt()` 직접 임포트 | apps/anchor → apps/commerce-core admin. 모노레포 내부지만 cross-app 의존성 발생. Anchor는 React Native 기반 → 웹 DOM 없음. | **불가** |
| 서버 snapshot만 재사용, HTML 별도 렌더 | `buildSnapshot()`은 서버의 pure function. 클라이언트에서 snapshot 구조를 HTML로 렌더하는 `<ReceiptPreview>` 작성. | **권장** |
| 서버 preview endpoint | `POST /admin/pos/settings/receipt-preview` → 서버가 mock 주문 + 현재 설정으로 `buildSnapshot()` 호출 → snapshot JSON 반환 → admin이 `<ReceiptPreview>`로 렌더. | **권장 구현** |

**왜 snapshot 계약이 충분한가**: Anchor의 `buildReceipt()`도 서버 snapshot을 읽어서 렌더한다. snapshot 구조가 양쪽의 "real source of truth"이다. `<ReceiptPreview>`가 같은 snapshot 키를 읽는 한, 실제 영수증과 어긋나지 않는다. 단, Anchor의 열 정렬/폰트/mm 단위 환경은 HTML로 완전히 재현 불가 — "충분히 근사한 시각적 미리보기"가 목표.

**서버 preview API 설계**:

```
POST /admin/pos/settings/receipt-preview
Body: { location_id?: string, settings_override?: Partial<PosSettings> }
Response: { snapshot: Record<string, unknown> }
```

- `settings_override`를 받으면 저장된 location 설정에 임시 merge (DB 미저장)
- Mock order: 고정 샘플 (Croissant ×2 @ 35,000 · Americano ×1 @ 20,000, takeaway)
- `buildSnapshot()` 호출 → snapshot 반환
- **저장 전 변경도 반영**: 클라이언트가 form state를 `settings_override`로 전송

**`<ReceiptPreview>` 컴포넌트**:
- 순수 React (shadcn/ui 의존 없음 · 영수증 폰트 모노스페이스)
- 80mm 용지 비율 모방 (`max-w-[280px]` or `max-w-[320px]`)
- snapshot 각 블록 순서 렌더: logo → store → header → items → 소계/세금/합계 → 결제수단 → footer
- 충분히 작은 컴포넌트 (< 150 LoC)

### 1-F. R6 — 선택 탭 스타일 강화

현재 `@medusajs/ui Tabs.Trigger`는 `data-[state=active]` 스타일이 연한 테두리만. 변경:

```tsx
// Tabs.List에 커스텀 className
<Tabs.List className="px-6">
  <Tabs.Trigger
    value="general"
    className="data-[state=active]:bg-ui-bg-highlight data-[state=active]:text-ui-fg-interactive"
  >
```

- `bg-ui-bg-highlight`: Medusa 디자인 토큰 (강조 배경)
- `text-ui-fg-interactive`: 인터랙티브 텍스트 토큰
- **하드코딩 금지** (`#hex`, Tailwind `blue-500` 등 사용 금지)
- Medusa UI 토큰 목록: `@medusajs/ui/dist/index.css` CSS variables 참조

---

## 2. 건드릴 파일 목록

### 리포: storeport (apps/commerce-core)

| 경로 | 변경 내용 | 라운드 |
|---|---|---|
| `src/admin/routes/pos-settings/page.tsx` | R1~R3·R6 메인 수술: 탭 rename, 필드 이동, 닉네임 추가, 탭 하이라이트, R5 프리뷰 패널 연결 | A + C |
| `src/admin/routes/pos-settings/sections/OrderNumbersSection.tsx` | nickname 필드 추출/분리 (R1) | A |
| `src/api/admin/pos/settings/route.ts` | ALLOWED_PATCH_KEYS에 `receipt_footer`, `receipt_logo_mode`, `reprint_limit`, `reprint_watermark`, `refund_watermark` 추가 (R3) | A |
| `src/admin/lib/pos-settings-api.ts` | (필요 시) PosSettings 타입 missing 필드 보완 | A |
| `src/api/admin/pos/settings/receipt-preview/route.ts` | **신규** · POST preview endpoint (R5) | C |
| `src/admin/routes/pos-settings/components/ReceiptPreview.tsx` | **신규** · HTML 영수증 프리뷰 컴포넌트 (R5) | C |
| `docs/feature-map.yaml` | 신규 파일 등록 (CI 필수) | A·C |

### 리포: storeport (apps/anchor)

**POS 앱 수정 불필요.** 이유:
- Anchor는 서버 snapshot을 그대로 읽어서 열 출력. 새 설정 키가 snapshot에 반영되면 자동 적용.
- R4로 `receipt_header`, `logo_url`이 location-override 가능해져도, `buildSnapshot()`이 merged settings로 snapshot을 만들기 때문에 Anchor가 받는 snapshot은 이미 올바른 값.
- `receipt_show_logo`류 새 boolean 필드를 추가하는 경우에만 Anchor의 `buildReceipt()` 수정 필요. 현재 계획(null=상속 패턴)에서는 불필요.

---

## 3. 라운드 분할안

### Round A — R1 + R2 + R3 + R6 (UI 재편성 · 예상 35~40분)

**전제**: #420 (M0-1124-H) main 반영 완료.

작업 범위:
1. TABS 배열 `"order-numbers"` → `"receipt"` · trigger 텍스트 변경 · `normalizeTab` alias 추가
2. General 탭: receipt_header·logo_url 섹션 삭제 → store_address + nickname 섹션만 유지
3. Receipt 탭: receipt_header·logo_url·receipt_footer·receipt_logo_mode·reprint_limit·watermarks 섹션 추가. OrderNumbersSection은 "Order number format" 소섹션으로 흡수.
4. `ALLOWED_PATCH_KEYS` 확장 (5개 키)
5. Tabs.Trigger `data-[state=active]` 색 토큰 추가 (R6)
6. nickname: General 탭에 location 선택 시 편집 가능 Input 추가. Brand 모드 → 비노출 or disabled.

저장 로직: receipt 필드들은 기존 `onSave()` 흐름에 그대로 추가. nickname은 별도 `onSaveNickname()` (OrderNumbersSection 패턴 재사용, `PATCH /admin/order-numbers/:location_id`).

테스트: `pnpm typecheck` + 기존 pos-settings e2e 확인.

---

### Round B — R4 (매장별 항목 override UI · 예상 35~45분)

전제: Round A 머지 완료.

작업 범위:
1. Receipt 탭 내 "Location overrides" 서브섹션 추가. Store picker에서 Brand 선택 시 → 숨김. Location 선택 시 → 표시.
2. 오버라이드 가능 항목별 UI:
   - "Use brand default" 체크박스 (`checked = locationOverrides[key] == null`)
   - 체크 해제 → Input 활성화. 체크 → null 저장 (`patchLocationSettings`의 nullDeletes 활용).
3. 대상 항목: logo_url, receipt_header, receipt_footer, service_charge_pct (pb1_pct·store_address는 이미 Round A에서 General/Tax에서 처리).
4. `GET/PUT /admin/pos/settings?location_id=<id>` 엔드포인트 확인 (M0-1124-G에서 구현됨인지 확인 후 활용).

테스트: location-scope override 저장/상속 E2E.

---

### Round C — R5 (영수증 미리보기 · 예상 40~45분)

전제: Round B 머지 완료 (or Round A만으로도 착수 가능).

작업 범위:
1. `POST /admin/pos/settings/receipt-preview` 엔드포인트 신설:
   - body: `{ location_id?: string, settings_override?: Partial<PosSettings> }`
   - 저장된 location settings 조회 → `settings_override` merge (DB 미저장)
   - mock order 생성 (하드코딩 2~3개 아이템)
   - `receiptSvc.buildSnapshot(...)` 호출 → snapshot 반환
2. `<ReceiptPreview>` React 컴포넌트 신설 (280px 너비, 모노스페이스)
3. Receipt 탭 layout: 좌 2/3 편집 패널 + 우 1/3 프리뷰 패널 (flex-row)
4. 폼 state가 변경될 때마다 debounce(500ms) → preview API 호출 → 렌더 갱신

테스트: 프리뷰가 저장 전 변경을 반영하는지 수동 검증.

---

## 4. Kyu에게 묻는 UX 질문 (최대 3개)

### Q1. Receipt 탭 미리보기 레이아웃 (R5)
미리보기를 오른쪽 고정 패널로 항상 표시 vs. "Preview" 버튼 클릭 시 슬라이드인?

**권장**: 항상 표시 (우측 1/3 패널). 편집과 동시에 결과가 보여야 의미 있다. 화면 폭 < 1024px 이면 collapse 버튼 추가.

---

### Q2. R4 매장별 override 범위
아래 중 어디까지 location 단위로 오버라이드할 수 있게 할지?

| 옵션 | 대상 필드 |
|---|---|
| A (최소) | 이미 있는 store_address + pb1_pct만 |
| B (권장) | A + logo_url · receipt_header · receipt_footer · service_charge_pct |
| C (확장) | B + receipt_show_logo · receipt_show_service_charge (새 boolean 키 추가) |

**권장**: B. null=브랜드 상속 패턴으로 충분. C는 신규 boolean 필드 추가와 Anchor 렌더 로직 수정이 필요해 별도 라운드가 필요.

---

### Q3. 영수증 미리보기 샘플 주문 내용 (R5)
고정 샘플 (서버 하드코딩: "Croissant ×2 · Latte ×1") vs. 가장 최근 실제 완료 주문 조회?

**권장**: 고정 샘플. 최근 주문 조회는 복잡도 증가 + 아이템 수가 많으면 미리보기가 너무 길어진다. 나중에 "커스텀 샘플 편집" 기능으로 확장 가능.

---

## 5. 종합 체크리스트

- [ ] #420 (M0-1124-H) main 반영 확인
- [ ] Round A 착지 → 실기 (탭 rename, 필드 이동, 하이라이트)
- [ ] Round B 착지 → 실기 (location override UI)
- [ ] Round C 착지 → 실기 (미리보기)
- [ ] `docs/feature-map.yaml` 각 라운드에서 신규 파일 등록
- [ ] `pnpm typecheck` 에러 0 (각 라운드 전)
- [ ] `bash scripts/naming-check.sh` → meros 0건 (UI 텍스트에 "Receipt" 사용, branding 없음)
