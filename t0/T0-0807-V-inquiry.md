# T0-0807-V · 심문 · V-6 판정 파라미터화 설계 (Kyu 결정 게이트 · 구현 금지)

> **Kyu 정본 방향**: 개별 예외 (OverrideModal) 와 일괄 기준 (파라미터) 을 분리 · 파라미터 편집은 정책 버전 저장 + 판정 재작업 캐스케이드 재사용.

---

## §V-6.① 파라미터 전수 (T-1 인벤토리 확장 + 신설)

### 기존 (T-1 · 이미 정본)

| 파라미터 | 위치 | 현행 소스 | 스코프 |
|---|---|---|---|
| casher_shift1.startMin/endMin | `shift-baseline.ts:SHIFT_TIMES` | 하드코딩 (Kyu 07-29) 08:00~17:00 | 전 매장 |
| casher_shift2.startMin/endMin | 동상 | 13:00~22:00 | 전 매장 |
| non_casher.startMin/endMin | 동상 | 07:30~16:30 | 전 매장 |
| overtime_grace_minutes | `payroll_policy.overtime_grace_minutes` | 매장 정책 (default 30) | 매장별 |
| late_grace_minutes | 동상 | default 10 | 매장별 |
| resolveShiftBaseline · work_type 판별 | `shift-baseline.ts:resolveShiftBaseline` | 하드코딩 (SHIFT/FIXED/ON_DEMAND) | 전 매장 |

### 신설 (V-6 · RAW 이상 기준)

| 신 파라미터 | 판정 상태 확장 | 트리거 조건 | 기본값 (제안) |
|---|---|---|---|
| **raw_missing_check_in** | 새 상태 `input_missing_in` | check_in=null · check_out 있음 | 활성 (경고 · unknown 승격) |
| **raw_missing_check_out** | `input_missing_out` | check_out=null · check_in 있음 | 활성 (기존 orphan_kind='missing_pulang') |
| **raw_duplicate_pair** | `input_duplicate_pair` | 동일 (pos_name, date) 다중 · earliest/latest 병합 후 잔여 | 활성 (기존 MULTI_PUNCH warning) |
| **raw_invalid_time** | `input_invalid` | parseTime 파싱 실패 | 활성 (skip → warning) |
| **raw_early_leave_min** | `early_leave` | check_out < shift.endMin - N | 옵션 (default 30분 이상 조퇴) |

**정본**: 이 파라미터들은 judgement 마이너의 판정 상태 세트에 편입. `SessionStatus` 확장:
```ts
type SessionStatus =
  | 'normal' | 'late' | 'ot' | 'unknown'
  | 'input_missing_in' | 'input_missing_out'
  | 'input_duplicate_pair' | 'input_invalid'
  | 'early_leave';
```

---

## §V-6.② payroll_policy 정식 스키마 확장

### 현행 (backend/src/todoboss/payroll/policy/payroll-policy.entity.ts)

- `overtime_grace_minutes` (default 30)
- `late_grace_minutes` (default 10)

### 확장 제안

```typescript
// tb_payroll_policy 확장 (마이그 신설 · 컬럼 추가 or 신 테이블 tb_payroll_judgement_policy).

// 옵션 A: 기존 확장 (컬럼 추가 · nullable + default).
overtime_grace_minutes: int (default 30) // 기존.
late_grace_minutes: int (default 10)     // 기존.
// 신설:
casher_shift1_start_min: int (default 480)   // 08:00.
casher_shift1_end_min: int (default 1020)    // 17:00.
casher_shift2_start_min: int (default 780)   // 13:00.
casher_shift2_end_min: int (default 1320)    // 22:00.
non_casher_start_min: int (default 450)      // 07:30.
non_casher_end_min: int (default 990)        // 16:30.
raw_missing_in_active: bool (default true)
raw_missing_out_active: bool (default true)
raw_duplicate_pair_active: bool (default true)
raw_invalid_time_active: bool (default true)
early_leave_threshold_min: int (default 30, nullable = 옵션 미활성)

// 옵션 B (권고): 신 테이블 tb_payroll_judgement_policy · store_id + version.
//   버전 관리 필수 (§V-6.③ 시뮬레이션 · policy_change 감사).
//   기존 tb_payroll_policy 는 유지 (경제성 요율만).
```

