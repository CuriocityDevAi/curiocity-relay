# M0-1116-D — PR #290 완성도 · PR #291 계약 차이 · 손님 화면 실기

**첫 줄**: #290 은 M0-1116-C REQ1~4 **4/4 완료 · 추가 코딩 불필요**. #291 ↔ #290 계약 차이 **5건** (경로 불일치 2 · 미지원 필드 2 · getDisplayConfig 반환 1). 손님 화면 주소 = `https://storeport-production.up.railway.app/customer-display-web/`. 페어링 코드 전용 화면 **없음** (admin API 만 존재). 로컬 typecheck/unit test **PASS** (#290 32 pass · #291 326 total, unit 17 pass · 통합 309 skipped-PG).

---

## REQ2 · PR #290 M0-1116-C 완성도

| M0-1116-C REQ | 상세 | 상태 | 증거 |
| --- | --- | --- | --- |
| REQ1 draft/apply/revert/discard 분리 | `PUT /settings/draft` · `POST /settings/apply` · `POST /settings/revert` · `POST /settings/discard` · `GET /settings?view=draft\|live` · settings_previous 보관 · live_version +1 · 기존 PUT = patchDraft+applyDraft 호환 | **DONE** | `apps/commerce-core/src/api/admin/pos/customer-display/settings/{draft,apply,revert,discard}/route.ts` · `modules/customer_display_settings/service.ts` applyDraft/revertToPrevious/discardDraft · migration `Migration20261116120000.ts` (settings_draft · settings_previous · live_version · applied_at) |
| REQ2 실시간 반영 | `snapshots/active` 응답에 `config_version` · 손님 토큰용 `GET /customer-display/display-config` · `useLiveDisplayConfig` hook (결제 중이면 적용 보류) · 웹소켓 미도입 | **DONE** | `api/customer-display/snapshots/active/route.ts:48-66` (configVersion) · `api/customer-display/display-config/route.ts` · `apps/customer-display/src/hooks/useLiveDisplayConfig.ts` · `src/lib/display-config-source.ts` |
| REQ3 preview 계약 | `GET /settings/preview?view=draft\|live&as_of=YYYY-MM-DD` · admin 인증 · 이벤트 머지 | **DONE** | `settings/preview/route.ts` (date regex 검증 · view 토글 · getDisplayConfig 호출) |
| REQ4 통합 테스트 | draft 미반영 → apply 반영+ver+1 → revert 복구 → as_of 이벤트 머지 → PUT 호환 | **DONE** | `integration-tests/pos/customer-display-settings-draft-apply.spec.ts` (151줄) · `feature-map.yaml` 반영 |

**추가 완성 필요 0건** — M0-1116-C REQ 전부 shipping 상태. 추가로 M0-1116-D REQ3 에서 발견된 gap (event `message` · `overrides`) 은 M0-1116-C spec 범위 밖 (아래 REQ3 섹션).

**제한**: 작업 금지 조항 "#290 브랜치에서" 로 추가 커밋 미수행. 통합 테스트는 로컬 postgres (`pg_isready` = OK) 있으나 테스트 runner `pnpm --filter commerce-core test:integration` 스크립트 미존재 — 통합 돌리려면 `pnpm --filter commerce-core test -t "customer-display-settings"` 을 TEST_TYPE=integration 로 호출해야 함 (환경 조립 별도).

---

## REQ3 · PR #291 ↔ PR #290 계약 차이 (5건)

**#291 client**: `apps/commerce-core/src/admin/lib/customer-display-api.ts` 호출 기준.

