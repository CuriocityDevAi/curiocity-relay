# T0-0807-O · 리포트 (B 확정 · 엔진 결함 3 + 정본 2 + hover 툴팁 · 구 화면 이식 = P 분리)

## 스코프

**Kyu M+N 실기 판정**: B 확정 (신 엔진 = 최종본 · 구 기능 완전 복제). 엔진 결함 3 + 정본 2 = O 라운드. **화면 이식 완전 복제 = P 순연 확정**.

**O 라운드**:
1. **O-1 [엔진]** 로그→결과 싱크 2회 노출 fix.
2. **O-2 [엔진]** 카드 접힘 타이밍 + Pacer 0.6s.
3. **O-3 [엔진 계약 위반]** 재작업 로그 보존 (append-only).
4. **O-4 [엔진]** 재작업 깜빡 해제 (미소비 편집만 true).
5. **O-5 [엔진 정본 신설]** 결과 접기 · 양방향 눈 아이콘 (docs §11).
6. **O-6 [엔진 정본]** hover 툴팁 표출 fix.

## O-1 · 결과 카드 2회 노출 fix

**뿌리 실측**:
- initial render 에서 log poll 아직 미실행 → `logsByStepRunId[attemptId] = []`.
- 이전 `isMinorRevealComplete`: `if (all.length === 0) return true;` → 완료 판정 → **결과 카드 1회 번쩍 노출**.
- 그 후 log poll 도착 → `all.length > 0`, `revealed = 0` → false → **결과 사라짐**.
- 순차 노출 완료 (revealed = all.length) → true → **재등장**.
- 총 2회 노출.

**Fix** (`PconAttendanceContext.tsx`):
- 신설 state `logsFetchedForRun: string | null`.
- run 변경 시 리셋 · 첫 poll tick 성공 시 `setLogsFetchedForRun(runId)`.
- `isMinorRevealComplete` 최우선 조건: `if (!runId || logsFetchedForRun !== runId) return false;`.
- 첫 poll 후 all=[] 인 edge (로그 없는 마이너) 만 즉시 완료.

## O-2 · 카드 접힘 타이밍 + Pacer 0.6s

**뿌리 (a)**: 이전 (K/M) 판본 · status ANY→DONE 전이 즉시 holdOpen 1.5s. Kyu 실기 = 로그 1줄 후 즉시 접힘 (좌측 결과 등장 전).

**Fix (a)** (`PconAttendanceContext.tsx`):
- 정본 재정의: **revealed complete 전이 (false → true) 감지** 시 holdOpen 발화 · 1500ms 후 삭제.
- `prevRevealCompleteRef.current[path]` 로 tick 대비 전이 감지.
- 이전 DONE-transition holdOpen 로직 완전 제거 (J-1 manualExpanded 삭제 로직만 남김).

```tsx
useEffect(() => {
  const paths = [PATH.file_import, PATH.name_mapping, PATH.data_cleanup, PATH.aggregate];
  for (const p of paths) {
    const cur = isMinorRevealComplete(p);
    const prev = prevRevealCompleteRef.current[p] ?? false;
    if (cur && !prev) {
      setHoldOpen(prevSet => new Set(prevSet).add(p));
      setTimeout(() => setHoldOpen(prevSet => {
        const next = new Set(prevSet); next.delete(p); return next;
      }), 1500);
    }
    prevRevealCompleteRef.current[p] = cur;
  }
}, [isMinorRevealComplete]);
```

**Fix (b)**: Pacer 감속 재조정: 1200 → **600ms/줄** · 초기 로그 200 → 150ms.

## O-3 · 재작업 로그 보존 (append-only 위반 fix)

**뿌리**: 이전 `logsForMinor(path)` = `currentAttemptOf(path)` (latest attempt) 기반 → 재작업 시 신 attempt 로그만 반환 → 이전 attempt 로그 전량 소멸.

**Fix** (`PconAttendanceContext.tsx`):
```tsx
const logsForMinor = useCallback((path: string): PconLogRow[] => {
  const runsOfPath = stepRuns
    .filter(r => r.step_path === path && !r.dry_run)
    .sort((a, b) => a.attempt_no - b.attempt_no);
  const result: PconLogRow[] = [];
  for (const r of runsOfPath) {
    const all = logsByStepRunId[r.id] ?? [];
    const revealed = revealedByStepRun[r.id] ?? 0;
    result.push(...all.slice(0, revealed));
  }
  return result;
}, [stepRuns, logsByStepRunId, revealedByStepRun]);
```
- 이전 로그 보존 + 신 attempt 로그가 이어 쌓임.
- 헌법 정합 (append-only · pcon_log 자체는 이미 append-only DB · 소비 로직만 fix).

## O-4 · 재작업 깜빡 해제