**추천**: **옵션 B** (버전 관리 필수).

### 파라미터 관리 화면 (신설)

**경로**: `/payroll/judgement-policy` (신 페이지 · 관리자 전용).

**레이아웃**:
- **좌**: 현재 활성 정책 (`store_id` 별 · latest version).
  - 그룹 1 (근무조): casher_shift1 · casher_shift2 · non_casher (startMin/endMin).
  - 그룹 2 (Grace): overtime_grace · late_grace.
  - 그룹 3 (RAW 이상): raw_missing_in · out · duplicate · invalid · early_leave threshold.
- **우**: 정책 버전 히스토리 (append-only · 최신 top).
  - 각 버전 = 변경 필드 diff + 사유 + 시각 + actor.

**저장 흐름**:
1. 사용자 편집 → 프리뷰 (§V-6.③).
2. [일괄 적용] → 신 버전 INSERT (`tb_payroll_judgement_policy` · version+1 · reason 필수).
3. 감사: `pcon_log` type=`policy_change` emit + `tb_generic_audit` INSERT.
4. 판정 마이너 [재작업] pulse 자동 (기존 캐스케이드 재사용).

---

## §V-6.③ 시뮬레이션 프리뷰 (적용 전 판정 diff)

**목적**: 파라미터 변경 시 실 판정 결과 diff (지각 건수 · 야근 건수 · 비용 영향) 를 사전에 노출 → Kyu 검증 후 [일괄 적용].

**Backend**:
- `POST /api/admin/pcon/judgement-policy/simulate` · body `{store_id, scope_key, draft_policy}` → response `{diff: {before: {late_days, ot_minutes, ...}, after: {...}, delta: {...}}}`.
- 판정 로직 (`shift-baseline.judgeSession + applyOverrides`) 를 draft policy 로 실행 · 저장 없이 결과만 반환.

**Frontend (파라미터 관리 화면)**:
- 편집 → 자동 [프리뷰] (debounce 500ms).
- 결과 diff panel:
  - 지각: `N → M` (증가/감소 색).
  - 야근: `Xh → Yh`.
  - 비용 영향: `+₩ / -₩` (approx · OT 시급 × ot 시간).
- **[일괄 적용]** 버튼 (사유 필수) → 신 버전 저장.

---

## §V-6.④ 레코드 더블클릭 = 기여 파라미터 drill-down

**정본**: 판정 결과 row (정리본 · 판정 테이블) 더블클릭 → drill-down modal:
- 좌: 실측 (check_in="08:15:00" · check_out="17:35:00" · shift_baseline="casher_shift1").
- 우: 기준 (SHIFT_TIMES.casher_shift1 startMin=480 · endMin=1020 · late_grace=10 · ot_grace=30).
- 판정 산식:
  - `late_minutes = 495 (08:15) - 480 = 15` → `> 480 + 10 = 490` → `status='late'`.
  - `ot_minutes = 1055 (17:35) - (1020 + 30) = 5` → `status='ot'` (지각+야근 = ot 우선).
- 각 파라미터 옆 [편집] 링크 → 파라미터 관리 화면 (해당 필드 스크롤).

---

## §V-6.⑤ OverrideModal vs 파라미터 관계

