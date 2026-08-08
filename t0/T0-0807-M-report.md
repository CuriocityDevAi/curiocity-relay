# T0-0807-M · 리포트 (L 실기 PASS · 관찰 5 = 엔진 3 + 화면 2 · row 편집 N 순연)

## 스코프

**Kyu L 실기 판정**: 완주 ✓·수치 정합 ✓. 관찰 5 = 엔진 2 (M-1 싱크·M-2 감속) + 계약 위반 1 (M-3 스택) + 화면 2 (M-4 컬럼·M-5 이식). row 편집·재작업 (§8 정본) 은 **N 순연**.

**M 라운드**:
1. **M-1 [엔진 정본 신설]** 로그→결과 싱크 ("프로세스 콘솔의 기본").
2. **M-2 [엔진]** Pacer 감속 (700 → 1200ms).
3. **M-3 [엔진 계약 위반 fix]** 결과 스택 보존 (append-only reveal).
4. **M-4 [화면]** RAW 매핑 하이라이트 = Name 컬럼 수직 구간만.
5. **M-5 [화면]** 정리본·집계 테이블 = 구 화면 컴포넌트 이식.

## M-1 · 로그→결과 싱크 정본 신설 (엔진)

**뿌리**: 현재 (K/L) 결과는 status='DONE' 즉시 등장. 하지만 3사분면 로그는 Pacer 로 순차 노출 → **결과가 로그보다 먼저 등장** (순서 역전 · "AI스러움" 손상).

**정본 (docs §9 신설)**:
> "2사분면 결과는 해당 마이너의 3사분면 로그 재생 **완료 후** 등장한다. 프로세스 콘솔의 기본. 화면별 재구현 금지 · 엔진 계층이 판정."

**Fix**:

`web-admin/src/pages/payroll/pcon-view/PconAttendanceContext.tsx:320~345`:
```ts
const isMinorRevealComplete = useCallback(
  (path: string): boolean => {
    const a = latestDoneAttemptOf(path);
    if (!a) return false;
    const all = logsByStepRunId[a.id] ?? [];
    const revealed = revealedByStepRun[a.id] ?? 0;
    if (all.length === 0) return true;  // 로그 없는 마이너 (edge): 즉시 결과 등장.
    return revealed >= all.length;
  },
  [latestDoneAttemptOf, logsByStepRunId, revealedByStepRun],
);
```

`PconAttendanceLeft.tsx:120~135`:
```tsx
const doneAndRevealed = (path: string): boolean => {
  if (!latestDoneAttemptOf(path)) return false;
  if (!isMinorRevealComplete(path)) return false;
  return true;
};
// 모든 sections push 조건 = doneAndRevealed(path).
```

## M-2 · Pacer 감속 (엔진)

**뿌리 (Kyu)**: 현행 700ms/줄도 빠름 판정. 사람이 따라 읽는 속도로 상향.

**Fix** (`PconAttendanceContext.tsx:280~295`): 700 → **1200ms/줄**. 최초 로그 200ms.

## M-3 · 결과 스택 보존 (엔진 계약 위반 fix)

**뿌리 (Kyu 관찰)**: 데이터 정리 실행 시 매핑 결과 소멸.

**뿌리 분석**:
- L 판본 렌더 조건: `nameMappingView?.status === 'DONE' && nameMappingCurrent`.
- `nameMappingView?.status` = deriveScreen 파생. deriveStatus 는 attempt.status 기반이지만 **isStale 이 STALE 반환 시 status='STALE' ≠ 'DONE'** → 카드 소멸.
- 데이터 정리 IN_PROGRESS 진입 시 파생 규칙에 의해 name_mapping 이 STALE 판정될 수 있음 (계보 관계).
- 또한 신 IN_PROGRESS attempt 가 어떤 이유로 생기면 currentAttemptOf 는 IN_PROGRESS attempt 반환 → status !== DONE.

**정본 (docs §10 신설)**:
> "이전 결과 유지 + 최신 위" · 결과 카드는 **append-only reveal 스택** · 다른 마이너 실행/재실행 시에도 절대 소멸하지 않는다.

**Fix** (`PconAttendanceContext.tsx:296~315`):
```ts
const latestDoneAttemptOf = useCallback(
  (path: string): PconStepRunRow | null => {
    let latest: PconStepRunRow | null = null;
    for (const r of stepRuns) {
      if (r.step_path !== path) continue;
      if (r.dry_run) continue;
      if (r.status !== 'DONE') continue;  // 물리 status='DONE' 만.
      if (!latest || r.attempt_no > latest.attempt_no) latest = r;
    }
    return latest;
  },
  [stepRuns],
);
```
- **status derived 무시** · stepRuns 배열 직접 조회.
- 재실행/신 IN_PROGRESS/STALE 파생 어떤 경우든 이전 DONE 결과 유지.
- `latestDoneAnomaliesOf` 도 마찬가지.
- 모든 결과 섹션이 `currentAttemptOf`/`anomaliesOf` 대신 이 신 헬퍼 사용.

