# T0-0807-U · 리포트 (T 인벤토리 판정 확정 · Q-T 전 항목 채택 · 판정 마이너 신설)

## 스코프

**Kyu T 판정 확정 반영** (Q-T-1~11 전 항목 오케 권고 채택):
- Q-T-9: **판정 마이너 신설 (b)** · seq 4 · aggregate → seq 5.
- Q-T-1: shift-baseline.ts 신 파일.
- Q-T-2/3: payroll_policy 조회 + default fallback.
- Q-T-4: 판정 = 백엔드.
- Q-T-5: Work Rotation = pcon-adapter 직접.
- Q-T-6: pcon_override 소비 = 판정 마이너 안.
- Q-T-7: 별도 OverrideModal (스코프 · 이번 라운드는 배지만 · UI 진입은 다음).
- Q-T-8: DecisionCell 재도입 보류.

## U-1 · 판정 마이너 신설

**마이그** (`1700000000267-SeedPconJudgementStep.ts`):
- `attendance_import.judgement` seq=4 INSERT.
- `attendance_import.aggregate` seq 4 → 5 UPDATE.

**shift-baseline.ts** (`backend/src/todoboss/payroll/pcon-adapter/shift-baseline.ts`):
- `SHIFT_TIMES`: casher_shift1 (08:00~17:00) · casher_shift2 (13:00~22:00) · non_casher (07:30~16:30).
- `DEFAULT_OT_GRACE_MINUTES = 30` · `DEFAULT_LATE_GRACE_MINUTES = 10`.
- `resolveShiftBaseline(work_type, rotation_shift)`.
- `timeStrToMinutes(iso)` (Date 미사용 · §12 정합).
- `judgeSession(input)`: pure · normal/late/ot/unknown 판정.
- `applyOverrides(judged, overrides[])`: ot_denied/ot_partial/late_excused/late_partial 소비.

**PathAdd**:
- `PATH.judgement = 'attendance_import.judgement'` (backend + frontend 정합).

**Endpoint**:
- `POST /api/admin/pcon/attendance/judgement` · body `{run_id, scope_key, dry_run?, rework?}`.

## U-2 · 판정 로직

**executeJudgement** (`attendance-minors.service.ts:729~995`):
1. data_cleanup step_run 에서 `cleanup_summary.sessions[]` 로드.
2. name_mapping step_run 에서 `name_match_summary.mapped_pairs` 로드 · pos_name → user lookup.
3. payroll_policy 조회 (store_id) · 미시딩 시 default (30/10).
4. Users work_type + WorkRotation (월 range) 사전 로드 · shift_baseline 파생.
5. `PconOverrideService.listOverridesForRun` 로 오버라이드 조회.
6. 세션별:
   - `resolveShiftBaseline(work_type, rotation.shift)` → shift_baseline.
   - `judgeSession({shift_baseline, check_in, check_out, ot_grace, late_grace})` → judged.
   - overrides.filter(session subject) → `applyOverrides(judged, [...])`.
   - normal/late/ot/unknown 집계.
7. `judgement_summary.sessions[]` = 판정 결과 저장 (user_id · shift_baseline · status · late_minutes · ot_minutes · has_override).

**executeAggregate 재배선** (`attendance-minors.service.ts:998~1200`):
- `requirePreviousDone(PATH.judgement)`.
- `judgement_summary.sessions[]` 소비 (data_cleanup 대신).
- per_user: `late_days = distinct dates with late_minutes>0` · `ot_minutes = sum` · `unknown_days` 편입.
- `aggregate_summary.per_user_rows[]` 실 데이터.

## U-3 · UI

**Rail** (`PconAttendanceRail.tsx`):
- minorList 5개 확장 (판정 카드 seq 4 · 집계 seq 5).
- 판정 로그 텍스트: "판정 시작 · 세션 N건".

**Left** (`PconAttendanceLeft.tsx`):
- STEP_SEQ 확장: judgement=4 · aggregate=5.
- 판정 결과 카드 (`[data-testid=pcon-result-attendance_import.judgement]`):
  - CollapsibleHeader + `[data-testid=pcon-aggregate-card-attendance_import.judgement]`.
  - "INPUT N건 판정 → 정상 X · 지각 Y · 야근 Z · 기준없음 W · 유예 (OT 30분 · Late 10분)".
  - `[data-testid=pcon-judgement-table]` · 컬럼 = #/이름/날짜/출근/퇴근/Shift/상태/Late/OT/오버라이드.
  - late (bg-warning-light) · ot (bg-error-light) · unknown (bg-surface-tertiary) 색.
  - has_override = ⚠ 배지.
