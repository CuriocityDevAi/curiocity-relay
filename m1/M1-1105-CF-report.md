# M1-1105-CF 완료 보고 — 손님 화면 매장 설정 API (S2)

**결과**: PR #266 · CI 전부 통과 · 단위 테스트 265개 전부 통과

---

## 계약 준수 표

| 항목 | 계약 | 상태 |
|------|------|------|
| CD-2 컬러 테마 20종 · 기본 `pastel` | `COLOR_THEME_KEYS` 20종 · `DEFAULT_CD_SETTINGS.color_theme_key = "pastel"` | ✅ |
| CD-3 매장 이미지 `store_image_file_id` · null=기본형 | `store_image_file_id: null`, `store_image_url: null` | ✅ |
| CD-5 매장별 설정 scope 단위 | `scope = "location:<id>"` (pos_settings 패턴 동일) | ✅ |
| CD-6/7 이벤트 7종 · From~To · 겹침 금지 400 | `EVENT_KEYS` 7종 · `datesOverlap()` 검증 · POST 400 | ✅ |
| CD-10 이슬람력 예상 날짜 자동 채움 | `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')` + 타뷸라 폴백 | ✅ |
| flow P-1~4 타이머 4개 기본값 | `receipt_display_sec=3` · `keypad_timeout_sec=30` · `done_to_idle_sec=4` · `post_pay_link_grace_sec=10` | ✅ |
| §5 겹침 금지 · 00:00 경계 | 겹침 테스트 · 경계 테스트 | ✅ |
| §7 매장별 설정 | `getDisplayConfig()` 순수 함수 | ✅ |
| S2 범위 | 테마/이벤트 CRUD · 겹침 검증 · 이슬람력 자동 채움 | ✅ |
| 이슬람력 2027 | ramadan=2027-02-08 · lebaran=2027-03-09 · maulid=2027-08-14 | ✅ |
| Admin UI / `src/api/customer-display/**` 금지 | 미수정 | ✅ |
| `register_session/**` · `middlewares.ts` 금지 | 미수정 | ✅ |
| `link-customer-order.ts` · `orders/[id]/customer/**` 금지 | 미수정 | ✅ |
| `apps/customer-display/**` 금지 | 미수정 | ✅ |

---

## PR

**PR #266**: https://github.com/CuriocityDevAi/storeport/pull/266  
브랜치: `m1/M1-1105-CF-customer-display-s2-settings` → `main`

---

## gh pr checks 결과

| job | 결과 |
|-----|------|
| check (feature-map) | pass (13s) |
| markers-and-forbidden | pass (8s) |
| unit-commerce-core | pass (1m1s) |
| changes-filter | pass (7s) |
| pos-integration | pass (5m9s) |
| docker-smoke-* | skipping |

---

## 커밋 목록

| 커밋 | 내용 |
|------|------|
| CF-a | model + migration (customer_display_settings) |
| CF-b | service + index (COLOR_THEME_KEYS · EVENT_KEYS · datesOverlap · getActiveEvent · getDisplayConfig) |
| CF-c | islamic-dates lib + unit tests 44개 |
| CF-d | API routes (settings · events · events/[id] · islamic-suggestions) |
| CF-e | medusa-config.ts 모듈 등록 |
| CF-f | feature-map.yaml customer-display-settings + setup.js 등록 |
| CF-g | TS2769 타입 캐스팅 수정 (CdEvent[] → Record<string, unknown>) |