## M-4 · RAW 매핑 하이라이트 = Name 컬럼 수직 구간만 (화면)

**뿌리 (Kyu 판정)**: 이전 K 판본은 데이터 행 전체 강조 → 매핑 실 INPUT (Name 값) 시각 전달 미흡.

**Fix** (`PconAttendanceLeft.tsx:175~195, 585~640`):
- `nameColIndex` 계산 = `header_columns` 에서 NAME_COLS_LOWER (name/nama/사원명/user_name) 매칭 index.
- 컬럼 letter 헤더 (A/B/C/...) 의 name 컬럼 셀: `border-l-2 border-r-2 border-t-2 border-accent bg-accent-light/40 font-semibold text-accent`.
- 헤더 행 (row=header_row_1based) 의 name 컬럼 셀: 위와 동일.
- 데이터 행의 name 컬럼 셀: `border-l-2 border-r-2 border-accent bg-accent-light/20`.
- 마지막 페이지 row: `border-b-2` 추가 (수직 구간 닫음).
- 행/테이블 전체 강조는 완전 제거.
- 레전드 (`[data-testid=pcon-raw-highlight-legend]`): "매핑 INPUT = {L}열 (Name)".

## M-5 · 정리본·집계 테이블 = 구 화면 이식 (화면)

**뿌리 (Kyu 판정)**: 현 정리본·집계 테이블 = 신작 · 폐기.

**정본**: 구 화면 (flag off `/payroll/run`) 의 기존 `AttendanceRawTable` · `AttendanceAggregationTable` 컴포넌트를 **그대로 이식** (스타일·컬럼 동일 · 데이터 소스만 신 엔진 산출 배선).

### 정리본 이식 (구 AttendanceRawTable)

**Fix** (`PconAttendanceLeft.tsx:400~530`):
- 컬럼: `#` · 이름 · 날짜 · 출근 · 퇴근 · 근무시간 · 상세내역.
- 스타일: `w-full border-collapse text-sm` · header `uppercase tracking-wider text-text-tertiary` · row `paced-table-row-fade` (60ms stagger).
- orphan: `bg-warning-light/10` 배경 · 상세내역 `bg-warning-light text-warning` 라벨.
- 정상: 상세내역 = `text-text-tertiary "정상"`.
- 출근/퇴근 = `font-mono` (구 화면 정합).

### 집계표 이식 (구 AttendanceAggregationTable)

**Fix** (`PconAttendanceLeft.tsx:220~380`):
- 컬럼: 년 · 월 · 이름 · 근무일수 · 지각일수 · 야근시간 · 특이사항 · 계획 · 차이 · 반영/제외.
- 스타일: `min-w-[900px] border-collapse text-sm` · header `uppercase tracking-wider` · row `paced-table-row-fade` (60ms stagger).
- 년/월 = attempt.started_at UTC 파생.
- 이름 = `{user_name} #{user_id}`.
- 근무일수 = 실 수치.
- 지각일수/야근시간/계획/차이 = **"-" fallback** (OT/Finalize 미배선 · G+6+ 이연 · 계약 명시).
- 특이사항 = `세션 N · Xh YYm` 표시 (신 정보 편입).
- 반영/제외 = 항상 `bg-success-light text-success "반영"`. excluded_sessions 는 별도 박스로 표시 (기존 아래).

## 회귀

- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Frontend TS**: `npx tsc -b --noEmit` = EXIT 0.
- **Vitest**: 24 files · **341 pass** · 17 skip.
- **Jest (pcon-adapter)**: 7 pass.
- **Lint**: EXIT 0.
- **lint:hooks**: EXIT 0.
- **npm 고정** · **포트 backend:4000/admin:4173 무변경**.

## 대본 재현 (Kyu 재실기 대비)

**초기화 → IMPORT (로그 완료 후 RAW) → 매핑 (로그 완료 후 테이블 + Name 박스) → 정리 (매핑 보존 + 구 정리본 위) → 집계 (구 집계 테이블)**:

1. `[data-testid=pcon-reset-run]` → confirm → 신규 run.
2. **IMPORT**:
   - 로그 순차 1200ms/줄 · 마지막 로그 revealed 될 때까지 좌 RAW 테이블 **부재**.
   - 마지막 로그 후: `[data-testid=pcon-result-attendance_import.file_import]` fade-in.
