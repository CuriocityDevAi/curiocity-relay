# T0-0807-N · 리포트 (M 착지 · §8 row 편집·재작업 정본 구현)

## 스코프

**Kyu M 착지 확인** (싱크·스택·이식 완결). N = §8 row 편집·재작업 정본 구현 (M에서 순연된 것).

**N 라운드**:
1. **N-1** 백엔드 (§8 스키마 + API).
2. **N-2** 편집 UI (5 계명).
3. **N-3** 재작업 파생·실행.

**정본 재확인 (docs §8.1 5 계명)**:
1. 결과 테이블 row 편집 · RAW 파괴 금지 (append-only).
2. 수정 사유 필수.
3. 시각 표식 + hover 툴팁.
4. STALE 파생 · [재작업] 버튼 (paced-action-pulse).
5. 재작업 = 재작업 로그 append · 신 attempt · 아코디언 재생 · 결과 스택 갱신 (M-3 보존).

## N-1 · 백엔드 스키마 · API

**마이그레이션** (`backend/src/database/migrations/1700000000265-CreatePconRowEditTable.ts`):

```sql
CREATE TABLE "pcon_row_edit" (
  "id" BIGSERIAL NOT NULL,
  "step_run_id" bigint NOT NULL REFERENCES pcon_step_run(id),
  "row_key" varchar(255) NOT NULL,
  "field" varchar(255) NOT NULL,
  "before_value" jsonb,
  "after_value" jsonb NOT NULL,
  "reason" text NOT NULL,
  "actor_id" integer NOT NULL,
  "edited_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "CHK_pcon_row_edit_reason" CHECK (char_length(trim("reason")) > 0),
  CONSTRAINT "CHK_pcon_row_edit_row_key" CHECK (char_length("row_key") > 0),
  CONSTRAINT "CHK_pcon_row_edit_field" CHECK (char_length("field") > 0)
);
CREATE INDEX "IDX_pcon_row_edit_step_run" ON "pcon_row_edit" ("step_run_id");
CREATE INDEX "IDX_pcon_row_edit_edited_at" ON "pcon_row_edit" ("edited_at");
```

**append-only 트리거** (`fn_pcon_row_edit_append_only`):
- UPDATE 봉쇄 (§8 · 재편집은 신 INSERT).
- DELETE 봉쇄 (§8.4 ①-2 헌법 정합).

**Entity** (`backend/src/shared/pcon-engine/entities/pcon-row-edit.entity.ts`).

**Service** (`backend/src/shared/pcon-engine/pcon-row-edit.service.ts`):
- `createEdit()` · reason 공백 검증 이중 (CHECK + 서비스) · FK 명시적 검증.
- `listEditsForRun(runId)` · run 내 모든 step_run 편집 이력 (프론트 overlay 소비).
- `listEditsForStepRun(stepRunId)`.

**Controller** (`backend/src/shared/pcon-engine/pcon-row-edit.controller.ts`):
- POST `/api/admin/pcon/row-edit` · body `{step_run_id, row_key, field, before_value, after_value, reason}`.
- GET `/api/admin/pcon/row-edits?run_id=...` → `{items: PconRowEditRow[]}`.

**원본 불변 · 조회 시 오버레이 (§8 정본)**:
- pcon_step_run.anomalies 절대 미터치.
- 프론트가 pcon_row_edit 조회 후 field 별 최신 edit 로 overlay.
- 재편집 = 신 INSERT (append-only · UPDATE/DELETE 봉쇄).

**Module 편입** (`backend/src/shared/pcon-engine/pcon-engine.module.ts`):
- PconRowEdit entity · PconRowEditService · PconRowEditController 등록.
- exports = 기존 (PconEngineService · TypeOrmModule) + PconRowEditService.

## N-2 · 편집 UI (5 계명)

**Modal** (`web-admin/src/pages/payroll/pcon-view/PconRowEditModal.tsx`):
- 필드 인라인 편집 (여러 필드 동시 편집 가능).
- 변경 필드는 `border-accent bg-accent-light/20` 강조 + "변경됨" 뱃지 + 이전 값 표시.
- **사유 필수** (`textarea` · trim length > 0 · `canSave` 게이트).
- [저장] · [취소] 버튼 · 저장 실패 시 error 표시.
- 저장 = 각 변경 필드마다 POST /row-edit (append-only 특성 · 필드별 개별 이력).
- data-testid: `pcon-row-edit-modal` · `pcon-row-edit-input-{field}` · `pcon-row-edit-reason` · `pcon-row-edit-save` · `pcon-row-edit-cancel` · `pcon-row-edit-error`.

**결과 테이블 편집 진입** (`PconAttendanceLeft.tsx`):
- 정리본 (data_cleanup) row hover → `[✎ 편집]` 버튼 (`opacity-0 group-hover:opacity-100`).
  - fields = check_in / check_out (HH:MM:SS · WIB).
