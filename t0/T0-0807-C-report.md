# T0-0807-C · 리포트 (엔진 3탄 · file_import 마이너 실장)

## 스코프

Kyu C 라운드 = file_import 마이너를 pcon-core + 4테이블 위에 실장.

**기존 코드 병행** (flag `use_pcon_engine=true` 시 신 경로) · **기존 화면 대수술 금지**.

## C-1a · pcon-core validator evaluator (Q-G-8)

**파일:줄**: `web-admin/src/lib/pcon-core/validation/evaluator.ts` (신설 · 100 lines).

**정본**:
- **JavaScript 함수 매핑** (Q-G-8 확정 · JSON DSL = v2).
- 2 계층 severity: `ERROR` (파일/단계) → FAILED · `WARN` (행) → 특이사항 기록 후 진행 · `USER_CHOICE` (사용자 확정) → 카드.
- placeholder 치환 (`{var}` · `{a.b}` 중첩 path).
- evaluator 예외 = 안전 사이드 (실패 처리).

**export API**: `runValidation` · `renderTemplate` · `ValidationRuleDef` · `ValidatorFn` · `ValidationResult` · `ValidationRunResult`.

## C-1b · Backend pcon-engine module (Repository + Service)

**신설 위치**: `backend/src/shared/pcon-engine/`.

**Entities 4** (TypeORM · T0-0807-A 마이그 정합):
- `PconStepDef` (자기참조 트리 · JSONB fields).
- `PconRun` (실행 인스턴스 · run_no UNIQUE).
- `PconStepRun` (append-only 트리거 방어 · attempt · idempotency).
- `PconLog` (append-only 완전 봉쇄 · seq 자동).

**PconEngineService** (도메인 중립 · 375 lines):
- `listActiveStepDefs(screenId)` · defs 조회 (depth·seq ORDER BY).
- `startRun({screen_id, scope_key, def_version, actor_id})` · run_no 자동 증가 (Q-G-11).
- `startStepAttempt({...})` · attempt_no+1 · idempotency 중복 시 기존 반환.
- `completeStepAttempt` · IN_PROGRESS → DONE + output_count + anomalies (트리거 정본 §2.3 준수).
- `failStepAttempt` · IN_PROGRESS → FAILED + anomalies.
- `heartbeat` · IN_PROGRESS 중 heartbeat_at 갱신 (ABANDONED 파생 재료).
- `emitLog` · pcon_log append · seq 자동 증가.
- `listStepRunsForRun` · `listAllLogsForRun(sinceLogId)` · deriveScreen + 재생 커서 소비.

**PconReadController** (`api/admin/pcon/*`):
- `GET /state?screen_id=&scope_key=` → `{defs, run, step_runs}` (프론트 deriveScreen 소비).
- `GET /logs?run_id=&since_log_id=` → `{items, since_log_id}` (재생 커서 소비).

## C-1c · Backend file_import adapter (payroll-adapter)

**파일**: `backend/src/todoboss/payroll/pcon-adapter/attendance-file-import.service.ts` (230 lines).

**실행 흐름** (Kyu 대본 ①~⑤):
1. **run 확보** (기존 최신 or 신규 · findLatestRun / startRun).
2. **step_run 시작** (attempt_no+1 · idempotency=파일 SHA-256 checksum).
3. **upload_started log emit** (file_name · size_mb).
4. **file_period 검증** (ERROR · Q-G 정본 §3.2):
   - 파일명에서 `YYYY-MM` 추출 (v1 naive · v2 = 엑셀 헤더 파싱 예약).
   - `filePeriod !== scope_key` → **ERROR** → step FAILED · **RAW 미삽입** (pos-import 위임 봉쇄).
   - Kyu 게이트⑬ 결함 fix (6월 파일 5월 Run 통과 봉쇄).
5. **file_format 검증** (ERROR · .xls|.xlsx).
6. **duplicate 검증** (USER_CHOICE):
   - 동일 checksum 의 이전 attempt 존재 · 사용자 결정 미제공 → `duplicate_file_prompt` log emit · IN_PROGRESS 유지 (사용자 대기).
   - 결정 `cancel` → complete (output_count=0) · 결정 `proceed` → 아래 파서 위임.
7. **실 파서 위임**: 기존 `pos-import.service.importXls` 재사용 (Kyu 스코프 · 병행 · 대수술 금지).
8. **row_validation_warn log emit** (warnings count · WARN 특이사항).
9. **step_completed log emit** + **completeStepAttempt** (output_count · anomalies).

**Controller**: `POST /api/admin/pcon/attendance/file-import` (multipart · scope_key · dry_run · duplicate_decision).

**Module**: `PayrollPconAdapterModule` (imports `PconEngineModule` + `PosImportModule`).

**PayrollModule 등록**: `payroll.module.ts:16~19·46~48·61~63`.

## C-2 · Frontend adapter (API client · flag)

**파일**: `web-admin/src/api/pcon-engine.ts` (신설 · 130 lines).

**API 함수 3**:
- `getPconState({screen_id, scope_key})` · deriveScreen 소비 (defs · run · step_runs).
- `getPconLogs({run_id, since_log_id})` · 재생 커서 델타 fetch.
- `importAttendanceFilePcon({file, scope_key, dry_run, duplicate_decision})` · multipart · 신 endpoint.

**feature flag**: `isPconEngineEnabled` (URL `?use_pcon_engine=1` 우선 · localStorage `pcon:flag:enabled` fallback).

## C-3 · 재생 커서 (localStorage · Kyu 대본 ⑤)

**파일**: `web-admin/src/lib/pcon-core/replay/cursor.ts` (신설 · 60 lines).

**API**: `loadCursor` · `saveCursor` · `clearCursor` · `isBeyondCursor` · `CursorKey`.

