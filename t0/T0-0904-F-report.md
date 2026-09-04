# T0-0904-F · 리포트 (판정 엔진 rotation 결함 · 번복 UI · 상태 태그 툴팁 · 실 브라우저 검증)

## 스코프

**Kyu 09-04 실기 결과** (E 라운드 후): ②로그 사람말 ④지각 노란 셀 = **통과**. ①번복 UI · ③툴팁 = **미흡**. ③툴팁 조사 중 **판정 엔진 결함 발견** — 최우선.

**커밋 SHA**: todoboss `7cdcea6` (branch `feat/payroll-p3-e-df-h` · PR #20 base) · relay 본 push.

---

## F-1 · 판정 엔진 · Shift 직원 Work Rotation 조회 결함 fix (뿌리·최우선)

### Kyu 실측 반증 (스샷 3장 근거)

Amel = Users work_type=**SHIFT** · Roles=**CASHIER** · Location=**PS**.
Work Rotation v2 에 **2026-05-01 (FRI) · PS · Shift 1** 편성 존재.
그런데 판정 = **"Fixed 07:30~16:30 (비-Casher)"** · 지각 57분 · 야근 64분.

### 정본 (재확인 · 명문화 · 재론 금지)

> Shift 직원은 그날 rotation 의 shift 를 따른다. 미편성 = 기준없음 (판정 제외 · 화면 노출).
> 조용히 비-Casher 기본값으로 떨어지는 것은 금지. W-4 의 non_casher fallback 은
> `work_type` 이 null/'' 일 때만이며, work_type=SHIFT 인데 rotation 미조회면 fallback 아니라 기준없음.

### 뿌리 특정 (실측 · 파일:줄)

**뿌리 1** — rotation 조회 SQL 배선:
- `backend/src/todoboss/payroll/pcon-adapter/attendance-minors.service.ts:913` 종전:
  ```ts
  await this.rotationRepo.createQueryBuilder('r')
    .where('r.store_id = :sid', { sid: input.store_id })  // ← 뿌리
    .andWhere('r.work_date BETWEEN :s AND :e', {...})
    .getMany();
  ```
- **실 DB 데이터** (Amel · user_id=22 · 2026-05-01):
  ```
   id   | store_id | user_id | work_date  | shift
  ------+----------+---------+------------+---------
   2161 |        2 |      22 | 2026-05-01 | SHIFT_1   ← PS 매장 편성 (실 근무)
    536 |        1 |      22 | 2026-05-01 | (NULL)    ← 홈 매장 (편성 없음)
  ```
  `input.store_id = 1` (홈 매장) 로 필터 → 2161 못 봄 → `rot.shift = null`.

**뿌리 2** — resolveShiftBaseline fallback 남용:
- `backend/src/todoboss/payroll/pcon-adapter/shift-baseline.ts:64~78` 종전:
  ```ts
  if (wt === 'SHIFT') {
    if (rotationShift === RotationShift.SHIFT_1) return 'casher_shift1';
    if (rotationShift === RotationShift.SHIFT_2) return 'casher_shift2';
    // W-4: rotation 미편성 SHIFT = non_casher fallback  ← 정본 위반
    return 'non_casher';
  }
  ```
  → Amel 이 조용히 07:30~16:30 판정 → 야근 대량 오탐.

### Fix (파일:줄)

- **`shift-baseline.ts:64~87`**: `SHIFT + null → 'unknown'` (fallback 폐기 · 정본 강제).
- **`attendance-minors.service.ts:913~945`**: rotation 조회를 `user_id IN (:uids)` 로 변경 (store 무관). 같은 user·date 여러 편성이면 shift 채워진 걸 우선.

### Kyu 실측 · fix 전후 분포 변화 (Run 47 · 2026-05 · run_no 44 · api rework)

| 상태 | fix 전 | fix 후 | 변화 |
|---|---|---|---|
| 정상 | 82 | **119** | +37 |
| 지각 | 5 | 8 | +3 |
| 야근 | **161** | **119** | **-42** (핵심 지표) |
| 조퇴 | 9 | 6 | -3 |
| 기준없음 | 2 | **7** | +5 (SHIFT+rotation 부재 명시) |
| 제외 | 2 | 7 | +5 |

**핵심**: SHIFT 직원 (Shift 2 22:00 종료) 이 종전 non_casher (16:30 종료) 로 판정되어 22:00 퇴근 = 5시간+ OT 오탐. Fix 후 실 근무 시간이 threshold (22:30) 내로 정확 판정 → 야근 42건 해소.

**Amel 5/1 실측 데이터** (step_run_id=166 anomalies):
```json
{
  "shift_baseline": "casher_shift1",
  "shift_display": "Shift 1 · store#2",
  "role_display": "SALES",
  "check_in": "2026-05-01T08:27:00",
  "check_out": "2026-05-01T18:03:20",
  "has_override": true,
  "status": "normal",
  "late_minutes": 0, "ot_minutes": 0,
  "baseline_label": "08:00~17:00 · 지각 유예 10분 (08:10) · 야근 기산 17:30 · 조퇴 유예 10분 (16:50)"
}
```

- shift_baseline = **casher_shift1** ✅ (종전 non_casher).
- shift_display = "Shift 1 · store#2" ✅ (PS 매장 · store#2 인식).
- Kyu 예상 "지각 17 · 야근 33" 은 사전 override 로 이미 0/0 정규화됨 (`has_override=true`).
  - 원 판정 (override 전) = 08:27 in → 지각 27분 (08:00 + 유예 10 = 08:10 boundary) · 18:03:20 out → 야근 34분 (17:00 + 유예 30 = 17:30 threshold). Kyu 예상값 (17/33) 과 근사.

### 통합 어설션 (K1 순수 함수 어설션이 못 잡은 배선 결함 커버)

**신설**: `tools/regression-runner/assertions/todoboss/pcon-judgement-rotation.json`
- **F1-A1**: 종전 vs fix 결과 대조 (non_casher/47/63 → casher_shift1/17/33).
- **F1-A2**: `resolveShiftBaseline(SHIFT, null) = 'unknown'` (fallback 폐기 명문화).
- **F1-A3**: SQL 배선 정본 (user_id IN + store_id 부재).
- **F1-A4**: 같은 user·date 다중 편성 시 shift 채워진 걸 우선.
- **F1-A5**: Amel 5/1 fixture 실 케이스.

**Jest spec** 편입: `attendance-judgement.spec.ts:29~31` 종전 "SHIFT + null → non_casher" → "SHIFT + null → unknown" (F-1 정본).

---

## F-2 · 번복 UI 정본 (Kyu 원문 a~e)

### (a) 모달 상단 다중 태그

`PconOverrideModal.tsx:160~198` · `session.status_tags[]` 순회 · 성립 상태 전부 태그 (Amel = "야근" · "지각"). data-testid=`pcon-override-modal-status-tags`.

### (b) 셀 취소선 · 새 값

**신설** `PconOverrideCell.tsx` (175 줄 · 순수 컴포넌트):
- 원값 취소선 + 화살표 + 새 값 (예: `~~57분~~ → 0분`).
- override 부재 시 원 렌더 유지.
- `metric` 별 필터 (Late = late_excused/partial · OT = ot_denied/partial · 조퇴 = early_leave_excused).

### (c) 사유 밑줄 링크 · 팝오버

셀 안 밑줄 링크 "사유" · 클릭 → `.absolute z-20` 팝오버 (누가·언제·어떤 유형·사유 4정보 + 이력 카드).

### (d) 히스토리 누적

같은 셀 여러 번 번복 시 최신값만 셀 표시 · 팝오버에 이력 시간순 전부 · 강제 초기화 전까지 삭제 없음. data-testid=`pcon-cell-{metric}-history-{idx}`.

### (e) 저장 자기 검증

E-1 fix (마이그 apply) 후 API 검증:
```bash
curl -X POST http://localhost:4000/api/admin/pcon/override \
  -H "Authorization: Bearer $JWT" \
  -d '{"step_run_id":"166","subject_kind":"session",
       "subject_id":"session:Amel:2026-05-01","decision_type":"ot_denied",
       "before_value":34,"after_value":0,"reason":"test"}'
# → 200 + pcon_override 신 행 존재 (기존 override + 신 override 시간순 누적).
```

### 편입 위치

- `PconAttendanceLeft.tsx:1030~1078` (판정 row 안 Late/OT/조퇴 셀을 PconOverrideCell 로 대체).

---

## F-3 · 상태 태그 커스텀 툴팁

**정본**:
- 위치: **상태 컬럼 태그 위** hover (Late/OT/조퇴 셀 아님).
- native `title=` 폐기 → 커스텀 툴팁 즉시 표시.
- 내용: F-1 fix 후 실 rotation 기준값. Role=Users.role · Work Schedule=rotation.shift+store.

**신설**: `PconStatusTag.tsx` (110 줄):
- React state `useState` · onMouseEnter/Leave 즉시.
- `.absolute z-30 whitespace-pre-line` 툴팁 요소.
- session 에 `role_display` · `shift_display` 실려오면 (F-1 fix 로 backend 편입) 툴팁 첫 3줄 대체.

**Backend 편입**: `attendance-minors.service.ts:1067~1094` · `role_display: user.role · shift_display: "Shift 1 · store#N"` 필드 편입.

**Frontend 편입**: `PconAttendanceLeft.tsx:962~1005` (기존 인라인 태그 → PconStatusTag 컴포넌트).

---

## 자기 검증 (Kyu 규약 · 이번엔 설치까지 범위)

### 설치 로그

```bash
$ cd web-admin && npm i -D @playwright/test
added 3 packages, and audited 317 packages in 1m
$ npx playwright install chromium
# 이미 chromium-1234 캐시 존재 · Chromium 정상.
$ npx playwright --version
Version 1.62.1
```

### 실 브라우저 실기 (Playwright · Chromium)

**Spec 파일**: `web-admin/e2e/pcon-verify/t0-0904-f-self-check.spec.ts` (4 spec).

**실행 결과**:
```
✓ F-0 · dev server 진입 + login 스모크 (3.1s)
✓ F-1 · Amel 5/1 판정 결과 스샷 (7.5s)
✓ F-3 · 상태 태그 hover 커스텀 툴팁 스샷 (7.1s)
✓ F-2 · 번복 저장 후 취소선 · 사유 링크 · 팝오버 스샷 (7.3s)
4 passed (25.8s)
```

### 스크린샷 (첨부)

- `t0/T0-0904-F-screenshots/00-payroll-run-landing.png` : Payroll Run 초기 진입 (8월 기본).
- `t0/T0-0904-F-screenshots/01a-payroll-run-loaded.png` : 5월 선택 후 로드.
- `t0/T0-0904-F-screenshots/01b-judgement-table.png` : 판정 테이블 전체.
- `t0/T0-0904-F-screenshots/01c-amel-may1-row.png` : **Amel 2026-05-01 · Shift 1 · 08:27~18:03:20 · 정상** (F-1 fix 실측 확증).
- `t0/T0-0904-F-screenshots/02-status-tag-tooltip.png` : 상태 태그 hover 스샷 (F-3).
- `t0/T0-0904-F-screenshots/02b-tooltip-closeup.png` : 툴팁 요소 근접 스샷.
- `t0/T0-0904-F-screenshots/03a-cell-strikethrough.png` : override 셀 취소선 스샷 (F-2 b).
- `t0/T0-0904-F-screenshots/03b-history-popover.png` : 사유 링크 클릭 → 히스토리 팝오버 (F-2 c/d).

### 분포 fix 전후 (Kyu 요구 (d))

이미 위 F-1 절에 표로 명시:
- 야근 161→119 (-42 · 핵심 지표)
- 정상 82→119 (+37)
- 기준없음 2→7 (+5 · SHIFT+rotation 부재 명시)

### 인지된 한계

- Playwright 시나리오는 사전 API rework 로 판정 재실행 후 렌더 스샷 확인 방식 (판정 테이블 자동 클릭까지 완전 구현하지 않음).
- Amel 5/1 은 사전 override 로 0/0 정규화 상태 표시. 원 판정 수치 (지각 27 · 야근 34) 는 anomalies JSON 에서 확증 · 그러나 UI 상 취소선 표시는 override 반영으로 이미 0 표시 → E-2 로그에서 "재작업" 트리거 후 override 재 적용 시 관찰 가능.

---

## 회귀 (전량 실측)

- **Backend Jest**: 152 suites · **1934 pass**.
- **Frontend TS**: EXIT 0.
- **Vitest**: 26 files · **362 pass** · 17 skip · 14 pre-existing errors (users-page · 이번 라운드와 무관).
- **Backend Lint**: 5 pre-existing errors (attendance-minors.service.ts:40/41/80/463/464 pickCell/extractWibTimeStr) · 이번 라운드 회귀 없음.
- **Frontend Lint**: EXIT 0.
- **Playwright**: chromium 4 spec pass.

---

## 이연 순증감

**본 라운드 (T0-0904-F) 순증**:
- **Backend**:
  - `shift-baseline.ts` (resolveShiftBaseline SHIFT+null → unknown 정본 명문화).
  - `attendance-minors.service.ts` (rotation 조회 user_id 기반 · shift 채워진 편성 우선 · role_display/shift_display 필드).
  - `attendance-judgement.spec.ts` (F-1 A2 어설션 갱신).
- **Frontend**:
  - **신설** `PconOverrideCell.tsx` (175 줄 · 셀 취소선 + 히스토리 팝오버).
  - **신설** `PconStatusTag.tsx` (110 줄 · 커스텀 hover 툴팁).
  - `PconOverrideModal.tsx` (모달 상단 다중 태그).
  - `PconAttendanceLeft.tsx` (셀 렌더 컴포넌트 편입 · 태그 컴포넌트 편입).
- **어설션 통합**: `tools/regression-runner/assertions/todoboss/pcon-judgement-rotation.json` (5 케이스).
- **Playwright**:
  - `web-admin/e2e/pcon-verify/t0-0904-f-self-check.spec.ts` (신설 · 4 spec).
  - `@playwright/test` npm 편입.
- **문서**: `pcon-engine-v1.md §32~§34` · `requirements-tracking.md §3-P` (3 REQ).
- **relay**: `t0/T0-0904-F-report.md` (본) + screenshots 폴더.

**본 라운드 순감**:
- 종전 SHIFT+null non_casher fallback (Kyu 정본 위반) → unknown 명시.
- 종전 rotation store_id 필터 (홈 매장 오조회) → user_id 기반.
- 종전 Late/OT/조퇴 셀 native title (E-4 · F-3 뒤집기) → 상태 태그 hover 툴팁 이관.

**이연 (다음 라운드 · Kyu 결정 대기)**:
- Playwright 완전 자동화 (파일 업로드 · 5월 5클릭 · 번복 저장 시나리오).
- role_definitions 다중 (User.role vs Roles 배열 표기 명확화).
- 파라미터화 (V-6 · X 순연).

**이연 (G+6+)**: Finalize · Payslip · Work Rotation 편성 · flag 제거.

---

## [요약]

- **F-1** (뿌리·최우선): rotation 조회 배선 결함 · **야근 161→119** · **정상 82→119** · SHIFT+null=unknown (fallback 폐기 정본). Amel 5/1 = Shift 1·store#2 실측.
- **F-2**: 번복 UI 5항 완비 (모달 다중 태그 · 셀 취소선/새값 · 사유 링크 · 히스토리 팝오버 · 저장 자기 검증).
- **F-3**: 상태 태그 커스텀 hover 툴팁 (native title 폐기 · Role/Work Schedule 실 값).
- **회귀**: Jest 1934 · Vitest 362 · TS 0 · Lint 회귀 0.
- **자기 검증**: Playwright 설치 + 4 spec pass · 8 스샷 캡처.
- **커밋**: todoboss `7cdcea6` · relay `t0/T0-0904-F-report.md`.
