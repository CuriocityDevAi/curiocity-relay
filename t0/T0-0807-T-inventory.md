# T0-0807-T · 인벤토리 (T-1/T-2/T-3 · 지각/야근 판정 · Kyu 결정 게이트)

> **Kyu 정본 (T 판정)**: 지각/야근 판정 = **G+6+ 이연이 아니라 신 화면 대체의 필수 조건**. R-7 오버라이드의 실 소비처. 본 라운드 = 조사·설계안·테스트 계획 · **구현 금지**.

---

## §T-1 · 구 화면 지각/야근 판정·예외처리 전수 인벤토리

### T-1.① 판정 로직 (근거 파일:줄)

| 항목 | 위치 | 상세 |
|---|---|---|
| **`ShiftBaselineKind` 타입** | `backend/src/todoboss/payroll/pos-import/pos-import.service.ts:143~147` | `'casher_shift1' | 'casher_shift2' | 'non_casher' | 'unknown'`. |
| **`SHIFT_TIMES` 상수** (Kyu 07-29 정본) | `pos-import.service.ts:150~157` | casher_shift1 = 08:00~17:00 · casher_shift2 = 13:00~22:00 · non_casher = 07:30~16:30. |
| **`OT_GRACE_MINUTES`** | `pos-import.service.ts:160` | `30` (야근 유예 · Kyu 정본). |
| **`resolveShiftBaseline(workType, rotationShift)`** | `pos-import.service.ts:179~196` | 1차 판별자 = `user.work_type` ('SHIFT'/'FIXED'/'ON_DEMAND'). SHIFT = rotation 편성 조회 · FIXED = 07:30~16:30 · ON_DEMAND = unknown. |
| **`classifySessionStatus(session)`** | `PayrollRunPage.tsx:3853~3870` | 세션의 shift_baseline + check_in/out → 'late'/'ot'/'normal'/'unknown' 판정. |
| **`toWibMinutes()`** | `pos-import.service.ts:107~110` | WIB 분 단위 파생. |
| **Work Rotation 소스** | `pos-import.service.ts:1230~1290` | `WorkRotation` entity 에서 (user_id, date) → SHIFT_1/SHIFT_2 조회. |
| **OT 계산** | `pos-import.service.ts:1255~1290` | `otThreshold = times.endMin + OT_GRACE`. `latest_out > threshold` 시 `ot_minutes = out - threshold`. |
| **Late 계산 (미배선 fallback)** | `pos-import.service.ts:1390~1392` | `late_minutes: 0` · `late_days: 0` · **backend 미시딩 시 UI fallback** (`row.late_days = 0`). |
| **지각 그레이스** | `docs/epics/payroll.md §4-3` | 정책 default = 10분 · SHIFT_START + grace 후 = 지각. |

### T-1.② OT & Late Adjust 탭 전 기능 (Kyu 지목)

| 기능 | 위치 (구 화면) | 상세 |
|---|---|---|
| **지각 분류 기록의 지각 예외 (면제) 처리** | `PayrollRunPage.tsx` OverrideDialog 소비 | `override_late_excused` 로그 emit (`console-v2/step-registry.ts:532`). |
| **야근 분류 기록의 야근 불인정 처리** | 동상 | `override_ot_denied` 로그. |
| **결정 셀 3상태 (일반·제안·확정)** | `web-admin/src/lib/run-ui/DecisionCell.tsx` | Q-REQ-4 · req-tracking:108 (P3-a 구현). |
| **사유 필수 흐름** | `PayrollRunPage.tsx:241~245 ReasonModal` | reason.trim() 미입력 시 error 표시 · 편집 차단. |
| **OverrideDialog** | `web-admin/src/pages/payroll/OverrideDialog.tsx:37~ (default export)` | 오버라이드 진입 modal · Dialog nonBlocking · draggable. |
| **AttendanceEditDialog** (편집과 override 진입 통합) | `web-admin/src/pages/payroll/AttendanceEditDialog.tsx:15~30` | `hasLateIssue/hasOtIssue/onRequestOverride` props (Kyu UX P2). |
| **오버라이드 저장 backend** | `backend/src/todoboss/payroll/attendance-edit/*.ts` + `WorkSessionOverride entity` | `tb_work_session_override` 테이블 (마이그 232 · append-only 트리거 `trg_work_session_override_no_delete`). |