| # | 영역 | #291 호출 | #290 제공 | 결과 |
| --- | --- | --- | --- | --- |
| 1 | draft apply 경로 | `POST /admin/pos/customer-display/settings/draft/apply` | `POST /admin/pos/customer-display/settings/apply` | **경로 불일치** → 404 → 클라이언트 fallback = 직접 `PUT /settings` (즉시 apply · "Save now" 모드). draft 중간상태 없이 즉시 live 반영. |
| 2 | draft discard 경로 | `POST /admin/pos/customer-display/settings/draft/discard` | `POST /admin/pos/customer-display/settings/discard` | **경로 불일치** → 404 → 클라이언트 `{ok:true}` 반환하나 서버는 실제 draft 지우지 않음. draft 를 PUT/draft 로 쌓지 않으면 무해 (현재 UI 는 PUT /settings 직통). |
| 3 | event `message` 필드 (30자) | AddEventBody / UpdateEventBody 에 `message` 포함 POST/PUT | 서버 events/route.ts 는 `event_key`/`from_date`/`to_date` 만 파싱 · `message` 폐기. 모델에도 없음. | **데이터 유실** — 클라이언트 입력한 문구가 서버에 저장되지 않음. GET 응답 `events[].message` 없음 → UI 편집 시마다 기본 문구로 리셋. |
| 4 | event `overrides:[{date,event_key}]` (겹침 날 우선 선택) | Body 에 `overrides` 포함 | 서버 미지원 · `datesOverlap` 겹침 시 `event_overlap` 400 반환 (overrides 무시) | **겹침 저장 불가** — 두 이벤트가 하루라도 겹치면 400 · overrides 로 우선 지정 못 함. 현 #291 UI 는 400 수신 시 안내 메시지만 표시. |
| 5 | `getDisplayConfig` 응답 | #291 는 preview endpoint 미사용 · 자체 as_of 시뮬레이션 · 그날의 1 이벤트 + message 를 기대 | 서버 `DisplayConfig` = `{theme_key, active_event_key, timers, store_name, tax_label, tax_rate, earn_rate, store_image_url}` · **`message` 없음** · overrides 우선 로직 없음 | **반환 필드 미흡** — 손님 화면이 이벤트 custom 문구 표시 불가. 오늘 1 이벤트 선택 로직은 `getActiveEvent` 로 이미 있음(첫 매칭) — 겹침 발생 자체가 불가능해 "하루 1 이벤트" 는 서버 레벨에서 보장 중. |