- 집계표 지각/야근 실 데이터 (기존 "-" fallback 대체):
  - `[data-testid=pcon-aggregate-late-{user_id}]` = `{late_days}일`.
  - `[data-testid=pcon-aggregate-ot-{user_id}]` = `{ot_hours}h {min}m`.
  - 특이사항 셀에 `기준 없음 N일` 배지.
- AggregateTotals: 총 지각 (일) · 총 야근 (분) 실 데이터.

**Context** (`PconAttendanceContext.tsx`):
- PATH.judgement 추가.
- MINOR_ORDER = [file_import, name_mapping, data_cleanup, judgement, aggregate] (STALE 캐스케이드 정합).
- executeMinor · executeRework 에 judgement 분기.

**오버라이드 배지** (기존 유지 · Q-T-7 UI 진입은 후속):
- 정리본 row `[data-testid=pcon-cleanup-override-badge-{i}]` · has_override → ⚠.
- 판정 테이블 row `has_override` → ⚠ 배지.

## U-4 · 확정

- DecisionCell 재도입 = **보류** (Q-T-8 · pcon 정본 = 편집 + 오버라이드로 충분).
- WorkSessionOverride 구 테이블 = **폐기 방향** (pcon_override 대체 · flag off 잔존 · G+6+ 정리).

## U-5 · 테스트 [테스트 추가]

**신설**:
- `backend/src/todoboss/payroll/pcon-adapter/attendance-judgement.spec.ts` (**23 assert**):
  - resolveShiftBaseline · SHIFT/FIXED/ON_DEMAND (6 assert).
  - judgeSession · Casher Shift1 정시/유예/지각/야근/동시 (5 assert).
  - unknown 케이스 (2 assert).
  - custom grace (2 assert).
  - applyOverrides · ot_denied/ot_partial/late_excused/late_partial/동시 (5 assert).
  - SHIFT_TIMES 상수 (3 assert).
- smoke 확장: 5 마이너 카드 렌더 (기존 4 → 5) · rail 안 컨테이너 · Left 없음.

**Jest 총합**: **38 pass** (기존 15 → 신설 23 · pcon 전량).
**Vitest 총합**: 344 pass (기존 유지 · smoke 5 마이너 반영).

## 회귀

- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Frontend TS**: `npx tsc -b --noEmit` = EXIT 0.
- **Vitest**: 24 files · **344 pass** · 17 skip.
- **Jest (pcon-adapter)**: **38 pass** (15 → 38 · 신설 23).
- **Lint**: EXIT 0.
- **lint:hooks**: EXIT 0.
- **npm 고정** · **포트 backend:4000/admin:4173 무변경**.

## Kyu 실기 절 (self-contained)

**대본 (Q-T 판정 전 항목 반영)**:

1. **Reset → IMPORT → 매핑 → 정리 → 판정 → 집계** (5-클릭 완주):
   - 각 단계 로그 완료 후 결과 카드 등장 (T-4 상태 전이 정본).
   - Pacer 600ms/줄.
2. **판정 카드 확증**:
   - Rail: `[data-testid=pcon-step-attendance_import.judgement]` 존재 · label "판정".
   - Left: `[data-testid=pcon-result-attendance_import.judgement]` · CollapsibleHeader "STEP #4".
   - 카드 텍스트: "INPUT 257건 판정 → 정상 X · 지각 Y · 야근 Z · 기준없음 W · 유예 (OT 30분 · Late 10분)".
   - `[data-testid=pcon-judgement-table]` · 컬럼 10개.
3. **집계 지각/야근 실 데이터**:
   - `[data-testid=pcon-aggregate-late-{user_id}]` = "3일" (예).
   - `[data-testid=pcon-aggregate-ot-{user_id}]` = "1h 30m" (예).
   - AggregateTotals 총 지각·야근 합계 실 데이터.
