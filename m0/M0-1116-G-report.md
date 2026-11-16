# M0-1116-G — 이벤트 화면 문구 · 겹치는 날 우선 이벤트 (M0-1116-E 재발부)

**PR #298 · REQ1 완료 · REQ2 완료 · 로컬 통합 8/8 + 기존 draft-apply 5/5 재검증 · 남은 것: 없음(스펙 커버 끝 · #291 admin UI 는 별 티켓).**

## 변경 요약 (storeport)

- 브랜치: `m0/M0-1116-G-event-message-overrides` (base = `m0/M0-1116-C-settings-draft-apply` = #290 위, M0-1116-F 수정 위).
- PR: https://github.com/CuriocityDevAi/storeport/pull/298 (draft · PR 본문에 #291 요청/응답 예시 전부 명기).
- 커밋 3개(단계별 push):
  1. `chore(customer-display-settings): M0-1116-G — scaffold (empty)` — 10분 안 draft PR 확보.
  2. `feat(customer-display-settings): M0-1116-G — event message + overlap overrides (service · routes · migration)` — service.ts/routes/model/migration (+453/−52).
  3. `test(customer-display-settings): M0-1116-G — 통합 테스트 (8/8)` — integration-tests/pos/customer-display-event-message-overrides.spec.ts.

## 서버 계약 (#291 가 맞춰야 할 것)

- `message` 필드 (최대 30자 · 없으면 `EVENT_DEFAULT_MESSAGES[event_key]`): christmas · imlek · valentine · ramadan · lebaran · maulid · merdeka 7종 기본 문구 포함.
- `overrides:[{date, event_key}]` — POST/PUT 요청에 포함. 서버가 `events_overrides: {date: event_id}` 로 저장.
- 겹침 400 응답: `{type: "event_overlap", conflicts: [{date, existing_event_id, existing_event_key}, …]}` — 옛 단일 `conflicting` 과 호환 깨지는 변경(필드명 `conflicts` 복수 + 날짜별).
- `GET /settings/events` 응답에 `overrides` 포함.
- `display-config` · `settings/preview` 응답 `config.active_event_message` 추가.

## DB

`Migration20261116210000` — `customer_display_settings.events_overrides` jsonb nullable 컬럼 추가.
삭제·기간 변경 시 orphan override 자동 정리 (`cleanOrphanOverrides`).

## 로컬 검증 (local Postgres · DATABASE_URL=postgresql://postgres:postgres@localhost:5432/medusa-test)

- `TEST_TYPE=integration jest integration-tests/pos/customer-display-event-message-overrides.spec.ts` → **8/8 pass** (13.5s).
- `TEST_TYPE=integration jest integration-tests/pos/customer-display-settings-draft-apply.spec.ts` → **5/5 pass** (9.4s) (M0-1116-F 수정 유지 확인).
- `TEST_TYPE=unit jest src/modules/customer_display_settings/__tests__` → **32/32 pass** (기존 단위 유지).
- `tsc --noEmit` → customer-display 관련 신규 에러 0 (기존 admin JSX 노이즈만 유지 · 본 PR 범위 밖).

## 시간 보고

- 시작: 2026-11-16 ~08:40 · 종료 · ~08:52 (약 12분 · 45분 상한 내).
- 세 번의 커밋·push 모두 완료 (작업 유실 방지 규약 준수).
- 남은 것 없음. 리뷰 받고 #290 → #298 순으로 착지 대기.