- 집계 (aggregate) row hover → `[✎ 편집]` 버튼.
  - fields = work_days (number).

**수정 row 시각 표식** (§8.1 계명 3):
- 편집된 row: `border-l-4 border-l-accent bg-accent-light/10 · data-edited="true"`.
- 배지 `[data-testid=pcon-cleanup-edited-badge-{i}]` = "✎ 수정됨".
- 배지 `[data-testid=pcon-aggregate-edited-badge-{user_id}]` = "✎ 수정됨".
- hover 툴팁 (`title` attribute · overlay 리스트 여러 줄):
  ```
  check_in: 08:00:00 → 08:15:00 · 수정자 #12 · 2026-08-07 15:30:00 · 사유: 출근 오타 정정
  check_out: 17:30:00 → 17:45:00 · 수정자 #12 · 2026-08-07 15:31:00 · 사유: 퇴근 오타 정정
  ```

**Overlay 반영** (`PconAttendanceLeft.tsx:1~130`):
- `overlayField<T>(original, edits, field)`: 최신 edit 의 `after_value` 채택 · edit 없으면 원본.
- 정리본: check_in / check_out overlay → **근무시간 재계산** (overlay 반영값 기반).
- 집계: work_days overlay.

**Context 편집 상태 로드** (`PconAttendanceContext.tsx`):
- `loadState()` 안에서 `getPconRowEdits({run_id})` 호출 → `rowEdits` 상태 저장.
- `editsForStepRun(stepRunId)` · `editsForRowKey(stepRunId, rowKey)` 헬퍼.
- `saveRowEdit(input)` · POST /row-edit → loadState (rowEdits 재로드).

## N-3 · 재작업 파생 · 실행 (§8.4~§8.5)

**STALE 파생 (프론트 · `PconAttendanceContext.tsx`)**:
- `hasEditsUpstream(minorPath)` · MINOR_ORDER = [file_import, name_mapping, data_cleanup, aggregate].
- 상류 마이너의 latest DONE step_run 에 row_edit 존재 시 true.
- **후속 전부 READY 이면 무영향** (§8.1 계명 4 · idx <= 0 or 후속 attempt 미존재).

**Rail [재작업] 버튼** (`PconAttendanceRail.tsx`):
- `ReworkOrExecuteButton` 신설 컴포넌트.
- 조건: `hasEditsUpstream(path) && status === 'DONE'` → 재작업 모드.
- 재작업 모드 스타일: `border-warning text-warning paced-action-pulse` · 라벨 `⚠ 재작업` · title="상류 row 편집 감지 · 재작업 (신 attempt · 로그 append)".
- 클릭 → `executeRework(path)` = POST /pcon/attendance/{minor} with `{rework: true}`.
- `data-rework="true"` 속성 (테스트용).

**Backend 재작업 로그** (`attendance-minors.service.ts`):
- 세 서비스 (executeNameMapping · executeDataCleanup · executeAggregate) 에 `rework?: boolean` 파라미터.
- rework=true 이면 startStepAttempt 직후 `rework_triggered_by_edit` 로그 emit (`params={minor}`).
- 실행 로직 = 정본 그대로 (신 attempt · 신 anomalies · pcon_step_run append-only 준수).

**결과 스택 갱신** (M-1/M-3 준수):
- 신 attempt DONE → `latestDoneAttemptOf` 갱신 → 결과 카드 신 데이터.
- 이전 DONE 은 append-only 보존 (M-3 계약).
- Pacer 로그 재생 (M-1 싱크) 후 결과 등장.
- 아코디언 재생 (`animate-pcon-log-line` + 순차 노출 1200ms/줄).

**Rail 로그 텍스트** (`renderLogText`):
- `rework_triggered_by_edit`: "▶ row 편집에 의한 재작업 · {minor} (신 attempt 시작)".

## 회귀

- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Frontend TS**: `npx tsc -b --noEmit` = EXIT 0.
- **Vitest**: 24 files · **341 pass** · 17 skip.
- **Jest (pcon-adapter)**: 7 pass.
- **Lint**: EXIT 0.
- **lint:hooks**: EXIT 0.
- **npm 고정** · **포트 backend:4000/admin:4173 무변경**.

## 대본 재현 (Kyu 재실기 대비)

**초기화 → IMPORT → 매핑 → 정리 → 집계 → 정리본 row 편집(사유) → 표식·툴팁 → 후속 [재작업] 깜빡 → 실행 → 재작업 로그·스택 갱신**:

1. 4-클릭 완주 (L 라운드 재현 그대로).
2. **정리본 row 편집**:
   - 정리본 테이블 row hover → `[data-testid=pcon-cleanup-edit-{i}]` 등장.
   - 클릭 → `[data-testid=pcon-row-edit-modal]` open.
   - `[data-testid=pcon-row-edit-input-check_out]` 값 수정.
   - `[data-testid=pcon-row-edit-reason]` = "퇴근 시각 오타 정정".
   - `[data-testid=pcon-row-edit-save]` 클릭 → POST /pcon/row-edit → append.