4. **오버라이드 (append-only 확증 · 배지)**:
   - POST `/pcon/override` · subject_kind='session' · decision_type='ot_denied' · reason 필수.
   - 판정 재실행 후: judgement_summary.sessions[i].has_override=true · ot_minutes=0.
   - 정리본/판정 테이블 row `⚠` 배지 표시.
5. **캐스케이드 (편집 → judgement STALE → aggregate STALE)**:
   - 정리본 row 편집 → judgement 카드 `[data-rework=true]` (paced-action-pulse).
   - 판정 재작업 → 신 judgement attempt · aggregate 카드도 `[data-rework=true]`.
   - 집계 재작업 → 신 aggregate attempt · 스택 append (이전 결과 유지 · M-3).
6. **로그 순차 (600ms/줄)**:
   - 판정 로그: "판정 시작 · 세션 257건" · "단계 완료 · INPUT 257 · normal 200 · late 30 · ot 25 · unknown 2".

## 이연 순증감

**본 라운드 (T0-0807-U) 순증**:
- **Backend 신설 3 파일**:
  - `1700000000267-SeedPconJudgementStep.ts` (마이그).
  - `pcon-adapter/shift-baseline.ts` (SHIFT_TIMES · resolveShiftBaseline · judgeSession · applyOverrides).
  - `pcon-adapter/attendance-judgement.spec.ts` (23 assert).
- **Backend 편입**:
  - `attendance-minors.service.ts` (executeJudgement 신설 · executeAggregate 재배선).
  - `attendance-minors.controller.ts` (POST /judgement).
  - `pcon-adapter.module.ts` (PayrollPolicy · WorkRotation TypeOrmModule 편입).
- **Frontend 편입**:
  - `api/pcon-engine.ts` (runJudgementPcon · runJudgementPconRework).
  - `PconAttendanceContext.tsx` (PATH.judgement · MINOR_ORDER 5개 · executeMinor/Rework judgement 분기 · yearMonth dep 편입).
  - `PconAttendanceRail.tsx` (minorList 5 · judgement_started 로그 텍스트).
  - `PconAttendanceLeft.tsx` (STEP_SEQ 5개 · 판정 결과 카드 신설 · aggregate 실 late/ot 데이터).
  - `__tests__/PconAttendanceImportView.smoke.test.tsx` (5 마이너 mock 확장).
- **문서**: `pcon-engine-v1.md` §15 · `requirements-tracking.md` §3-P (신 REQ 편입).
- **relay**: `t0/T0-0807-U-report.md` (본 파일). T-inventory/T-report 정리.

**본 라운드 순감**:
- Frontend aggregate 컬럼 "-" fallback 삭제 (실 데이터 배선).
- Backend executeAggregate: cleanup 소비 로직 → judgement 소비로 교체 (parseTime 등 미사용).

**이연 (V/W 라운드)**:
- **OverrideModal UI** (Q-T-7) · 판정 카드 row 클릭 → 오버라이드 진입 modal · 사유 필수.
- 편집 modal 확장 (판정 row 도 편집 진입 · optional).
- Kyu 실기 검증.

**이연 (G+6+)**:
- Finalize / Payslip Dispatch (REQ-P1-FN-* · REQ-P1-PD-*).
- 계획/차이 실 데이터 (Work Rotation 편성 · aggregate 5번째 컬럼).
- flag 제거 · 구 pos-import · WorkSessionOverride 삭제.

## [요약]

- **U-1** 완료: 판정 마이너 신설 · seq 4 · 마이그 267 · shift-baseline.ts · payroll_policy 조회 · WorkRotation 조회.
- **U-2** 완료: executeJudgement · shift_baseline 파생 · judgeSession · applyOverrides · aggregate judgement_summary 소비.
- **U-3** 완료: 5 마이너 UI · 판정 결과 카드 (판정 테이블 10 컬럼) · 지각/야근 실 데이터 · 오버라이드 배지 · 캐스케이드 (편집 → judgement → aggregate STALE).
- **U-4** 확정: DecisionCell 보류 · WorkSessionOverride 폐기 방향.
- **U-5** 테스트: attendance-judgement.spec.ts 23 assert · smoke 5 마이너 확장 · Jest 38 pass · Vitest 344 pass.
- **회귀**: TS 0 · Lint 0 · lint:hooks 0.
- **커밋**: T0-0807-U (본 커밋 SHA).