**뿌리**: `hasEditsUpstream` 이 상류 편집 존재만 판정 · 편집 시각 vs 후속 attempt 시각 미비교 → 재작업 완료 후에도 지속 true.

**Fix** (`PconAttendanceContext.tsx`):
```tsx
const hasEditsUpstream = (minorPath) => {
  // 후속 마이너 (자기) 의 latest attempt 시작 시각.
  let myLatestStart = 0;
  for (const r of stepRuns) {
    if (r.step_path === minorPath && !r.dry_run) {
      const t = new Date(r.started_at).getTime();
      if (t > myLatestStart) myLatestStart = t;
    }
  }
  if (myLatestStart === 0) return false; // 미실행.
  // 상류 편집 중 하나라도 후속 attempt 시작 이후에 발생 → 미소비.
  for (let i = 0; i < idx; i++) {
    const upEdits = rowEdits.filter(e => e.step_run_id === upstreamAttempt.id);
    for (const edit of upEdits) {
      if (new Date(edit.edited_at).getTime() > myLatestStart) return true;
    }
  }
  return false;
};
```

- 정본: **"미소비 편집" 만 true**.
- 재작업 완료 시 신 attempt.started_at > edit.edited_at → false → pulse 해제 → 일반 [실행] 복귀.

## O-5 · 결과 접기 (양방향 눈 아이콘 · 엔진 정본 신설)

**정본** (docs §11 신설):
- 3사분면 마이너 카드에 눈 아이콘 (`👁` 뜬눈=펼침·밝음 / `🙈` 감은눈=접힘·어두움).
- 2사분면 결과 헤더 = **"STEP #N: INPUT xx → OUTPUT xx"** · 헤더 클릭 = 테이블 접기/펴기.
- 3사분면 눈 ↔ 2사분면 헤더 = 동일 상태 동기화.
- 접힘 시각: 결과 섹션 `border-2 border-accent`.

**Fix**:
- Context (`PconAttendanceContext.tsx`):
  - `resultCollapsed: Record<string, boolean>` state.
  - `isResultCollapsed(path)` / `toggleResultCollapsed(path)` API.
- Left (`PconAttendanceLeft.tsx`):
  - `CollapsibleHeader` 컴포넌트 신설 · props = {path, seq, card, collapsed, onToggle}.
  - 각 결과 섹션 (aggregate · cleanup · name_mapping · file_import) 이 사용.
  - `data-testid=pcon-result-header-{path}` · `data-collapsed=true|false`.
  - 접힘 시 body 조건부 렌더 (테이블 · 페이지네이션 hidden · 헤더만).
- Rail (`PconAttendanceRail.tsx`):
  - `[data-testid=pcon-step-{path}-eye]` 눈 아이콘 버튼.
  - `latestDoneAttemptOf(path)` 있을 때만 표시.
  - collapsed=true → `🙈 · bg-surface-tertiary opacity-60` · 아니면 `👁 · bg-accent-light`.

## O-6 · hover 툴팁 표출 fix

**뿌리**: `title` 이 `<tr>` 에 붙어 있어 여러 셀에 걸침. `\n` newline 이 브라우저 native title 에서 축약되어 표시 안 되는 경우 있음.

**Fix** (`PconAttendanceLeft.tsx`):
- 편집된 개별 셀 (check_in / check_out / work_days) 에 `title={formatEditTooltip(edit)}` 부여.
- 편집된 셀 배경 `bg-accent-light/40` (hover 인지 지원).
- 배지 (`✎ 수정됨`) 에도 개별 title + `cursor-help` + `hover:bg-accent`.
- 각 편집마다 별도 title (배지 = 전체 요약 · 셀 = 해당 field 편집).

## 회귀

- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Frontend TS**: `npx tsc -b --noEmit` = EXIT 0.
- **Vitest**: 24 files · **341 pass** · 17 skip.
- **Jest (pcon-adapter)**: 7 pass.
- **Lint**: EXIT 0.
- **lint:hooks**: EXIT 0.

## 대본 재현 (Kyu 재실기 대비)

**완주 → 눈 아이콘 접기 → 편집 툴팁 → 재작업 (로그 보존 · 깜빡 해제)**:

1. Reset → IMPORT:
   - 결과 카드 (RAW) = **로그 재생 완료 후 1회만** 등장 (초기 번쩍 X · O-1).
   - Pacer 600ms/줄 (O-2b · 감속).
   - 로그 재생 완료 → 결과 fade-in → 1.5s 여운 → 아코디언 접힘 (O-2a).
2. 매핑 / 정리 / 집계 완주 · 각 스택 최신 위.
3. **눈 아이콘 접기 (양방향 · O-5)**:
   - 좌측 결과 헤더 `[data-testid=pcon-result-header-attendance_import.file_import]` 클릭 → collapsed.
   - 우측 카드 `[data-testid=pcon-step-attendance_import.file_import-eye][data-collapsed=true]` = 🙈 · 어두움.
   - Rail 눈 아이콘 클릭 → 좌측 결과 [data-collapsed] 동기화.