**정리**:
- #1, #2 경로 수정은 **#291 쪽을 #290 에 맞춰 바꾸는 쪽이 정석** (`/settings/apply`, `/settings/discard`). #290 은 M0-1116-C 스펙 그대로.
- #3, #4, #5 는 **서버 확장 필요** (events 모델 `message` 컬럼, overrides JSONB · POST/PUT 수용 · `getDisplayConfig` 응답에 message 포함 · overrides 적용된 1 이벤트 선택).
- 양쪽 PR 모두 임시 호환 코드 (#291 의 fallback · #290 의 PUT 호환) 로 깨지지 않게 운영 중 — 다음 라운드에서 정합화.

---

## REQ0/REQ1 · 운영 손님 화면 실기 절차 (코드 읽기 기반 · Kyu iPad Safari용)

**결론**: 지금은 **mock 모드만 iPad 에서 확인 가능**. POS→손님 화면 자동 전환은 **미연결** (#290 서버 완료 · client wire 다음 라운드).

### 운영 주소
- 손님 화면 web: `https://storeport-production.up.railway.app/customer-display-web/` (M2-1105-CB · #284 머지 완료 · Dockerfile:67 로 `apps/customer-display/dist/` → `public/customer-display-web/` 번들)
- Admin: `https://storeport-production.up.railway.app/app`

### 페어링 코드 얻는 곳 = **없음** (전용 UI 無)
- API 만 존재: `POST /admin/pos/loyalty/sessions` · body `{register_session_id}` · 응답 `{pair_code: "6자리", expires_in_seconds: 600}`
- 소비: `POST /customer-display/pair` · body `{code: "6자리"}` · 응답 `{device_token, register_session_id}` (sha256 평문 1회만)

### Kyu 가 지금 iPad 에서 할 수 있는 것 (mock 데모)
1. iPad Safari 열고 `https://storeport-production.up.railway.app/customer-display-web/` 로 이동.
2. 기본 진입은 **Main/Idle 화면**. 상태 강제 전환은 **URL 쿼리** 사용:
   - `?state=cart` — 결제 중 (장바구니)
   - `?state=keypad` — 번호 입력 화면
   - `?state=keypad_after` — 번호 입력 후
   - `?state=consent` — 첫 방문 동의
   - `?state=receipt` — 영수증
   - `?state=done` — 적립 완료
3. 테마/이벤트 데코는 mock 데이터 기반 (real server 설정 반영 안 됨).
4. **홈 추가**: Safari 공유 → "홈 화면에 추가" 로 PWA 처럼 사용 가능.

### 아직 **안 되는 것** (다음 라운드)
- POS 결제 → iPad 자동 전환 (snapshots/active 폴링) — `apps/customer-display` 에 `LiveSnapshotSource` 미구현 (현재는 `apps/customer-display/src/mocks/snapshot-source.ts` MockSnapshotSource 만). bootstrap wire (`app/_layout.tsx` 류) 필요.
- 번호 입력 → 주문 귀속 — 서버 `POST /customer-display/snapshots/:id/link-phone` 은 존재하나 client 호출 wire 미완.
- M0-1116-C 설정 실시간 반영 — `useLiveDisplayConfig` hook/소스는 #290 에 있으나 bootstrap 호출 미접속 (#290 PR body 명시: "현 손님 화면 web 은 mock 모드만 작동").

### Kyu 가 지금 PC 에서 할 수 있는 것 (페어링 코드 수동 발급)
1. PC Chrome → `https://storeport-production.up.railway.app/app` 로그인 (admin).
2. DevTools Console 열고:
   ```js
   // 매장 열기 (없다면)
   // — 'register_session_id' 가 있어야 페어링 발급 가능. 세션 목록/생성 API 는 다음 라운드 UI.
   fetch("/admin/pos/loyalty/sessions", {
     method: "POST",
     headers: {"Content-Type":"application/json"},
     credentials: "include",
     body: JSON.stringify({register_session_id: "<실측 ID>"})
   }).then(r=>r.json()).then(console.log)
   // → {pair_code: "123456", expires_in_seconds: 600}
   ```
3. iPad 쪽: 현재 손님 화면 web 에 **코드 입력 UI 없음** (mock 모드). 코드 소비는 외부 도구 (Postman 등) 로:
   ```
   POST /customer-display/pair  { "code": "123456" } → device_token
   ```
4. 이 device_token 으로 `GET /customer-display/snapshots/active?...` 를 호출해 서버 쪽 연결은 검증 가능하나, **iPad 화면 자체는 mock 만 보여줌**.

**실기 가능 단계 (Kyu 기준 바로 밟을 수 있는 것)**:
- ✅ iPad Safari → `https://storeport-production.up.railway.app/customer-display-web/?state=cart` → 결제 중 화면 mock 보기.
- ✅ URL 쿼리로 5개 화면 전부 확인 (idle/cart/keypad/consent/done/receipt).
- ⛔ 매장에서 실제로 POS 쳐서 iPad 에 뜨게 하기 — **다음 라운드**.
- ⛔ iPad 에서 전화번호 입력 → 주문 귀속 — **다음 라운드**.

---

## 로컬 검증

- **typecheck #290** (워크트리 `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1116-C-wt`): `pnpm --filter commerce-core typecheck` → exit 0 (PASS).
- **typecheck #291** (`feat/m1-1116-d-customer-display-admin`): `pnpm --filter commerce-core typecheck` → exit 0 (PASS).
- **unit #290**: `pnpm --filter commerce-core test customer_display` → 32 passed (service.unit.spec.ts).
- **unit #291**: `pnpm --filter commerce-core test -t overlap` → 전체 326 · 17 run · 309 skipped (integration suite 는 TEST_TYPE 분리로 skip).
- **integration**: 스크립트 (`test:integration`) 가 pnpm script 로 노출되지 않아 별도 환경 설정 없이는 실행 불가 (TEST_TYPE 분기 필요).
- **feature-map**: #290 PR 본문 기록 "scanned 1002 files → matched 1002 / unmatched 0" · 네이밍 check PASS.

---

## 이연 (다음 라운드에서 처리할 것)

1. **#291 경로 수정 (quick fix)**: `customer-display-api.ts` 의 `/draft/apply` → `/apply`, `/draft/discard` → `/discard`. 2줄 diff. 본 라운드에 작성하다 **현재 워크트리 상태 이상** (branch 이름이 session 시작 시 `feat/m1-1116-d-customer-display-admin` → 작업 중 `feat/m1-1116-f` 로 바뀌고 다른 세션의 untracked e2e/scripts 다수 포함) 발견 → CLAUDE.md §7 "타 세션 작업 중 워크트리 사용 금지" 준수해 변경 **revert · 미 push**. 다음 라운드에 clean 워크트리에서 재수행.
2. **서버 events 모델 확장**: `message` (varchar 30, nullable) · `overrides` (jsonb `[{date,event_key}]`, default []) 컬럼. POST/PUT 수용 + overlap 시 overrides 로 우선 선택 허용 (overrides 로 한 쪽 지정됐으면 400 대신 저장).
3. **getDisplayConfig 확장**: 응답에 `active_event_message` 추가 · overrides 반영된 그날의 1 이벤트 재선택.
4. **customer-display bootstrap wire**: `LiveSnapshotSource` 실구현 + `app/_layout.tsx` 에서 Mock→Live 전환. `useLiveDisplayConfig` 를 이 라운드에 접속.
5. **페어링 코드 발급 전용 Admin UI**: 매장 열기 플로우 안 또는 별도 페이지. 현재 API-only.
6. **integration test runner**: `test:integration` 스크립트 노출 또는 TEST_TYPE 분기 명문화.
