# T0-0807-I · 리포트 (게이트⑯ 4차 · duplicate 재사용 · Reset 의미론 · UX 정본)

## 스코프

Kyu 게이트⑯ 4차 관찰 · 배치 ✓ (레일 정합).

**신규 결함 2 + 정본 2**:
1. **I-1** 중복 Y/N 확정 → 500 (duplicate key violates UQ_pcon_step_run_in_progress).
2. **I-2** 강제 초기화 × pcon 의미론 (append-only 유지).
3. **I-3** 문구 정본: "예(강제진행)/아니오(기존 유지)".
4. **I-4** 확정 후 UX (예 = RAW 재생성 · 아니오 = 유지).

## I-1 · duplicate_decision 재사용 (500 뿌리 fix)

**뿌리 실측 (Kyu 재현)**:
- 첫 업로드 · 파일 X · attempt#1 IN_PROGRESS → 파싱 → DONE.
- 두번째 업로드 · 동일 파일 · idempotency=checksum · 기존 DONE attempt#1 발견 · IN_PROGRESS 아님 → idempotency=null 강제 · 신규 **attempt#2 IN_PROGRESS INSERT** → duplicate check → USER_CHOICE_PENDING · attempt#2 IN_PROGRESS 유지.
- 사용자 "예" 클릭 → `execute()` 재호출 · `startStepAttempt(idempotency=checksum)` 다시 호출:
  - `findOne where idempotency_key=checksum` → attempt#1 (DONE) 반환.
  - IN_PROGRESS 아님 → idempotency=null 강제 · **신규 attempt#3 IN_PROGRESS INSERT 시도**.
  - **하지만 attempt#2 도 IN_PROGRESS** → `UQ_pcon_step_run_in_progress` partial UNIQUE 위반 → 500.

**Fix** (`backend/src/todoboss/payroll/pcon-adapter/attendance-file-import.service.ts:172~264`):

```ts
if (input.duplicate_decision) {
  // 기존 IN_PROGRESS attempt 이어받음 (신규 INSERT 금지 · UNIQUE 방지).
  const runs = await this.engine.listStepRunsForRun(run.id);
  const existingInProgress = runs
    .filter(r => r.step_path === PATH && r.status === 'IN_PROGRESS' && !r.dry_run)
    .sort((a, b) => b.attempt_no - a.attempt_no)[0];
  stepRun = existingInProgress ?? await startStepAttempt(...);
} else {
  // 신규 시도.
  stepRun = await startStepAttempt(...);
}

// cancel: 즉시 종결.
if (input.duplicate_decision === 'cancel') {
  await engine.completeStepAttempt({
    step_run_id: stepRun.id,
    output_count: 0,
    anomalies: [{id: 'user_kept_existing', message: '사용자가 기존 데이터 유지 선택'}],
  });
  return { status: 'DONE', ... };
}

// proceed: decision log emit · 파싱 진행.
if (input.duplicate_decision === 'proceed') {
  await engine.emitLog({template_id: 'duplicate_file_decision', params: {decision: 'proceed'}});
} else {
  await engine.emitLog({template_id: 'upload_started', ...});
}
```

**결과**: attempt#2 그대로 이어받음 · 신규 INSERT 안 함 · UNIQUE 위반 없음.

## I-2 · Reset (신규 run 개시 · append-only)

**뿌리**: 기존 pos-import full_reset 은 pcon 을 모름 · pcon_run 은 이전 그대로 유지 · 첫 IMPORT 시 이전 attempt 와 checksum 매칭 → 중복 감지 "말도 안 됨" 상황.

**신설 `PconEngineService.resetToNewRun`** (`backend/src/shared/pcon-engine/pcon-engine.service.ts:170~207`):
```ts
async resetToNewRun(input) {
  // 1. 현재 run 의 IN_PROGRESS attempt 를 ABANDONED 로 종결.
  const currentRun = await findLatestRun(...);
  if (currentRun) {
    const runs = await listStepRunsForRun(currentRun.id);
    for (const r of runs) {
      if (r.status === 'IN_PROGRESS') {
        r.status = 'ABANDONED';
        r.ended_at = new Date();
        r.anomalies = [{id: 'reset_abandoned', message: '강제 초기화 · 신규 run 개시'}];
        await stepRunRepo.save(r);  // append-only 트리거 허용 전이 (IN_PROGRESS → ABANDONED)
      }
    }
  }
  // 2. 신규 run 개시 (append-only · 이전 attempt 보존).
  return this.startRun(...);
}
```

**신설 endpoint** (`backend/src/todoboss/payroll/pcon-adapter/attendance-minors.controller.ts:31~51`):
- `POST /api/admin/pcon/attendance/reset` · body `{scope_key, reason?}` → `{run_id, run_no}`.

**중복 검사 스코프 = 현재 run 만**:
- `listStepRunsForRun(run.id)` 이 원래 현재 run 만 반환.
- reset 후 신규 run · 이전 run 의 attempt 접근 불가 → 중복 checksum 매칭 X → "초기화 후 중복 감지" 소멸.

## I-3 · 문구 정본

`web-admin/src/pages/payroll/pcon-view/PconAttendanceRail.tsx:293`:
- "예 (재진행)" → **"예 (강제진행)"**.
- "아니오 (기존 유지)" 유지.