4. **편집 툴팁 (O-6)**:
   - 정리본 row [✎ 편집] 클릭 → modal → 저장.
   - 편집된 셀 `bg-accent-light/40` · hover → title 툴팁 (check_out: 17:30 → 17:45 · 수정자 #12 · 시각 · 사유).
   - "✎ 수정됨" 배지 hover → title 툴팁 (전체 편집 리스트).
5. **재작업 (O-3 로그 보존 · O-4 깜빡 해제)**:
   - aggregate 카드 `[data-testid=...aggregate-execute][data-rework=true]` · "⚠ 재작업" · pulse.
   - 클릭 → executeRework → 신 attempt.
   - **로그 순차 노출 (600ms/줄)**:
     - 이전 attempt 로그 그대로 (예: aggregate_started · aggregate_progress · step_completed).
     - 신 attempt 로그가 이어 append: "▶ row 편집에 의한 재작업 · aggregate (신 attempt 시작)" · aggregate_started · ... · step_completed.
     - 총 로그 = 이전 + 신 (O-3 보존 · 헌법 정합).
   - **재작업 완료 후**:
     - hasEditsUpstream(aggregate) = false (edit.edited_at < 신 attempt.started_at · O-4 미소비 없음).
     - [⚠ 재작업] → [실행] 라벨 복귀 · pulse 해제.

## 이연 순증감

**본 라운드 (T0-0807-O) 순증**:
- **Backend**: 없음 (엔진 계약 · UI 만 · backend 변경 없음).
- **Frontend** 3개 파일:
  - `PconAttendanceContext.tsx` (logsFetchedForRun · Pacer 600ms · logsForMinor concat · hasEditsUpstream 미소비 판정 · resultCollapsed · reveal complete transition holdOpen).
  - `PconAttendanceLeft.tsx` (CollapsibleHeader · 각 섹션 collapsed 조건부 렌더 · 편집 셀 개별 title · 배지 title).
  - `PconAttendanceRail.tsx` (눈 아이콘 · toggleResultCollapsed 배선).
- **문서**: `pcon-engine-v1.md` §11 (결과 접기 정본) + §6.구현-O.
- **리포트**: relay `t0/T0-0807-O-report.md` (N 청소 · O 게시).

**본 라운드 순감**:
- Frontend: 이전 DONE-transition holdOpen 로직 삭제 (revealed complete transition 로직으로 교체).

**이연 (T0-0807-P)** = **구 화면 완전 복제** (Kyu 확정 순연):
- AttendanceRawTable full port (달력 · 필터 · 상세내역 · 편집 다이얼로그 링크 · 오버라이드 · '재작업' 컬럼 등).
- AttendanceAggregationTable full port (이름 클릭 달력 · cell 필터링 · 지각/야근/계획 실 데이터 배선 후).
- AttendanceAggregationTotals 이식.
- 필터·페이지네이션·정렬 등 UX 파리티.

**이연 (G+6+)**:
- OT/Finalize 실 계산 · aggregate "-" 컬럼 실 데이터 · flag 제거 · 구 pos-import 삭제.

## [요약]

- **O-1** completion: `logsFetchedForRun` state · 첫 poll 완료 전 결과 카드 차단 → 2회 노출 소멸.
- **O-2** completion: (a) revealed complete 전이 감지 → holdOpen 1.5s → 접힘 (결과 등장 후). (b) Pacer 600ms/줄.
- **O-3** completion: `logsForMinor` = 해당 path 모든 attempt 로그 concat · 재작업 시 이전 로그 보존 + 신 로그 append.
- **O-4** completion: hasEditsUpstream = "미소비 편집" 만 true (`edit.edited_at > 후속 latest attempt.started_at`) · 재작업 완료 후 pulse 해제 · [실행] 복귀.
- **O-5** completion: docs §11 정본 신설 · `resultCollapsed` state · `CollapsibleHeader` (STEP #N: INPUT xx → OUTPUT xx · 클릭 접기) · Rail 눈 아이콘 (👁/🙈) 양방향 동기화 · 접힘 시 body hidden + border-2 border-accent.
- **O-6** completion: 편집된 개별 셀 + 배지에 title · `bg-accent-light/40` + `cursor-help` · 각 편집마다 별도 툴팁.
- **회귀**: TS 0 (backend + frontend) · Lint 0 · lint:hooks 0 · Vitest 341 pass · Jest 7 pass.
- **P 순연 명시**: 구 테이블 완전 복제 (달력·필터·상세) = P 라운드.
- **커밋**: T0-0807-O (본 커밋 SHA).