### T-1.③ 판정·조정 결과의 집계 반영 경로

| 경로 | 위치 | 상세 |
|---|---|---|
| **`per_user_rows` 조립** | `pos-import.service.ts:1374~1400` | 사람별 1행 · `work_days` · `late_days` · `ot_minutes` · `status` (normal/has_anomaly). |
| **오버라이드 반영 (계산 layer)** | `overtime.service.ts` (`resolveOtRate`) · `attendance-edit.service.ts:242~260` | `override_ot_denied` 시 ot_minutes → 0 · `override_late_excused` 시 late_days -= 1. |
| **집계 총계 (AggregateTotals)** | `PayrollRunPage.tsx:2802~2900` | `rows.reduce()` 로 총 인원·근무·지각·야근 계산. |
| **차이 (계획-실행)** | `PayrollRunPage.tsx:3165~3242` | `planByUserId.get(user_id)` (Work Rotation 편성) vs `row.work_days`. |

### T-1 [이식/보류/폐기] 매트릭스

| 항목 | 신 이식 판단 | 오케 권고 | Kyu 질문 |
|---|---|---|---|
| SHIFT_TIMES 상수 | **이식** | 그대로 pcon-adapter 로 이관 · 상수 위치는 `attendance-minors.service.ts` or 신 `pcon-shift.ts`. | Q-T-1: 상수 위치 (marker 파일 신설 vs 서비스 내부)? |
| resolveShiftBaseline | **이식** | 로직 그대로 · 신 파일 예약. | |
| OT_GRACE_MINUTES = 30 | **이식** | 정책 시딩 없으면 default. | Q-T-2: 정책 (`payroll_policy`) 도 pcon 에 소비? or 하드코딩 유지? |
| late_grace_minutes (기본 10) | **이식** | 정책 시딩 소비. | Q-T-3: pcon 이 payroll_policy 를 직접 조회할지 (Q-T-2 와 연동). |
| classifySessionStatus | **이식** | 프론트/백엔드 어디? Kyu 판정: pcon 정본은 backend 에서 판정 · 프론트는 표기만. | Q-T-4: 백엔드 판정 위치 = 정리 마이너 vs 판정 마이너 (T-2 참조). |
| Work Rotation 조회 | **이식** | 신 pcon 마이너에서 조회 · shift_baseline 파생. | Q-T-5: rotation 조회 = pcon-adapter 안 (직접 repo) vs 별도 service? |
| OT 계산 (분) | **이식** | 정본 그대로. | |
| Late 계산 (분) | **이식** | 정본 그대로. | |
| override_ot_denied 로직 | **이식** (R-7 pcon_override 정합) | pcon_override + 판정 소비. 신 판정 로직에서 overrides 조회 후 적용. | Q-T-6: 오버라이드 실 소비 = 판정 마이너 안 or 별도 layer? |
| override_late_excused 로직 | **이식** | 동상. | |
| OverrideDialog UI | **이식 (부분)** | pcon 에는 R-7 오버라이드 배지 · 실 판정 진입 UI 필요 (신 편집 modal 확장 or 별도 OverrideModal). | Q-T-7: 오버라이드 진입 UI = 편집 modal 통합 vs 별도 신설? |
| WorkSessionOverride entity | **폐기** (pcon_override 대체) | pcon_override 로 대체 · 구 테이블은 flag off 잔존. | |
| DecisionCell (3상태 결정 셀) | **보류** (Kyu 결정) | Payroll 결정 셀 vs pcon 정본 어느 게 우선? | Q-T-8: 결정 셀 개념 pcon 재도입 여부? |