3. **표식·툴팁**:
   - 편집된 row `[data-testid=pcon-cleanup-row-{i}][data-edited=true]` · `border-l-4 border-l-accent`.
   - 배지 `[data-testid=pcon-cleanup-edited-badge-{i}]` = "✎ 수정됨".
   - hover title: "check_out: 17:30:00 → 17:45:00 · 수정자 #12 · ... · 사유: 퇴근 시각 오타 정정".
   - 퇴근 셀 값 = overlay 반영 (17:45:00) · 근무시간 재계산.
4. **후속 [재작업] 깜빡**:
   - aggregate 카드 `[data-testid=pcon-step-attendance_import.aggregate-execute][data-rework=true]` · 라벨 "⚠ 재작업" · `paced-action-pulse` (border-warning).
5. **실행**:
   - [재작업] 클릭 → POST /pcon/attendance/aggregate with `{rework: true}` → 신 aggregate attempt (attempt_no+1).
   - **재작업 로그**: `[data-testid=pcon-log-*]` 첫 줄 = "▶ row 편집에 의한 재작업 · aggregate (신 attempt 시작)" (M-2 Pacer 1200ms/줄).
   - 이후 aggregate_started · step_completed 순차.
6. **스택 갱신** (M-1/M-3):
   - 마지막 로그 revealed 후: aggregate 결과 카드 fade-in · 신 데이터 (편집 반영 · work_days 등).
   - 이전 aggregate 결과는 스택 아래 유지 (append-only · M-3).

## 이연 순증감

**본 라운드 (T0-0807-N) 순증**:
- **Backend 신설 4개 파일**:
  - `1700000000265-CreatePconRowEditTable.ts` (마이그 + 트리거).
  - `pcon-row-edit.entity.ts` (엔티티).
  - `pcon-row-edit.service.ts` (createEdit · listEditsForRun · listEditsForStepRun).
  - `pcon-row-edit.controller.ts` (POST /row-edit · GET /row-edits).
- **Backend 편입**:
  - `pcon-engine.module.ts` (엔티티 · 서비스 · 컨트롤러 등록 · exports 확장).
  - `attendance-minors.controller.ts` (rework 플래그 배선).
  - `attendance-minors.service.ts` (rework=true 시 rework_triggered_by_edit 로그 emit).
- **Frontend 신설 1개 파일**:
  - `PconRowEditModal.tsx` (필드 인라인 편집 + 사유 필수 modal).
- **Frontend 편입**:
  - `api/pcon-engine.ts` (createPconRowEdit · getPconRowEdits · rework variant 3개).
  - `PconAttendanceContext.tsx` (rowEdits state · loadState 통합 · saveRowEdit · executeRework · hasEditsUpstream · overlay 헬퍼).
  - `PconAttendanceLeft.tsx` (편집 진입 버튼 · 시각 표식 · overlay 반영 · 툴팁).
  - `PconAttendanceRail.tsx` (ReworkOrExecuteButton · rework 로그 텍스트).
- **문서**: `pcon-engine-v1.md` §6.구현-N.
- **리포트**: relay `t0/T0-0807-N-report.md` (M 청소 · N 게시).

**본 라운드 순감**: 없음 (전 라운드 코드 유지 · 순증만).

**이연 (G+6+)**:
- OT/Finalize 실 계산 · aggregate "-" 컬럼 (지각일수 · 야근시간 · 계획 · 차이) 실 데이터 채움.
- alias 자동 승격 (V-2-4 admin_confirmed).
- flag 제거 · 구 pos-import 삭제.
- `pcon-core/derive/stale.ts` 확장 (row_edits 기반 STALE 파생을 백엔드 파생으로 이관 · 현재 프론트 hasEditsUpstream 로 대체).

## [요약]

- **N-1 완료**: pcon_row_edit 마이그 + append-only 트리거 + entity + service + controller (POST /row-edit · GET /row-edits · reason 필수 CHECK).
- **N-2 완료**: PconRowEditModal (필드 인라인 + 사유 필수) · 결과 테이블 hover [✎ 편집] · 편집 row `border-l-4 accent bg-accent-light/10 · data-edited=true · 배지 "✎ 수정됨" · hover title (before→after·수정자·시각·사유)` · overlay 반영 (근무시간 재계산 포함).
- **N-3 완료**: `hasEditsUpstream` (프론트 STALE 파생 · MINOR_ORDER 상류 편집 감지) · `ReworkOrExecuteButton` (paced-action-pulse · "⚠ 재작업" 라벨) · executeRework (backend rework=true) · `rework_triggered_by_edit` 로그 · 신 attempt · 스택 갱신 (M-3 이전 결과 보존).
- **회귀**: TS 0 (backend + frontend) · Lint 0 · lint:hooks 0 · Vitest 341 pass · Jest 7 pass.
- **커밋**: T0-0807-N (본 커밋 SHA).
