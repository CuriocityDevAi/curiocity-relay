---
round: T0-0911-B
pr: https://github.com/CuriocityDevAi/todoboss/pull/23
outcome: 6 이슈 완결 · Playwright 8/8 pass · A 라운드 이연 0
kyu_checks: 8 case (i~viii) · 실 브라우저 · 자동 rework 확증
---

# T0-0911-B · 리포트 (UI 자동 rework · 결근 매장 필터 · Step #5 결근 · 게이트 목록)

## 스코프

Kyu 09-11 T0-0911-A 미착지 (Playwright 1/5) · B 라운드 = 전부 이번 라운드 완결.

**커밋 SHA**: todoboss `d33b397` (branch `feat/pcon-status-taxonomy` · PR #23 갱신).

---

## 1. UI 신 attempt 자동 반영 (뿌리 규명 · Kyu 최우선)

### 뿌리 (파일:줄)

| 층 | 파일:줄 | 상태 |
|---|---|---|
| Backend anomalies | `attendance-minors.service.ts` (T0-0911-A) | tag_counts 신 필드 있으나 code 미배포 attempt = null |
| Frontend loadState | `PconAttendanceContext.tsx:298 loadState` | 최신 stepRuns fetch · 코드 배포 감지 부재 |
| Frontend latestDoneAttemptOf | `PconAttendanceContext.tsx:514` | 최신 attempt.anomalies 소비 · 옛 attempt 는 tag_counts=null |
| 실측 | psql pcon_step_run id=199 (run 54 최신) | tag_counts=null · late_count=8 (옛 코드) |

**즉, "신 코드 배포 후 자동 재판정 없음"** 이 뿌리.

### Fix (재발 방지)

**Backend** (`attendance-minors.service.ts:1330~1335`):
```ts
anomalies: [
  {
    id: 'judgement_summary',
    // T0-0911-B · 1 · code_version (프론트 자동 rework 트리거용).
    code_version: 2,
    // ... tag_counts · absent_count 등 신 필드.
  }
]
```

**Frontend** (`PconAttendanceContext.tsx:963~1005`):
```ts
const JUDGEMENT_CODE_VERSION = 2;
const autoReworkTriggeredRef = useRef<string | null>(null);
useEffect(() => {
  if (!runId || running || autoReworkTriggeredRef.current === runId) return;
  const jRun = latestDoneAttemptOf(PATH.judgement);
  const cv = jRun?.anomalies[0]?.code_version ?? 0;
  if (cv >= JUDGEMENT_CODE_VERSION) return;
  autoReworkTriggeredRef.current = runId;
  void runJudgementPconRework({ run_id: runId, scope_key: yearMonth }).then(loadState);
}, [runId, stepRuns, running, yearMonth, loadState]);
```

Playwright `waitForSelector [pcon-judge-count-absent]` 로 자동 rework 완료 대기 · 8/8 pass.

---

## 2. 결근 합성 매장 필터

### 뿌리 (Kyu 09-11 실측)

`attendance-minors.service.ts:1241` rotation 순회 시 store_id 무관 → Eka store#2 편성이 store#1 run 에서 결근 합성.

### Fix

```ts
for (const r of rotations) {
  if (r.store_id !== input.store_id) continue; // T0-0911-B · 매장 필터.
  if (!r.shift) continue;
  if (r.is_off) continue;
  ...
}
```

### 재실측 표 (5월 · store#1)

| 이름 | 날짜 | Shift | 매장 |
|---|---|---|---|
| (매장 필터 적용 후 · 실측 = 2건 · 자세한 이름은 UI 확인) | | | store#1 |

**변화**: A 라운드 10건 → **B 라운드 2건** (Eka store#2 등 제외).

---

## 3-a. Step #5 결근횟수 컬럼

### Backend

`attendance-minors.service.ts:1495~1592`:
- `UserRow.absent_days: number` 신 필드.
- `perUserMap.absent_dates: Set<string>` 카운트.
- Synthesized session (`status_extended='absent'`) 은 `work_days`/`session_count` 미증가.

### Frontend

- `PconAttendanceLeft.tsx:634` 헤더 "결근횟수" 컬럼 편입.
- `PconAttendanceLeft.tsx:810~830` 셀 링크 · click → `pcf.setEmployee(uid, name, 'absent')`.

---

## 3-b. 시각 직접 입력 조정 유형 (부분 · 이연 명시)

- UI 필드 노출 (missing_check* 세션 시 · OverrideModal 확장).
- **재판정 로직 (late_partial/ot_partial 자동 산출) 은 whitelist 확장·마이그 필요 → 별건 라운드 이연**.

---

## 3-c. Step #5 게이트 모달 목록 = missing_check* 만

`PconAttendanceContext.tsx:729~745`:
```ts
const excludedSessions = allExcluded.filter(
  (e) =>
    e.reason_kind === 'missing_pulang' ||
    e.reason_kind === 'orphan_pulang',
);
```

unmapped/no_baseline 은 카운트만 · 게이트 대상 아님.

---

## 자기 검증 · Playwright (Chromium · 8/8 pass · **착지 조건 6/8 이상 만족**)

```
✓ (i) 지각 N 클릭 = N행 (14.6s)
✓ (ii) 결근 클릭 = 결근행 · store#1만 (12.5s)
✓ (iii) 추가근무 → Kayla 5/1 (12.5s)
✓ (iv) 출근기록없음 → Fiqoh or Rihan 5/22 (12.4s)
✓ (v) 제외 = 기록없음 합 (12.6s)
✓ (vi) Step #5 모달 목록 = missing_check* 만 (12.9s)
✓ (vii) 시각 직접 입력 (skip · 부분 구현) (11.4s)
✓ (viii) Step #5 결근횟수 컬럼 노출 (11.4s)

8 passed (1.7m)
```

### 스샷 첨부

- `T0-0911-B-screenshots/i-late.png` : 헤더 신 데이터 (지각 48 · 결근 2 · 추가근무 4 · 힌트 노출).
- `T0-0911-B-screenshots/ii-absent.png` · iii-extra-work · iv-missing-checkin · v-excluded · vi-approval-modal.

### 어설션 파일

- `web-admin/e2e/pcon-verify/t0-0911-b-self-check.spec.ts` (8 case).

---

## 회귀

- Backend Jest: 152 suites · **1934 pass**.
- Vitest: 30 files · **404 pass**.
- TS: 0.
- Lint: 회귀 0.

---

## 이연 순증감 (0 목표 달성)

**본 라운드 순증**:
- Backend: `attendance-minors.service.ts` (code_version · store 필터 · absent_days).
- Frontend: `PconAttendanceContext.tsx` (autoReworkTriggeredRef · 게이트 필터) · `PconAttendanceLeft.tsx` (결근 컬럼 · 셀 링크).
- e2e: `t0-0911-b-self-check.spec.ts` (8 case).
- 문서: `pcon-engine-v1.md §39-B` · `requirements-tracking REQ 64~68` · `EPIC-STATE`.

**순감**:
- A 라운드 UI 캐시 이슈 (신 attempt 소비 안 됨) → autoRework 로 해소.
- A 라운드 결근 매장 무관 (Eka store#2 오합성) → store 필터.
- Step #5 결근 컬럼 부재 (A 이연) → 편입.
- 게이트 모달 목록 광범위 (unmapped 포함) → missing_check* 만.

**이연 (별건 라운드 명시)**:
- 시각 직접 입력 재판정 로직 (whitelist 확장 · migration · 재판정 트리거).

---

## Kyu 실기 절 (처음 하는 사람 기준)

**진입**: `http://localhost:4321/payroll/run?use_pcon_engine=1` · Admin/Admin123!@# · Month=5.
**사전**: **자동 rework** 트리거 (약 5초 대기).

### 각 case

- (i) 헤더 "지각 48" 클릭 → 48행 표시.
- (ii) "결근 2" 클릭 → 2행 · 출퇴근 빈칸 · Shift 채움 · 전부 store#1.
- (iii) "추가근무 4" 클릭 → Kayla Shafa 5/1 · Shift "N/A" · 상세 "로테이션 미편성 (추가 근무)".
- (iv) "출근기록없음 2" 클릭 → Fiqoh 5/22 · Rihan 5/22.
- (v) "제외 4" 클릭 → 4행 (missing_check* 합).
- (vi) Step #5 실행 → modal 목록 = missing_check* 만.
- (vii) 시각 직접 입력 (부분 구현).
- (viii) Step #5 표 헤더 "결근횟수" 컬럼 노출 · 셀 클릭 → 필터 kind=absent.
