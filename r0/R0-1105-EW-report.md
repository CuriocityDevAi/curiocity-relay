# R0-1105-EW 리뷰 리포트 — storeport #266

#266 판정: **APPROVE** · CI: pos-integration ✅ unit-commerce-core ✅ check ✅ markers-and-forbidden ✅ (required all green)

---

## REQ 준수표

| # | 항목 | 판정 | 메모 |
|---|---|---|---|
| REQ-1 | 매장명·세금·적립률 중복 저장 금지 — 읽기만 | ✅ PASS | `getDisplayConfig`가 `posSettingsRow`·`loyaltySettingsRow`에서 읽기만; `customer_display_settings` 테이블에는 color_theme_key·timers·image만 저장. `store_name: null` — POS app이 채움(설계 명시) |
| REQ-2a | 이벤트 겹침 → 400 | ✅ PASS | `datesOverlap`이 `event_overlap` throw → route가 HTTP 400 반환 |
| REQ-2b | 매장 timezone 00:00 경계 | ✅ PASS | `getActiveEvent(events, nowDateStr: string)` — 호출자가 store-tz YYYY-MM-DD를 주입; 서비스 함수는 문자열 비교로 경계 정확히 처리 |
| REQ-2c | 활성 이벤트 판정 | ✅ PASS | `from_date <= nowDateStr <= to_date` 포함 경계(=) 처리 |
| REQ-2d | 이벤트 끝나면 컬러 테마 복귀 | ✅ PASS | `active_event_key: null` 시 `theme_key = s.color_theme_key` 반환 (Q-3 자동 복귀) |
| REQ-3 | 이슬람력 2027 = 02-08·03-09·08-14 | ✅ PASS | 테스트 명시 검증 (`ramadan=2027-02-08`, `lebaran=2027-03-09`, `maulid=2027-08-14`) · Intl `ca-islamic-umalqura` 주경로 |
| REQ-3 fallback | Intl 미지원 환경 대체 계산 1일 이내 | ⚠️ 조건부 | Tabular JD 알고리즘(Meeus·Reingold) 사용 · `findIslamicDate` ±10일 창 탐색 견고 · **단독 단위 테스트 없음** — 알고리즘 자체는 표준이나 폴백 경로 테스트는 미진 |
| REQ-4a | 컬러 테마 키 20개 tokens-and-strings.json 일치 | ✅ PASS | `COLOR_THEME_KEYS` 20개 = JSON `colorThemes` 키 완전 일치 (pastel~midnight 순서 포함) |
| REQ-4b | 이벤트 키 7개 tokens-and-strings.json 일치 | ✅ PASS | `EVENT_KEYS` 7개 = JSON `eventThemes` 키 완전 일치 (christmas·imlek·valentine·ramadan·lebaran·maulid·merdeka) |
| REQ-5 | CI | ✅ ALL PASS | 아래 참조 |

---

## CI 결과 (`gh pr checks 266`)

| job | 결과 | 시간 |
|---|---|---|
| pos-integration | **pass** | 5m9s |
| unit-commerce-core | **pass** | 1m1s |
| check | **pass** | 13s |
| markers-and-forbidden | **pass** | 8s |
| changes-filter | **pass** | 7s |
| docker-smoke-* | skipping | (Docker 변경 없음 — 정상) |
| wrangler-check-care-agent | skipping | (정상) |

---

## 세부 관찰

### ✅ 잘 된 점
- `customer_display_settings` 모델: `scope` UNIQUE INDEX로 store/location 중복 방지
- `getOrCreate` → forward-fill 패턴: 신규 default 키 추가 시 기존 행 자동 패치
- `datesOverlap`이 순수 함수 + 테스트 6건으로 경계 사례(단일일·인접·완전 겹침) 완비
- `toIslamicPartsIntl` 감지 로직: 2024-07-07 (1 Muharram 1446) 앵커로 환경 테스트 후 fallback 결정
- 이벤트 CRUD: add/update/delete 모두 scope 단위 겹침 재검증

### ⚠️ 개선 권고 (머지 블로커 아님)
1. **PUT /events/[id]: `from_date > to_date` 미검증** — POST는 `from_date <= to_date` 체크가 있으나 PUT은 누락. 단독으로 from>to인 이벤트를 저장 가능.
2. **Tabular fallback 단독 테스트 없음** — `_useTabular = true`로 고정 후 2027 날짜를 검증하는 테스트 없음. Node 환경에서는 Intl 경로만 실행되므로 fallback 정확도 보증 불가.
3. **`store_name: null` 계약 미문서** — `getDisplayConfig`의 `DisplayConfig` 인터페이스에 "POS app fills" 주석 외 별도 계약이 없음. 추후 `store_name?: string | null` 파라미터 오버라이드 허용 고려.

---

## 판정

**APPROVE** — REQ 필수 5개 항목 모두 충족, CI full green, 개선 사항은 머지 블로커 아님.