---

## §T-2 · 신 엔진 배선 설계안

### T-2.a 판정 위치: 두 후보 비교

**후보 (a): 정리 마이너 (`data_cleanup`) 내 병합**
- 장점:
  - 마이너 개수 유지 (4 → 4).
  - sessions 파싱 후 판정까지 한 번에 → 단순.
  - `cleanup_summary.sessions[]` 확장 = `{..., shift_baseline, ot_minutes, late_minutes, status}`.
- 단점:
  - 정리 마이너 책임 비대 (파싱 + 페어링 + 판정 3 역할).
  - 재작업 캐스케이드 시 판정만 재실행 불가 · 정리 전체 재실행.
  - 오버라이드 적용 시점 = 정리 실행 시점 (실시간 반영 위해 재실행 필요).

**후보 (b): 별도 판정 마이너 신설 (`judgement`)**
- 장점:
  - 단일 책임 (판정만).
  - 오버라이드 재적용 = 판정 마이너 [재작업] 만.
  - 계보 (`input_ref`) 명확: judgement → data_cleanup attempt.
  - **하위 aggregate 만 STALE → 재작업**.
- 단점:
  - 마이너 개수 증가 (4 → 5).
  - 화면 배치 재조정 (Rail 5카드 · Left 5스택).
  - MINOR_ORDER 확장 · pcon_step_def seed 추가.

**오케 권고**: **후보 (b) 채택**. 근거:
- Kyu 정본 §1.5 (선언 계약): 단일 책임 분리.
- 오버라이드 재적용 UX = 판정 [재작업] 만 · 정리는 안 건드림 (사용자 부담 최소).
- 계보 정합 · 캐스케이드 파생 정확 (§10 스택 보존과 정합).

**Kyu 질문 Q-T-9**: 후보 (a) vs (b) 판정. (오케 권고 = b · 승인 시 U 라운드 착수).

### T-2.b pcon_override 소비 연결 설계

**판정 마이너 (`judgement`) 실행 흐름**:
1. Input: `data_cleanup` sessions + shift_baseline lookup.
2. Overrides load: `getPconOverrides(run_id)` → `PconOverride[]`.
3. session 별 판정:
   - baseline SHIFT_TIMES 적용 → 초기 `status` (normal/late/ot/unknown).
   - overrides.filter(o => o.subject_kind='session' && o.subject_id === `session:{pos_name}:{date}`):
     - `decision_type='ot_denied'` → `ot_minutes = 0` · status normal.
     - `decision_type='ot_partial'` → `ot_minutes = after_value` (부분 인정).
     - `decision_type='late_excused'` → `late_minutes = 0` · late_days 미증가.
     - `decision_type='late_partial'` → `late_minutes = after_value`.
4. 결과 = `judgement_summary.sessions[]` (판정된 sessions · overrides 반영).
5. aggregate 마이너 = `judgement_summary` 소비 (`data_cleanup` 대신).

### T-2.c shift_baseline · Work Rotation DB 실측

**실측 (`backend/src/todoboss/payroll/pos-import/pos-import.service.ts`)**:
- `WorkRotation` entity 이미 존재 · store_id/user_id/date/shift 필드.
- `resolveShiftBaseline` 로직 재사용 가능.
- pcon-adapter attendance-minors.service 에 `WorkRotationRepo` 주입 필요.

**공유 로직 위치 후보**:
- `backend/src/todoboss/payroll/pcon-adapter/shift-baseline.ts` (신설 · pos-import 정본 이식).
- 원본 (`pos-import.service.ts:150~196`) 은 유지 (flag off 잔존).

### T-2 파일 예약 (U 라운드 착수 시)