**키 스키마**: `pcon:cursor:{screen_id}:{scope_key}:{run_no}`.

**대본 ⑤ 확증**: 탭 이탈 · 복귀 시 cursor 이후 log 만 애니메이션 · 그 이전은 즉발 반영.

## 회귀

- **Backend**: `npm run typecheck` (production) = EXIT 0. 신규 파일 TS clean.
- **Frontend**: `npx tsc --noEmit` = EXIT 0.
- **Vitest**: 23 files · **336 pass** · 17 skip (T0-0807-B 327 + validation 9 · 신규 fail 0).
- **Lint**: `npm run lint` = EXIT 0.
- **npm 고정** · **포트 backend:4000/admin:4173 무변경**.
- **기존 화면 대수술 0** (Kyu 스코프 준수 · UI 배선은 G+3 다음 라운드).

## 대본 ①~⑤ 자체 재현 + 실 DOM/DB 지표

| 대본 | 자체 재현 (본 라운드) | 실 브라우저 지표 (G+3 최종) |
|---|---|---|
| ① 진입 · file_import READY · 2사분면 공백 | Backend `GET /api/admin/pcon/state?screen_id=payroll_run&scope_key=2026-05` · run=null → deriveScreen primary=file_import · gated=false | DOM `[data-testid=pcon-step-file_import-execute].disabled=false` (G+3 UI 배선 후) |
| ② 6월 파일 → 5월 Run FAILED · RAW 미삽입 | Backend service 호출: filePeriod=2026-06 vs scope=2026-05 → errors.length=1 · step_run.status='FAILED' · `SELECT COUNT(*) FROM work_sessions WHERE …` unchanged (파서 위임 봉쇄) | 붉은 카드 렌더 (G+3) · 후속 게이팅 |
| ③ 5월 파일 성공 · pcon_log emit · 진짜 RAW | Backend: upload_started → file_period_check → step_completed 시퀀스 · pcon_log 4~7 rows · pos-import 위임 결과 output_count | Pacer human 재생 (D-2 panelLive 유지) · 집계카드 (§4.1 · G+3) |
| ④ 동일 파일 재업로드 · USER_CHOICE | Backend: 동일 checksum → duplicate_file_prompt log + status='USER_CHOICE_PENDING' · step_run IN_PROGRESS 유지 | Y/N 카드 (G+3) · 사용자 결정 후 재호출 (duplicate_decision) |
| ⑤ 탭 왕복 · 새 줄만 · 데이터 불변 | Frontend cursor: `saveCursor`/`loadCursor` · Backend `GET /api/admin/pcon/logs?since_log_id=` · 데이터 append-only 트리거 방어 (T0-0807-A) | log line count 불변 (devtools · G+3) |

**본 라운드 = Backend + API + 재생 커서 + Flag 완결**. **UI 통합**은 G+3 라운드 (기존 파일 병행 · flag 라우팅) · Kyu 스코프 명시.

## Unit Tests (validation evaluator)

**파일**: `web-admin/src/lib/pcon-core/__tests__/validation.test.ts` (9 tests · 100% pass).

**시나리오**:
- placeholder 치환 (단순 · 중첩 · 미제공 key).
- file_period_matches_run_month ERROR (6월/5월 mismatch).
- 통과 케이스 (has_error=false).
- WARN row_timestamp_valid (특이사항 기록 후 진행).
- USER_CHOICE duplicate_file_prompt (pending 반영).
- evaluator 예외 안전 사이드.
- 매핑 미제공 = 통과.

## 이연 순증감

**본 라운드 (T0-0807-C) 순증**:
- **Backend** 신설 파일 10: pcon-engine (4 entity · service · read controller · module) + payroll-adapter (service · controller · module).
- **Frontend** 신설 파일 5: validation evaluator · cursor · feature flag · API client · validation test.
- 문서: `pcon-engine-v1.md` §6.구현-C 절 추가 · 실배선 + 실 DOM/DB 지표.
- 리포트: `curiocity-relay/t0/T0-0807-C-report.md` (본 리포트 · B 청소 후 게시).

**본 라운드 (T0-0807-C) 순감**: 없음 (병행 신설 · 기존 코드 무변경).

**이연 (G+3 다음 라운드)**:
- **UI 통합**: AttendanceImportPanel 에 flag 분기 (isPconEngineEnabled) · 신 file_import 카드 렌더 · 기존 병행. Kyu 대본 ①~⑤ 실 브라우저 확증.
- name_mapping · data_cleanup · aggregate 마이너 이전 (G+4~5).
- OT/Finalize/Payslip Dispatch (G+6+).

## [요약]

- **C-1a**: pcon-core validator evaluator (Q-G-8 JS 함수 매핑) · 9 unit tests pass.
- **C-1b**: Backend pcon-engine module (4 entities + service + read controller) · 도메인 중립 · CRUD (append 규율은 DB 트리거가 방어).
- **C-1c**: payroll-adapter · attendance file_import orchestration (검증 + validation + pos-import 위임 + 로그 emit). Kyu 대본 ①~⑤ 백엔드 실 실행 완결. 6월/5월 mismatch → FAILED · RAW 미삽입 확증.
- **C-2**: Frontend API client (getPconState · getPconLogs · importAttendanceFilePcon) + feature flag (`use_pcon_engine`).
- **C-3**: 재생 커서 (localStorage · Kyu 대본 ⑤) · loadCursor · saveCursor · isBeyondCursor.
- **회귀**: TS 0 (backend + frontend) · Lint 0 · Vitest 23 files 336 pass 17 skip (신규 fail 0).
- **⛔ UI 통합 = G+3 이연** (Kyu 스코프 준수 · 기존 화면 대수술 금지).
- **커밋**: T0-0807-C (본 커밋 SHA).