## I-4 · 확정 후 UX 정본

`web-admin/src/pages/payroll/pcon-view/PconAttendanceContext.tsx:294~306`:

**acceptDuplicate** (예 · 강제진행):
```ts
setUploadResult(null);  // 낙관적 · 좌측 RAW 즉시 제거
void handleFileSelected(duplicateFile, 'proceed');
// backend DONE → loadState → 신 RAW 데이터 반영 → 좌측 RAW 재생성.
```

**cancelDuplicate** (아니오 · 기존 유지):
```ts
void handleFileSelected(duplicateFile, 'cancel');
// backend 는 기존 attempt 종결 (output=0) · uploadResult 초기화되어 카드 dismiss · 좌측 RAW 유지.
```

## Frontend Reset UI

**Context** (`PconAttendanceContext.tsx:308~322`):
```ts
const resetRun = useCallback(async () => {
  setError(null);
  try {
    await resetPconRun({ scope_key: yearMonth, reason: '사용자 강제 초기화' });
    setUploadResult(null);
    setLogs([]);
    await loadState();
  } catch (err) {
    setError(...);
  }
}, [yearMonth, loadState]);
```

**Rail** (`PconAttendanceRail.tsx:143~158`):
```tsx
<button
  data-testid="pcon-reset-run"
  onClick={() => window.confirm('강제 초기화 · 신규 run 개시') && void resetRun()}
>
  ⚠ 강제 초기화 (신규 run)
</button>
```

## 회귀

- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Frontend TS**: `npx tsc --noEmit` = EXIT 0.
- **Vitest**: 24 files · **341 pass** · 17 skip.
- **Jest (backend pcon-adapter parser)**: 7 pass.
- **Lint**: EXIT 0.
- **lint:hooks**: EXIT 0.
- **npm 고정** · **포트 backend:4000/admin:4173 무변경**.

## 대본 재현 (Kyu 재실기 대비)

**초기화 → 5월 IMPORT → 재업로드 중복 → 예/아니오**:

1. `[data-testid=pcon-reset-run]` 클릭 · window.confirm → POST `/reset` → 신규 run (run_no+1). `logs=[]` · `uploadResult=null`.
2. IMPORT 5월 파일 → 신규 run 이라 이전 checksum 매칭 X → duplicate_file_prompt **부재** · `pcon-step-...-user-choice` DOM 없음. 파싱 → DONE · RAW 생성.
3. 동일 파일 재업로드 → duplicate 감지 · `[data-testid=pcon-step-attendance_import.file_import-user-choice]` 존재 · 버튼 "예 (강제진행)" / "아니오 (기존 유지)".
4. **예** 클릭 → `setUploadResult(null)` (좌 RAW 낙관적 제거) → POST `/file-import?decision=proceed` → backend 는 기존 IN_PROGRESS 이어받아 파싱 → DONE (500 없음) → loadState → **신 RAW 재생성**.
5. **아니오** 클릭 → POST `/file-import?decision=cancel` → backend 는 기존 attempt 종결 (output=0) → uploadResult null → 카드 dismiss · **좌 RAW 유지**.

## 이연 순증감

**본 라운드 (T0-0807-I) 순증**:
- Backend Fix 3: `attendance-file-import.service.ts` (duplicate_decision 경로 재구조) · `pcon-engine.service.ts` (resetToNewRun) · `attendance-minors.controller.ts` (POST /reset endpoint).
- Frontend Fix 3: `pcon-engine.ts` (resetPconRun API) · `PconAttendanceContext.tsx` (resetRun + 낙관적 UI) · `PconAttendanceRail.tsx` (reset 버튼 + 문구 정본).
- 문서: `pcon-engine-v1.md` §6.구현-I 절.
- 리포트: `curiocity-relay/t0/T0-0807-I-report.md` (H 청소 · I 게시).

**본 라운드 (T0-0807-I) 순감**:
- Backend: 중복 duplicate check 로직 정리 (duplicate_decision 분기 dedup ~30 lines 통합).

**이연 (G+5)**:
- 3 마이너 실 도메인 로직 (stub → 실 배선).
- 진짜 RAW 전량 렌더 (샘플 → 페이지네이션).
- 데이터 정리본 · 집계표 실 데이터.
- 기존 코드 삭제 (G+6 · flag 제거).

## [요약]

- **I-1** completion: 500 뿌리 = startStepAttempt 재호출로 신규 INSERT · partial UNIQUE 위반. Fix = duplicate_decision 있으면 기존 IN_PROGRESS 이어받음 (INSERT 금지).
- **I-2** completion: PconEngineService.resetToNewRun (IN_PROGRESS→ABANDONED + 신규 run_no · append-only) + POST /reset endpoint. 중복 검사 스코프 = 현재 run 만 → 초기화 후 중복 감지 소멸.
- **I-3** completion: "예(강제진행)/아니오(기존 유지)" 문구 정본.
- **I-4** completion: 예 = 낙관적 RAW 제거→재생성 · 아니오 = 유지.
- **회귀**: TS 0 (backend + frontend) · Lint 0 · Vitest 341 pass · Jest 7 pass.
- **커밋**: T0-0807-I (본 커밋 SHA).