| 파일 | 신설/수정 | 내용 |
|---|---|---|
| `backend/src/database/migrations/1700000000267-SeedPconJudgementStep.ts` | 신설 | pcon_step_def seed · path='attendance_import.judgement' · seq=4 · aggregate seq=5. |
| `backend/src/todoboss/payroll/pcon-adapter/shift-baseline.ts` | 신설 | pos-import 이식 · SHIFT_TIMES · OT_GRACE_MINUTES · resolveShiftBaseline. |
| `backend/src/todoboss/payroll/pcon-adapter/attendance-minors.service.ts` | 수정 | `executeJudgement()` 신설 · overrides load + 판정 적용. `executeAggregate()` 는 judgement_summary 소비. |
| `backend/src/todoboss/payroll/pcon-adapter/attendance-minors.controller.ts` | 수정 | POST `/api/admin/pcon/attendance/judgement` endpoint. |
| `backend/src/todoboss/payroll/pcon-adapter/pcon-adapter.module.ts` | 수정 | `WorkRotation` entity forFeature 편입. |
| `web-admin/src/api/pcon-engine.ts` | 수정 | `runJudgementPcon` · `runJudgementPconRework`. |
| `web-admin/src/pages/payroll/pcon-view/PconAttendanceContext.tsx` | 수정 | PATH.judgement 추가 · MINOR_ORDER 확장 · executeMinor 분기. |
| `web-admin/src/pages/payroll/pcon-view/PconAttendanceRail.tsx` | 수정 | minorList 5개로 확장. |
| `web-admin/src/pages/payroll/pcon-view/PconAttendanceLeft.tsx` | 수정 | 판정 결과 카드 신설 · aggregate 데이터 소스 변경. |

---

## §T-3 · 파리티 자동 테스트 계획

### T-3.a 판정 unit (backend jest)

**신설**: `backend/src/todoboss/payroll/pcon-adapter/attendance-judgement.spec.ts`
- **테스트 1**: `resolveShiftBaseline('SHIFT', RotationShift.SHIFT_1)` → `'casher_shift1'`.
- **테스트 2**: `resolveShiftBaseline('FIXED', null)` → `'non_casher'`.
- **테스트 3**: `resolveShiftBaseline('ON_DEMAND', null)` → `'unknown'`.
- **테스트 4**: 판정 순수 함수 `judgeSession({shift_baseline, check_in, check_out})`:
  - Casher shift1 · check_in="08:12:00" → status='normal' (grace 10 이내).
  - Casher shift1 · check_in="08:15:00" → status='late' · late_minutes=15-10=5.
  - Casher shift1 · check_out="17:35:00" → status='ot' · ot_minutes=35-30=5.
- **테스트 5**: overrides 적용 후 재판정:
  - override `{decision_type:'ot_denied'}` → ot_minutes=0.
  - override `{decision_type:'late_excused'}` → late_minutes=0.
  - override `{decision_type:'ot_partial', after_value:15}` → ot_minutes=15.

### T-3.b 오버라이드 반영 unit (backend jest)

**신설**: `backend/src/shared/pcon-engine/pcon-override.spec.ts`
- POST `/pcon/override` reason 빈 값 → 400.
- POST · UPDATE 시도 → trigger raise exception.
- POST · DELETE 시도 → trigger raise exception.
- listOverridesForRun → 정렬 asc.

### T-3.c 신 판정 마이너 mount smoke (frontend vitest)

**신설**: `web-admin/src/pages/payroll/pcon-view/__tests__/PconJudgement.smoke.test.tsx`
- 5 마이너 카드 렌더 확증.
- judgement 카드 breadcrumb 순서 = 4번째.
- aggregate 카드 breadcrumb 순서 = 5번째.
- MINOR_ORDER hasEditsUpstream 정합 (편집 → judgement STALE → aggregate STALE).

### T-3.d 회귀 감사 절차 (Q-4 정합)

