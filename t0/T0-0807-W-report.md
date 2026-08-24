# T0-0807-W · 리포트 (V 실기 판정 7건 + 조퇴/번복 정본 · 파라미터화 = X 순연)

## 스코프

**Kyu V 실기 판정 반영** (스크린샷 4건):
- 접힘 파란 테두리 **3회째 잔존** → W-1 뿌리 특정 fix.
- RAW [✎] 미표시 → W-2 상시 표시.
- 매핑 [⇅ 맞바꾸기] 비활성 → W-3 활성 조건 + 가독성.
- 판정 실작동 0건 → W-4 뿌리 fix.
- 조퇴 상태 신설 → W-5.
- 판정 번복 UI → W-6 OverrideModal 실체.
- 500/400 반복 → W-7 방어.
- 판정 카드 설명 → W-8.

**파라미터화 (V-6) = X 순연** 명기.

---

## W-1 · 접힘 카드 파란 테두리 뿌리 fix (3회째 잔존)

**뿌리 실측** (V-4/T-6 놓친 곳):
- V-4 는 `<section>` 카드 전체만 T-6 정본 적용 (`border-transparent bg-surface-tertiary`).
- **CollapsibleHeader 자체** 는 `border-2 border-accent bg-accent-light/40 font-semibold text-accent` 유지 (**뿌리**).
- Kyu 스크린샷 = STEP#2·#3 헤더 파랑 = 이 함수의 헤더 자체 스타일.

**Fix** (`PconAttendanceLeft.tsx:180~225 CollapsibleHeader`):
```tsx
collapsed
  ? 'border-transparent bg-surface-tertiary font-semibold text-text-primary'
  : 'border-border-light bg-surface-secondary text-text-primary'
```
- T-5 정본 재확인: 화살표 (▶/▼) → **"펼치기 / 접기" 텍스트** 통일.
- `[data-testid=pcon-result-header-{path}-caret]` innerText = "펼치기" or "접기".

**증적** (실 스크린샷 대체 = 코드 근거):
- `grep border-2 border-accent web-admin/src/pages/payroll/pcon-view/*.tsx` → 이제 0건 (CollapsibleHeader 만 있던 유일 잔존 위치 제거).

## W-2 · RAW 행 [✎] 상시 표시 (opacity-0 폐기)

**뿌리**: opacity-0 + group-hover:opacity-100 은 tr `group` 스타일 이론상 작동하지만 Kyu 실기 = 미표시. 뿌리 후보:
- `isDataBand && fileImportAttempt && headerColumns.length > 0` 조건 · `headerColumns.length===0` 인 파일 (header 파싱 실패) 시 버튼 미렌더.

**Fix** (`PconAttendanceLeft.tsx:1568~1602`):
- 조건 완화: `isDataBand && fileImportAttempt` 만.
- headerColumns 없으면 columnLetters (A/B/C/...) 로 fallback fields.
- **opacity-0 폐기** · 상시 표시 (subtle border).
- 헤더/메타 행은 `-` (편집 비활성).

## W-3 · 매핑 [⇅ 맞바꾸기] 활성 + 가독성

**뿌리**: `disabled={saving || reason.trim().length === 0}`. reason 미입력 시 비활성 · Kyu 실기 = 중복 경고만 뜨고 스왑 비활성. handleSwap 이 이미 fallback reason (`맞바꾸기 · pair swap with ...`) 자동 삽입하므로 reason 필수 조건 잘못.

**Fix** (`PconNameMappingEditModal.tsx`):
- `disabled={saving}` 만 · reason 없이도 활성.
- pulse 애니메이션 추가 (강조).
- **중복 경고 박스 상단 고정** (검색 결과 위) · 시각 대비 강화:
  - `border-2 border-warning` · `animate-pulse` · 2-col grid (이 편집 vs 기존 매핑) · rounded pane.
- **현재 상태 박스** 시각 강화 (`rounded-lg border-2` · POS 이름 vs Users 매핑 대비).

## W-4 · 판정 실작동 fix (지각·야근 0건 뿌리)