| 축 | OverrideModal (개별 예외) | 파라미터 (일괄 기준) |
|---|---|---|
| 스코프 | 세션 1건 (pos_name·date) | 매장 전체 정책 |
| 저장 대상 | `pcon_override` (append-only) | `tb_payroll_judgement_policy` (버전) |
| 예시 | "이 세션 야근 부분 인정 15분" | "OT grace 를 30분 → 20분 변경" |
| 판정 영향 | 판정 마이너 실행 시 소비 (개별) | 판정 재실행 시 전체 적용 (일괄) |
| UX 진입 | 판정 row [⚠] 클릭 | 관리자 페이지 [정책 편집] |
| 사유 필수 | ✓ | ✓ |
| 감사 편입 | `type=override` | `type=policy_change` |

**화면 관계**:
- 판정 카드 상단 = **[정책 편집 →]** 링크 (파라미터 화면 진입).
- 판정 row hover = [⚠ 오버라이드 · 예외 처리].
- 감사 모달 = 두 유형 (override · policy_change) 모두 통합 타임라인 표시.

---

## §V-6.⑥ Kyu 질문 절 (결정 회부)

| ID | 질문 | 오케 권고 |
|---|---|---|
| Q-V-1 | 신 파라미터 저장 위치 = **옵션 A** (payroll_policy 확장) vs **옵션 B** (신 tb_payroll_judgement_policy 버전) | **B** (버전 필수 · 시뮬레이션 정합) |
| Q-V-2 | SessionStatus 확장 (`input_missing_in` · `input_missing_out` · `input_duplicate_pair` · `input_invalid` · `early_leave`) 채택? | 채택 (RAW 이상을 판정 상태로 승격) |
| Q-V-3 | early_leave threshold default = 30분 조퇴? | 재검토 (Kyu 관례 확인 필요) |
| Q-V-4 | 파라미터 관리 화면 경로 = `/payroll/judgement-policy`? or 신 root `/pcon/policy`? | `/payroll/judgement-policy` (payroll 종속 유지) |
| Q-V-5 | 시뮬레이션 프리뷰 자동 실행 (debounce) vs 명시적 [프리뷰] 버튼? | 자동 (500ms) · 편집 즉시 diff |
| Q-V-6 | [일괄 적용] 시 판정 [재작업] = 자동 트리거 vs 사용자 명시 클릭? | **사용자 명시** (기존 캐스케이드 정합) |
| Q-V-7 | drill-down modal = 판정 row 더블클릭 vs 우측 [상세] 버튼? | 더블클릭 (Kyu 정본) |
| Q-V-8 | 파라미터 변경 이력 감사 = pcon_log 통합 vs 별도 policy_history 테이블? | pcon_log + tb_generic_audit 재사용 (append-only 정합) |

---

## §V-6.⑦ 이연 (Kyu 결정 후 W 라운드 착수 · 심문 시)

- **W-1** payroll_judgement_policy 마이그 (Q-V-1 승인 후 옵션 확정).
- **W-2** shift-baseline.ts 확장 · SHIFT_TIMES 하드코딩 → policy 조회.
- **W-3** SessionStatus 확장 (Q-V-2).
- **W-4** POST /judgement-policy/simulate endpoint.
- **W-5** 파라미터 관리 화면 (신 페이지).
- **W-6** drill-down modal · 시뮬레이션 프리뷰.
- **W-7** 자동 테스트 (판정 diff unit · 화면 smoke).

---

## [요약]

- **§V-6.①** 파라미터 전수 = T-1 기존 6종 + 신설 5종 (RAW 이상 판정 상태 승격).
- **§V-6.②** payroll_policy 스키마 확장 (**옵션 B 권고** · tb_payroll_judgement_policy · 버전 관리).
- **§V-6.③** 시뮬레이션 프리뷰 = 저장 없이 diff 반환 · debounce 자동.
- **§V-6.④** drill-down modal = 판정 row 더블클릭 · 실측 vs 기준.
- **§V-6.⑤** OverrideModal (개별) vs 파라미터 (일괄) 관계 표.
- **§V-6.⑥** Kyu 질문 8개 (Q-V-1~8).
- **구현**: 0 (설계 · 심문 · 판정 대기).
- **커밋**: T0-0807-V-inquiry (본 relay 커밋 SHA).