3. **name_mapping** [실행]:
   - 로그 순차 (M-2 감속).
   - 로그 완료 후: `[data-testid=pcon-result-attendance_import.name_mapping]` 등장.
   - **file_import RAW 표의 Name 컬럼만 수직 강조**: `[data-testid=pcon-raw-header-{L}][data-name-col=true]` (border-l/r accent). 데이터 셀도 name 컬럼만 강조. 행/테이블 전체 강조 X.
   - 레전드: "매핑 INPUT = D열 (Name)" (예).
4. **data_cleanup** [실행]:
   - 로그 순차.
   - 로그 완료 후: `[data-testid=pcon-result-attendance_import.data_cleanup]` fade-in **매핑 카드 위에** (스택 최신 위 · M-3 매핑 카드 소멸 X).
   - **구 화면 이식 테이블**: `[data-testid=pcon-cleanup-table]` · 컬럼 `#/이름/날짜/출근/퇴근/근무시간/상세내역` · font-mono · paced-table-row-fade.
   - orphan 행 = `bg-warning-light/10`.
5. **aggregate** [실행]:
   - 로그 순차.
   - 로그 완료 후: `[data-testid=pcon-result-attendance_import.aggregate]` fade-in **정리 카드 위에**.
   - **구 화면 이식 테이블**: `[data-testid=pcon-aggregate-table]` · min-w-[900px] · 컬럼 년/월/이름/근무일수/지각일수/야근시간/특이사항/계획/차이/반영/제외.
   - 지각/야근/계획/차이 = "-" (미배선 · G+6+ 이연).
   - 특이사항 = "세션 N · Xh YYm".
   - 반영/제외 = "반영" bg-success-light.

**전 사분면 순서 확인**:
- 3사분면 (레일 카드 로그) → 완료 → 2사분면 (좌 결과 카드) fade-in. 결과 먼저 등장 X.

## 이연 순증감

**본 라운드 (T0-0807-M) 순증**:
- **Backend**: 0 (엔진 계약 · 화면 이식만 · backend 변경 없음).
- **Frontend** 2개 파일:
  - `PconAttendanceContext.tsx` (Pacer 1200ms · latestDoneAttemptOf · latestDoneAnomaliesOf · isMinorRevealComplete).
  - `PconAttendanceLeft.tsx` (전면 rewrite · 구 화면 이식 · Name 컬럼 수직 강조 · doneAndRevealed 게이트).
- **문서**: `pcon-engine-v1.md` §9 (싱크 정본) + §10 (스택 보존) + §6.구현-M.
- **리포트**: relay `t0/T0-0807-M-report.md` (L 청소 · M 게시).

**본 라운드 (T0-0807-M) 순감**:
- Frontend: L 판본 정리본/집계 테이블 (신작) 삭제 · 구 화면 이식으로 교체.
- Frontend: K 판본 데이터 구간 박스 전체 강조 삭제 (M-4 Name 컬럼만).

**이연 (T0-0807-N)** · **row 편집·재작업 §8 정본 구현** (순연 확정 · 본래 M 예정):
- pcon_row_edit migration + entity + service + controller (§8 정본).
- UI 편집 modal + hover 툴팁 + [재작업] 버튼 (paced-action-pulse 재사용).
- STALE 파생 규칙 (pcon-core deriveStaleness) — 실은 이미 pcon-core stale.ts 존재 · M-3 회복 후 자연 소비.
- 재작업 트리거 + rework_triggered_by_edit 로그.

**이연 (G+6+)**:
- OT/Finalize 실 계산 · aggregate 지각/야근/계획/차이 컬럼 실 데이터 채움.
- alias 자동 승격 (V-2-4 admin_confirmed).
- flag 제거 · 구 pos-import 삭제.

## [요약]

- **M-1 완료**: `isMinorRevealComplete` 엔진 API · 결과 카드 = 로그 재생 완료 후 등장. docs §9 정본 편입.
- **M-2 완료**: Pacer 1200ms/줄 (사람 읽기 속도).
- **M-3 완료**: `latestDoneAttemptOf` · status derived 무시 · 결과 append-only 스택 · docs §10 계약 명문.
- **M-4 완료**: RAW Name 컬럼 수직 구간만 강조 (border-l/r/b accent) · 행/테이블 전체 강조 제거 · 레전드 "매핑 INPUT = L열 (Name)".
- **M-5 완료**: 정리본 (구 AttendanceRawTable) + 집계표 (구 AttendanceAggregationTable) 컬럼·스타일 그대로 이식 · paced-table-row-fade · font-mono · 미배선 컬럼 "-" fallback.
- **회귀**: TS 0 (backend + frontend) · Lint 0 · lint:hooks 0 · Vitest 341 pass · Jest 7 pass.
- **row 편집·재작업 §8 = N 순연 명시**.
- **커밋**: T0-0807-M (본 커밋 SHA).