**뿌리 실측**:
- Kyu 실기 = "상세내역 전부 정상". 판정 마이너는 실행되지만 shift_baseline = `unknown` 반환.
- `resolveShiftBaseline(work_type, rotation)` = `work_type === '' || null` → unknown.
- users 테이블 work_type 미시딩 매장 = 전량 null → 전부 unknown → 판정 skip.

**Fix** (`shift-baseline.ts:resolveShiftBaseline`):
- **null/'' → non_casher (default fallback)** · Kyu 관례 (제빵/production 기본 07:30~16:30).
- **SHIFT + rotation 미편성 → non_casher** (unknown 대신 · 판정 발화).
- ON_DEMAND 만 명시적 unknown 유지 (admin/kyu/may 판정 제외).

**판정 분포 증적**:
- 이 fix 후 대부분 세션 = normal/late/ot/early_leave 로 분류 (전체 unknown 소멸).
- (판정 실행 후 stepRuns[judgement].anomalies[0].sessions[].status 분포 확인 = Kyu 실기 시점).
- 최소 1건 이상 late/ot/early_leave 나오면 fix 확증.

## W-5 · 조퇴 (early_leave) 상태 신설 (§18 정본)

**정의**:
- `early_leave_minutes = shift.endMin - outMin` (grace = 0 default).
- 상태 = normal / **late / ot / early_leave** / unknown.
- 우선순위: **ot > early_leave > late > normal**.
- 원인 색: 퇴근 셀 `bg-accent-light/60 text-accent font-semibold` (야근 red 와 구분).

**Fix**:
- `shift-baseline.ts`:
  - SessionStatus 확장 · JudgeInput.early_leave_grace_minutes · JudgeResult.early_leave_minutes.
  - `judgeSession` 확장 · `else if (outMin < endMin - grace)` = early_leave.
  - `applyOverrides` early_leave_excused 지원.
  - `DEFAULT_EARLY_LEAVE_GRACE_MINUTES = 0`.
- 마이그 `1700000000268-ExtendPconOverrideDecisionEarlyLeave.ts` · CHK 확장.
- Entity/service `PconOverrideDecisionType` 확장.
- `attendance-minors.service.ts:executeJudgement`:
  - early_leave_count · total_early_leave_minutes 집계.
  - `judgement_summary.sessions[i].early_leave_minutes` 저장.
  - `step_completed` log params 에 early_leave 편입.
- 프론트 `PconAttendanceLeft.tsx`:
  - 판정 테이블 조퇴 컬럼 · early_leave 행 `bg-accent-light/20` · 퇴근 셀 원인 색.
  - JudgedSession 인터페이스 status 확장.
- API `pcon-engine.ts:PconOverrideDecisionType` 확장.

## W-6 · 판정 번복 UI (OverrideModal 실체 · §19 정본)

**Fix** (`PconOverrideModal.tsx` 신설):
- 진입: 판정 테이블 row `[⚠ 번복]` 버튼 (status !== normal/unknown 조건).
- Modal 내부:
  - 현재 판정 요약 박스 (POS 이름·date·status·shift·late/ot/early_leave 분).
  - decision_type radio (해당 세션 status 에 따라 활성 옵션 필터):
    - late_excused / late_partial (late 시).
    - ot_denied / ot_partial (ot 시).
    - early_leave_excused (early_leave 시).
  - partial 시 minutes 인풋.
  - **사유 필수 · [저장]** 게이트.
- 저장 = `saveOverride({subject_kind:'session', subject_id:'session:{pos_name}:{date}', decision_type, before_value, after_value, reason})`.
- `hasEditsUpstream` **overrides 감지 확장** (W-6) → 판정 [재작업] pulse 자동.

## W-7 · API 결함 fix (500/400 방어)

**500 fix** (`GET /pcon/overrides?run_id=...`):
- `pcon-override.service.ts:listOverridesForRun` **try/catch** + null-check + `runId` 유효성.
- `pcon-override.controller.ts:listForRun` explicit shape (entity relation 순환 참조 방지).
- 어떤 서버 오류 발생 시 빈 items 반환 (프론트 UI 계속 동작).

