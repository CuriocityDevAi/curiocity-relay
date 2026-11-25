PASS

# M2-1125-C Report — CD-3 매장 이미지 실 렌더 · CD-10 이슬람력 자동 발동

**PR**: https://github.com/CuriocityDevAi/storeport/pull/424  
**Branch**: `feat/M2-1125-C-cd-store-image-islamic`  
**Commit**: `7137236`

---

## CD-3: 매장 이미지 실 렌더

### 변경 파일
- `apps/customer-display/src/screens/MainScreen.tsx`
  - `VariantB` 함수에 `imgError` state 추가
  - `storeConfig.store_image_url && !imgError` 조건으로 `<Image>` 렌더
  - 이미지 로드 실패 시 `onError={() => setImgError(true)}` → placeholder 폴백
  - `MainScreenProps` 에 `islamicDates?` prop 추가
- `apps/customer-display/src/mocks/adapter.ts`
  - `StoreConfig` 인터페이스에 `store_image_url: string | null` 추가
  - `DEFAULT_STORE` 에 `store_image_url: null` 추가
  - `buildMockState` opts 에 `imageUrl?` 추가
  - `readInitialMockState` 에서 `?imageUrl=` URL 파라미터 읽기
- `apps/customer-display/app/index.tsx`
  - `storeConfig` useMemo 에 `store_image_url: liveConfig.store_image_url ?? null` 추가
  - `DEFAULT_LIVE_STORE` 에 `store_image_url: null` 추가

### 동작
- `store_image_url` 있음 → `<Image source={{ uri: ... }}>` 렌더 (testID="store-image")
- `store_image_url` 없음 → 기존 "Store image / logo" placeholder 유지
- 이미지 로드 실패 → `imgError=true` → placeholder 폴백

---

## CD-10: 이슬람력 자동 발동

### 변경 파일
- `apps/commerce-core/src/lib/customer-display/islamic-dates.ts`
  - `KEMENAG_TABLE` export (2026-2028, start/end 범위)
  - Source URL: https://kemenag.go.id/ (Penetapan 1 Ramadhan / Idul Fitri / Maulid)
  - `IslamicSuggestions` 타입: `ramadan/lebaran/maulid: { from, to }` (기존 string → 범위 객체)
  - `addDays(ymd, n)` 헬퍼 추가
  - `getIslamicSuggestionsForYear`: 표 lookup 우선 → 계산 폴백 (durations: ramadan+29, lebaran+9, maulid+6)
- `apps/commerce-core/src/modules/customer_display_settings/service.ts`
  - `DisplayConfig.islamic_dates` 필드 추가
  - `getDisplayConfig` 에 `islamic_dates: KEMENAG_TABLE` 반환
- `apps/customer-display/src/lib/display-config-source.ts`
  - `DisplayConfigShape.islamic_dates?` 옵셔널 필드 추가
- `apps/customer-display/app/index.tsx`
  - `<MainScreen>` 에 `islamicDates={liveConfig?.islamic_dates ?? undefined}` 전달
- `apps/customer-display/src/screens/MainScreen.tsx`
  - `useActiveEvent({ islamicDates: islamicDates ?? {} })` — 서버 주입 날짜 사용

### Kemenag 날짜 표
| Year | Ramadan | Lebaran | Maulid |
|------|---------|---------|--------|
| 2026 | 2026-02-18 ~ 2026-03-19 | 2026-03-20 ~ 2026-03-29 | 2026-09-04 ~ 2026-09-10 |
| 2027 | 2027-02-08 ~ 2027-03-08 | 2027-03-09 ~ 2027-03-18 | 2027-08-14 ~ 2027-08-20 |
| 2028 | 2028-01-28 ~ 2028-02-25 | 2028-02-26 ~ 2028-03-06 | 2028-08-02 ~ 2028-08-08 |

### Admin 덮어쓰기
Admin EventForm 에서 Islamic 이벤트(Ramadan/Lebaran/Maulid) 선택 시 `fetchIslamicSuggestions` 로 `{from, to}` 기본값 채움 (기존 버그: 서버가 string 반환 → 클라이언트가 `.from` 접근 실패 → 수정됨).  
Admin 등록 이벤트는 `active_event_key` 로 반환 → `effectiveEventKey = eventKey ?? decorKey` 로 항상 우선.

---

## 테스트 결과

### 신규 테스트
| 파일 | 케이스 |
|------|--------|
| `kemenag-table.unit.spec.ts` | 표 존재, 범위 유효성, start≤end, 연속성(Ramadan end < Lebaran start), 2029 fallback |
| `display-config-islamic.unit.spec.ts` | `getDisplayConfig` → `islamic_dates === KEMENAG_TABLE` |
| `useActiveEvent.islamicServer.test.ts` | ramadan 범위 안, lebaran 범위 안, 범위 밖 null, 빈 테이블 null, eventsEnabled=false null |

### 전체 테스트
- **customer-display**: 13 files, 238 tests — ✅ ALL PASS
- **commerce-core**: 57 suites, 636 tests — ✅ ALL PASS
- **typecheck**: 0 error TS (wing TS2786 기존 무관)

---

## Kyu 실기 체크리스트 (PR 본문에 포함)

- [ ] `?hasImage=true&imageUrl=<URL>` → 대기 화면 왼쪽 실 이미지 렌더
- [ ] `?hasImage=true` (imageUrl 없음) → placeholder 유지
- [ ] `?testDate=2026-03-05&eventsEnabled=true` 서버 연결 시 → Ramadan 장식 자동 발동
- [ ] Admin 에서 Ramadan 이벤트 날짜 등록 → `active_event_key` 우선 발동