- U 라운드 리포트에 `[테스트 추가]` 절 신설.
- 신설 spec 파일 · assert 개수 명기.
- 재회귀 시 즉시 test-first fix.

---

## §T · Kyu 질문 절 (self-contained · 결정 회부)

| ID | 질문 | 오케 권고 | 스코프 |
|---|---|---|---|
| Q-T-1 | SHIFT_TIMES 상수 위치 = 신 파일 `shift-baseline.ts` vs 서비스 내부 인라인? | 신 파일 (재사용 · 테스트 접근성) | T-2 착수 |
| Q-T-2 | pcon 이 `payroll_policy` (OT/Late grace) 직접 조회? or 하드코딩 유지 (30/10 분)? | 조회 (정본 일관 · policy 시딩 준수) · 미시딩 시 fallback default | T-2 |
| Q-T-3 | Late grace default (10분) 값 확정? | 유지 (구 화면 관례) | T-2 |
| Q-T-4 | 판정 위치 = 백엔드 (마이너 실행 시) vs 프론트 (렌더 시 파생)? | **백엔드** (append-only · 사후 검증) | **최우선** |
| Q-T-5 | Work Rotation 조회 = pcon-adapter 직접 vs 신 shared service? | pcon-adapter 직접 (파일 minimize · pos-import 로직 이식) | T-2 |
| Q-T-6 | 오버라이드 실 소비 = 판정 마이너 안 vs 별도 layer? | 판정 마이너 안 (단일 소비처 · Q-T-9 (b) 정합) | T-2 |
| Q-T-7 | 오버라이드 진입 UI = 편집 modal 통합 vs 별도 OverrideModal? | 별도 (편집/판정 개념 분리 · R-7 정본) | T-2 |
| Q-T-8 | DecisionCell (Payroll 3상태 결정 셀) pcon 재도입 여부? | 보류 (pcon 정본 = 편집 + 오버라이드로 충분) | 재판정 |
| **Q-T-9** | **판정 위치 = 정리 마이너 내 (a) vs 별도 판정 마이너 (b)?** | **(b) 별도 판정 마이너 신설 (근거: 단일 책임 · 캐스케이드 정확 · 재작업 UX)** | **최우선 결정** |
| Q-T-10 | 판정 마이너 이름 = `judgement` vs `attendance_import.judgement` vs 다른 이름? | `attendance_import.judgement` (기존 MAJOR 하위) | U 착수 |
| Q-T-11 | 판정 마이너 seq = 4 (기존 aggregate 를 5로 밀림)? | 4 (aggregate → 5) | U 착수 |

---

## §T · 이연 순증감

**본 라운드 조사 순증**:
- relay `t0/T0-0807-T-inventory.md` (본 문서 · Kyu 결정 게이트).
- 코드 = 0 (조사 항목 · 구현 금지 준수).

**Kyu 결정 후 U 라운드 착수 대상**:
- Q-T-9 승인 시: 판정 마이너 신설 (§T-2.c 파일 예약 8개).
- Q-T-1~T-11 판정 반영.
- §T-3 자동 테스트 병기.

**G+6+ 이연 유지**:
- flag 제거 · 구 pos-import 삭제.

---

## [요약]

- **T-1** 완료: 구 화면 지각/야근 판정·예외처리 전수 매트릭스 (파일:줄) · 이식/보류/폐기 · 오케 권고.
- **T-2** 완료: 신 엔진 배선 설계안 · 판정 위치 (a) vs (b) 비교 · **(b) 권고** · pcon_override 소비 · 파일 예약 8개.
- **T-3** 완료: 파리티 자동 테스트 계획 (판정 unit · 오버라이드 반영 unit · smoke).
- **Kyu 질문**: 11개 (Q-T-1~Q-T-11 · **Q-T-9 최우선**).
- **구현**: 0 (조사 라운드 · 구현 금지 준수).
- **커밋**: T0-0807-T-inventory (본 relay 커밋 SHA).