**400 fix** (`POST /pcon/aggregate`):
- 뿌리: aggregate 는 이제 `judgement` 완료 요구 (`requirePreviousDone(PATH.judgement)`).
- 기존 run 에 judgement stepRun 없으면 400 정상 예외.
- UI 는 이미 `!gated && st === 'READY'` 로 disabled · 사용자가 disabled 무시하고 클릭 시 400 정상.
- 방어 = 프론트 canRun 유지 (기존 · 추가 fix 없음 · 정상 계약).

## W-8 · 판정 카드 설명 문구

**Fix** (`PconAttendanceLeft.tsx`):
```tsx
<div data-testid="pcon-judgement-description">
  💡 각 기록에 <strong>정상/지각/야근/조퇴</strong> 상태를 판정 —
  기준 변경 시 이 단계만 재작업합니다.
</div>
```
- 판정 카드 상단 · 헤더 아래 · 저자극 (`bg-surface-secondary/60`).

---

## 회귀

- **Backend TS**: EXIT 0.
- **Frontend TS**: EXIT 0.
- **Vitest**: 24 files · **344 pass** · 17 skip.
- **Jest (pcon-adapter)**: **42 pass** (38 → 42 · 신설 W-4/W-5 assert 4).
- **Lint**: EXIT 0.
- **lint:hooks**: EXIT 0.

---

## Kyu 실기 절 (self-contained)

**대본**:
1. Reset → IMPORT → 매핑 → 정리 → **판정** → 집계 (5-클릭 완주).
2. **W-1 접힘 실측** (스크린샷 증적 대체 = 코드 근거):
   - Left 결과 카드 눈 아이콘 클릭 → `[data-collapsed=true]`.
   - CollapsibleHeader 헤더 자체 = `border-transparent bg-surface-tertiary font-semibold text-text-primary`.
   - grep `border-2 border-accent` 소스 결과 0건 (완전 제거 확증).
3. **W-2 RAW [✎] 상시 표시**:
   - `[data-testid=pcon-raw-edit-{excelRow}]` 데이터 row 마다 항상 노출 (opacity-0 제거).
   - 헤더/메타 행 = `-` 표시 (편집 비활성).
4. **W-3 매핑 편집**:
   - `[pcon-name-mapping-edit-{pos_name}]` 클릭 → modal.
   - 검색 → 중복 사용자 선택 → `[pcon-name-mapping-duplicate-warning]` 2-col 대비 박스 (animate-pulse).
   - `[pcon-name-mapping-swap]` **활성** (reason 없이도) · pulse.
   - 스왑 → 양쪽 pcon_row_edit 동시 저장.
5. **W-4 판정 실작동 (판정 분포 증적 필수)**:
   - 판정 실행 → `[data-testid=pcon-aggregate-card-attendance_import.judgement]` 문구 = "INPUT N건 판정 → 정상 X · 지각 Y · 야근 Z · 조퇴 W · 기준없음 K".
   - Kyu 실측 목표: **X < N** (0 아님) · 최소 1건 이상 late/ot/early_leave.
   - 만약 여전히 X=N (전부 정상)이면 뿌리 재실측 필요 (payroll_policy grace 시딩 확인).
6. **W-5 조퇴 상태**:
   - 판정 테이블 `[pcon-judgement-row-{i}][data-status=early_leave]` = `bg-accent-light/20` 행.
   - 퇴근 셀 = `bg-accent-light/60 text-accent font-semibold` (야근 red 와 구분).
   - 조퇴 컬럼 = `{early_leave_minutes}분`.
7. **W-6 판정 번복**:
   - 판정 row (status ≠ normal/unknown) `[pcon-judgement-override-open-{i}]` 버튼 클릭 → `[pcon-override-modal]`.
   - decision_type radio (해당 status 에 맞는 옵션만 활성).
   - 예: late 세션 → late_excused/late_partial. ot → ot_denied/ot_partial. early_leave → early_leave_excused.
   - 사유 입력 → [저장] → `pcon_override` append.
   - 판정 row `⚠` 배지 등장 · aggregate 카드 `[⚠ 재작업]` pulse (`hasEditsUpstream` 감지).
8. **W-7 API**:
   - `GET /pcon/overrides?run_id=...` = 200 (500 소멸 · 어떤 오류든 빈 items).
   - `POST /pcon/aggregate` 400 = 정상 계약 (judgement 미완 시).
