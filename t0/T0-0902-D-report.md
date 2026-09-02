# T0-0902-D · 리포트 (판정 정본 재이식 · 다중 상태 · 번복 500 · pagination)

## 스코프

**Kyu 09-02 실기 결과**: 4 defect.
- D-1 판정 정본 미정합 (FERYAN 조퇴 오탐 · Puji 문구 불일치) → 뿌리 fix.
- D-2 상태 다중 표시 (지각+야근 동시 discard) → status_tags[].
- D-3 번복 저장 500 (Amel ot_denied) → 서비스+컨트롤러 방어 (POST 도 W-7 대칭).
- D-4 판정 테이블 pagination 부재 → data_cleanup 대칭 UX.

**커밋 SHA**: todoboss `0669e30` · 브랜치 `feat/payroll-p3-e-df-h` (PR #20 base) · relay 본 push.

---

## D-1 · 판정 기준 정본 재확인·재이식 (뿌리·최우선)

### Kyu 정본 재확인 (재론 금지 · 07-29 회신 재확인)

| 구분 | 시작 | 종료 | 지각 유예 | 야근 유예 | 조퇴 유예 |
|---|---|---|---|---|---|
| Casher Shift 1 | 08:00 | 17:00 | 10분 | 30분 | 10분 |
| Casher Shift 2 | 13:00 | 22:00 | 10분 | 30분 | 10분 |
| non-Casher (FIXED/미배정) | 07:30 | 16:30 | 10분 | 30분 | 10분 |

- **1st 판정자** = `work_type` (Roles 아님 · Casher=SHIFT · 그 외=FIXED default).
- **2nd 판정자** (Casher 만) = `WorkRotation.shift` (SHIFT_1/SHIFT_2 · null=non_casher fallback · W-4).
- **정밀도** = **초 단위** (17:00:00 → 야근 0 / 17:00:01 → 야근 1).
- **지각 유예 10** = 발화 조건만 (지각 분 계산은 grace 차감 X · check_in - startMin).
- **야근 유예 30** = 발화 조건 + threshold 초과분만 (check_out - (endMin+30)).
- **조퇴 유예 10** = 발화 조건 + endMin - check_out (지각 대칭).

### 실측 반증 2건 (Kyu 09-02)

**FERYAN #3** · casher_shift1 (08:00~17:00) · 07:57 in 16:58 out → 종전 판정 **조퇴 2분**.
- 뿌리 (`shift-baseline.ts:이전 default`): `DEFAULT_EARLY_LEAVE_GRACE_MINUTES = 0` (W-5 default).
- outMin=1018 · endMin=1020 · grace=0 → 1018 < 1020 → early_leave 2분 발화.
- **정본**: 조퇴 유예 10 · 16:50 이전 퇴근만 조퇴 · **16:58 = 정상**.

**Puji #43** · casher_shift1 · 17:37:47 out · 화면 문구 "Shift1 정시 17:00 · 유예 30m 기산 17:30".
- 종전 계산 (분 단위): outMin=1057 · threshold=1050 → **ot 7분**. 문구-계산 정합 O.
- 다만 **분 단위 절삭**으로 17:37:47 의 47초가 무시됨 (7:47 → 7). Kyu 정본 = 초 정밀 → **ceil 8분**.
- baseline_label 확장 (문구 정본화): `"08:00~17:00 · 지각 유예 10분 (08:10) · 야근 기산 17:30 · 조퇴 유예 10분 (16:50)"`.

### Fix (파일:줄)

**`shift-baseline.ts`**:
- `DEFAULT_EARLY_LEAVE_GRACE_MINUTES` 0 → 10 (지각 유예 대칭 · Kyu 정본).
- `timeStrToSeconds` 신설 (초 단위 파싱).
- `judgeSession` 재구성: 초 단위 계산 + `Math.ceil((초 - threshold)/60)` (17:00:01 → ot 1 · 17:37:47 → ot 8).
- `baseline_label` = `"start~end · 지각 유예 X분 (HH:MM) · 야근 기산 HH:MM · 조퇴 유예 Y분 (HH:MM)"` (기산 시각 명시).

### 경계 회귀 (Kyu 요구 · `attendance-judgement.spec.ts` 신 8 case)

| # | 시나리오 | 예상 |
|---|---|---|
| 1 | FERYAN: casher_shift1 07:57 in 16:58 out | **normal** (기존 오탐 해소) |
| 2 | non_casher 16:19 out | early_leave 11 |
| 3 | casher_shift2 21:51 out | normal (유예 10) |
| 4 | non_casher 16:30:00 · 17:00:00 · 17:00:01 out | normal · normal · **ot 1** |
| 5 | casher_shift1 17:30:00 · 17:30:01 out | normal · **ot 1** |
| 6 | casher_shift2 22:30:00 · 22:30:01 out | normal · **ot 1** |
| 7 | Puji: casher_shift1 17:37:47 out | **ot 8** (초 정밀) |

**결과**: Jest 57 pass (기존 42 + 신 8 + D-2 status_tags 검증 4 · 3 test suite).

---

## D-2 · 상태 다중 표시 (status_tags[])

### Kyu 판정

> 지각과 야근이 동시에 성립하면 (Amel #1: late 57 · ot 63) 두 상태 모두 태그로 표기. 우선순위 sort 는 유지하되 discard 금지.

### Fix

**`shift-baseline.ts`**:
- `JudgeResult.status_tags: SessionStatus[]` 신설.
- `judgeSession`: `ot_minutes > 0 → tags.push('ot')` · `early_leave_minutes > 0 → tags.push('early_leave')` · `late_minutes > 0 → tags.push('late')` (우선순위 순 · 정본 유지).
- `applyOverrides` 도 재산정 (override 반영 후).

**`attendance-minors.service.ts`**:
- `JudgedSession.status_tags: SessionStatus[]` 필드 추가 · `judged.push({...status_tags: applied.status_tags})`.

**`PconAttendanceLeft.tsx`** (판정 STEP #4 status 셀):
- 종전 단일 status 삼항 렌더 → `status_tags?.length > 0 ? status_tags : [status]` 배열 렌더.
- `data-testid="pcon-judgement-status-tags-{i}"` · `data-tags="ot,late"` (테스트 hook).

### 검증

Jest 신설 4 case (status_tags · applyOverrides 후 남은 태그) 전 통과.

---

## D-3 · 번복 저장 500 뿌리 fix

### Kyu 관찰

Amel #1 · 2026-05-02 · ot_denied 시나리오: [⚠ 번복] modal → 야근 불인정 + 사유 → 저장 → "Request failed with status code 500". W-7 은 GET /overrides 만 감쌌고 POST 는 미 방어.

### 뿌리 특정 (5 후보 · 파일:줄)

**`pcon-override.service.ts:createOverride`**:
1. `after_value === undefined` (Modal 클라 미필 시) → JSONB NOT NULL 위반 → DB 500.
2. `before_value === undefined` → JSONB nullable (typeorm 통과 가능) · 방어 캐스팅.
3. `step_run_id findOne` bigint 형식 오류 → throw → 500.
4. `save` 시 FK 위반 (step_run_id 부재) · CHECK 위반 (마이그 268 미배포) · relation 부재 (마이그 266 미배포).
5. **뿌리 확인 (개발 DB 상태)**: 마이그 268 (early_leave_excused 추가) 미배포 시 ot_denied 는 통과하지만 후속 시나리오에서 재발 가능 · 실제 로그 없이는 CHK 인지 FK 인지 확정 불가.

### Fix

**`pcon-override.service.ts`**:
- `Logger` 도입 · save/findOne 실패 스택 + payload 요약 로깅.
- `after_value === undefined → BadRequest` (JSONB NOT NULL 사전 방어).
- `before_value === undefined → null 캐스팅` (JSONB nullable 정합).
- `step_run_id findOne` try/catch → 형식 오류 명시 BadRequest.
- `repo.save` try/catch → 오류 메시지 패턴 매치:
  - `violates check constraint` → BadRequest ("DB CHECK 위반 · 268 미배포 시 early_leave_excused 불허").
  - `violates foreign key` → BadRequest ("step_run_id FK 위반").
  - `not-null constraint` → BadRequest ("NOT NULL 위반").
  - `relation does not exist` → InternalServerError ("pcon_override 테이블 없음 · 266 미배포").
  - 기타 → InternalServerError (원문).

**`pcon-override.controller.ts`**:
- POST override try/catch (W-7 대칭) · `HttpException` pass-through · 나머지 로깅 + BadRequest.

### 결과

- 500 반환은 유일하게 `pcon_override 테이블 자체 부재` 시나리오에서만 발생.
- 그 외 시나리오는 명시 사유 담긴 BadRequest 로 응답 · 프론트 error UI 소비 가능 (`err.response.data.message`).
- 서버 로그에 payload 요약 + 스택 남음 → 재발 시 뿌리 즉시 확정.

---

## D-4 · 판정 테이블 pagination

### Kyu 관찰

STEP #3 (data_cleanup) 은 pagination (이전/현재/전체/다음) 완비. STEP #4 (judgement) 는 `slice(0, 100) + "외 N건" 문구`만 · 검색 불가.

### Fix

**`PconAttendanceLeft.tsx`**:
- `[judgementPage, setJudgementPage] = useState(0)` state 신설.
- `jTotalPages = Math.ceil(jSessions.length / RAW_PAGE_SIZE)` · `jPageIdx` clamp · `jPageRows = slice(jStart, jStart + RAW_PAGE_SIZE)`.
- 표 위에 `data-testid="pcon-judgement-pagination"` (이전/`n/총`/다음) · 표 아래 `data-testid="pcon-judgement-page-info"` (1–50/259).
- data_cleanup pattern 대칭 (RAW_PAGE_SIZE=50).

---

## 회귀

- **Backend TS (pcon-adapter/pcon-override 관련)**: 회귀 0.
- **Frontend TS**: EXIT 0.
- **Jest (pcon-adapter)**: **57 pass** (신 8 boundary + 4 status_tags · 기존 45 유지).
- **Vitest**: 24 files · **344 pass** · 17 skip.
- **Lint (내 수정 파일)**: shift-baseline.ts · attendance-judgement.spec.ts · pcon-override.service.ts · pcon-override.controller.ts · PconAttendanceLeft.tsx = EXIT 0.
- **lint pre-existing** (attendance-minors.service.ts 5 개 · line 40/41/80/467/468 no-base-to-string): 기존 코드 이슈 · 이번 라운드 회귀 없음.

---

## Kyu 실기 절 (self-contained)

**진입 주소 (반드시 이 URL)**:
```
http://localhost:4321/payroll/run?use_pcon_engine=1
```

⚠ 사이드바 클릭 시 URL 에서 `?use_pcon_engine=1` 이 빠져 구 화면으로 돌아감. 항상 위 주소 붙여넣기 또는 `localStorage.setItem('use_pcon_engine','1')`.

### Case D-1 · 판정 정본 재이식

- [ ] FERYAN #3 (07:57~16:58 · casher_shift1) 이 **정상**으로 판정.
- [ ] Puji #43 (17:37:47 out) 이 **야근 8분** (7 아님) · hover title `baseline_label` 이 `"08:00~17:00 · 지각 유예 10분 (08:10) · 야근 기산 17:30 · 조퇴 유예 10분 (16:50)"` 로 표시.
- [ ] 비-Casher 17:00:00 → 야근 0 / 17:00:01 → 야근 발생.
- [ ] Shift1 17:30:00 → 0 · 22:30:00 → 0.

### Case D-2 · 상태 다중 표시

- [ ] Amel #1 (지각 57 · 야근 63) 이 status 셀에 **두 개 태그** (야근 · 지각) 표시.
- [ ] 우선순위 정렬 (첫 태그 = ot · 두 번째 = late).
- [ ] DevTools: `document.querySelector('[data-testid=pcon-judgement-status-tags-0]')?.dataset.tags` = "ot,late".

### Case D-3 · 번복 저장 500 방어

- [ ] Amel · 2026-05-02 · ot_denied 저장 → 성공 (200) 또는 명시 오류 (BadRequest + 사유 담김) · **500 은 발생하지 않음**.
- [ ] 500 이 발생하면 = pcon_override 테이블 자체 부재 (마이그 266 미배포) · 서버 로그에 상세 payload 노출.
- [ ] 만약 마이그 268 미배포 상태에서 early_leave_excused 시도 시 → BadRequest ("DB CHECK 위반 · 268 미배포").

### Case D-4 · 판정 테이블 pagination

- [ ] STEP #4 표 위에 pagination UI (이전 / 1/N / 다음) 존재.
- [ ] 이전 클릭 → 첫 페이지에서 disabled · 다음 클릭 → 마지막에서 disabled.
- [ ] STEP #3 (data_cleanup) 과 UX 완전 동일 (버튼 스타일 · 페이지 번호 표기 · 크기).

---

## 이연 순증감

**본 라운드 (T0-0902-D) 순증**:
- **Backend**:
  - `shift-baseline.ts` (timeStrToSeconds · judgeSession 초 단위 · status_tags · baseline_label 확장 · DEFAULT_EARLY_LEAVE_GRACE_MINUTES=10).
  - `attendance-minors.service.ts` (JudgedSession.status_tags 편입).
  - `pcon-override.service.ts` (Logger · after_value 검증 · before_value nullable · save 오류 패턴 매치).
  - `pcon-override.controller.ts` (POST try/catch · W-7 대칭).
- **Frontend**:
  - `PconAttendanceLeft.tsx` (JudgedSession.status_tags 타입 · 판정 페이지 state · pagination UI · status 셀 태그 배열 렌더).
- **테스트**:
  - `attendance-judgement.spec.ts` 신설 12 case (경계 8 + status_tags 4).
- **문서**: `pcon-engine-v1.md §24~§27` · `requirements-tracking.md §3-P` (4 REQ 편입).
- **relay**: `t0/T0-0902-D-report.md` (본).

**본 라운드 순감**:
- 종전 조퇴 유예 0 (오탐 원흉) · 종전 분 단위 절삭 (17:00 boundary 불명확) · 종전 status 단일 렌더 (Amel 지각 은닉) · 종전 판정 테이블 `.slice(0, 100)` 임시방편.

**이연 (다음 라운드 · Kyu 결정 대기)**:
- 파라미터화 (V-6 · X 순연).
- Kyu 09-02 실기 후속 (D 라운드 실기 검증 결과).

**이연 (G+6+)**: Finalize · Payslip · Work Rotation 편성 · flag 제거 · 마이그 배포 검증.

---

## [요약]

- **D-1** (뿌리·최우선): 조퇴 유예 0 → 10 (지각 유예 대칭 · FERYAN 해소) · 초 정밀도 도입 (17:00:01 → ot 1 · Puji 8분) · baseline_label 기산 시각 명시. 경계 8 회귀 통과.
- **D-2**: `status_tags: SessionStatus[]` 신설 · 우선순위 sort 유지 · Amel 지각+야근 동시 표기.
- **D-3**: POST /pcon/override 도 W-7 대칭 try/catch · 오류 유형별 명시 응답 (CHK/FK/NOT NULL/relation) · 500 → BadRequest 재발화. 서버 로그에 payload 노출.
- **D-4**: STEP #4 pagination 편입 (data_cleanup 대칭 · RAW_PAGE_SIZE=50).
- **회귀**: TS 0 · Jest 57 · Vitest 344 · Lint 회귀 없음.
- **커밋**: todoboss `0669e30` · 브랜치 `feat/payroll-p3-e-df-h` (PR #20 base) · relay `t0/T0-0902-D-report.md`.