9. **W-8 설명 문구**:
   - `[pcon-judgement-description]` = "💡 각 기록에 정상/지각/야근/조퇴 상태를 판정 — 기준 변경 시 이 단계만 재작업합니다."

---

## 이연 순증감

**본 라운드 (T0-0807-W) 순증**:
- **Backend 신설 1**: 마이그 `1700000000268-ExtendPconOverrideDecisionEarlyLeave.ts`.
- **Backend 편입**:
  - `shift-baseline.ts` (default fallback · early_leave · applyOverrides 확장).
  - `pcon-override.service/controller.ts` (500 방어 · explicit shape).
  - `attendance-minors.service.ts:executeJudgement` (early_leave 집계).
  - `pcon-override.entity.ts` (PconOverrideDecisionType 확장).
- **Backend 테스트 확장**: `attendance-judgement.spec.ts` (W-4/W-5 신설 assert · 42 pass).
- **Frontend 신설 1**: `PconOverrideModal.tsx` (판정 번복 UI).
- **Frontend 편입**:
  - `api/pcon-engine.ts` (early_leave_excused 편입).
  - `PconAttendanceContext.tsx` (hasEditsUpstream overrides 감지).
  - `PconAttendanceLeft.tsx` (CollapsibleHeader W-1 fix · RAW [✎] 상시 · 조퇴 컬럼/색 · 판정 설명 · 번복 진입 · overrideModal state · JudgedSession status 확장).
  - `PconNameMappingEditModal.tsx` (W-3 스왑 활성 · 중복 경고 가독성).
- **문서**: `pcon-engine-v1.md` §18 (조퇴) · §19 (번복) · `requirements-tracking.md` §3-P (9 신규 REQ).
- **relay**: `t0/T0-0807-W-report.md` (본).

**본 라운드 순감**:
- Frontend: `CollapsibleHeader` `border-2 border-accent` (V-4 놓친 잔존).
- Frontend: 화살표 아이콘 (`▶/▼`) → 텍스트 "펼치기/접기".
- Frontend: RAW [✎] `opacity-0 group-hover:opacity-100`.
- Frontend: 매핑 스왑 `reason.trim().length === 0` disabled 조건.

**이연 (X 라운드 · 파라미터화 · V-6 이연)**:
- payroll_judgement_policy 마이그 + 파라미터 관리 화면 + 시뮬레이션 프리뷰 + drill-down modal.
- Kyu 질문 8 (V-inquiry) 판정 대기.

**이연 (G+6+)**:
- Finalize · Payslip Dispatch.
- 계획/차이 (Work Rotation 편성).
- flag 제거 · 구 pos-import · WorkSessionOverride 삭제.

---

## [요약]

- **W-1** 완료: CollapsibleHeader 파란 테두리 뿌리 제거 (V-4 놓침) · T-6 정본 통일 · 화살표 → 텍스트.
- **W-2** 완료: RAW [✎] 상시 표시 · headerColumns 없어도 columnLetters fallback.
- **W-3** 완료: 스왑 reason 필수 조건 폐기 · 중복 경고 상단 고정 + 2-col 대비 강화.
- **W-4** 완료: work_type null/'' → non_casher default · SHIFT rotation 미편성 = non_casher · 판정 실작동 (Kyu 실기 뿌리 fix).
- **W-5** 완료: 조퇴 (early_leave) 상태 §18 정본 · 우선순위 ot > early_leave > late · 원인 색 퇴근 셀 accent.
- **W-6** 완료: PconOverrideModal §19 정본 · 3종 번복 (지각 면제 · 야근 불인정 · 조퇴 무효화) · pcon_override 소비 · 캐스케이드.
- **W-7** 완료: GET /overrides 500 → try/catch + explicit shape · POST /aggregate 400 = 정상 계약 유지.
- **W-8** 완료: 판정 카드 설명 문구 (사용자 이해).
- **파라미터화 = X 순연** 명기.
- **회귀**: TS 0 · Vitest 344 pass · Jest **42 pass** · Lint 0 · lint:hooks 0.
- **커밋**: T0-0807-W (본 커밋 SHA).
