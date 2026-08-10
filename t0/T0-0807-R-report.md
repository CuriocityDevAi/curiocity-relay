# T0-0807-R · 리포트 (Q 판정 반영 · 회귀 fix + 이식 + 파리티 테스트)

## 스코프

**Kyu Q 인벤토리 판정 반영** · 9개 항목 구현/이식/기각.

**R 라운드**:
1. **R-1** 시각 정본 §12 (엑셀 시각 무변환 · 서버 시간대 완전 독립).
2. **R-2** 결과 2회 노출 fix (all=0 시 대기).
3. **R-3** STATUS_BADGE 이식 (○▶✓✕⊘⧗).
4. **R-4** Users 딥링크 (미매핑 세션).
5. **R-5** AI-감 3종 (caret+shimmer · 스켈레톤 pulse · 자동 스크롤).
6. **R-6** 감사 이력 모달 (§13 신설).
7. **R-7** 오버라이드 1급 재도입 (§8-override · pcon_override 테이블).
8. **R-8** 파리티 자동 테스트 (시각 무변환 unit 11 assert).
9. **R-9** 기각 확정 (비포함 토글 X · 재작업 세분성 유지 · G+6+ 이연).

## R-1 · 시각 정본 §12 (WIB 무변환)

**뿌리 재실측**:
- Q-1 ② 초기 이식안 (getUTCHours + serializeWibNaive) 도 여전히 서버 시간대 의존.
- GMT+7 서버 (jest 실행 환경): parseTime("17:30:45") → UTC "10:30:45Z" → getUTCHours = 10 (WIB 값 손실).
- **뿌리 = parseTime 자체가 Date 객체 반환 · Date 는 서버 시간대 파싱**.

**정본 (§12 신설)**:
> 엑셀 시각 무변환 — WIB 원문 그대로 저장·표시. UTC 변환·offset 조작 금지. 파싱된 값의 UTC 필드 = 원본 WIB 시각 · 표시도 UTC 필드 그대로 · **서버 시간대 완전 독립**.

**Fix** (`backend/src/todoboss/payroll/pcon-adapter/attendance-minors.service.ts:37~85`):
- `extractWibTimeStr(dateStr, timeRaw)` 신설:
  - 문자열 timeRaw: 정규식 파싱 (`HH:MM[:SS][ AM/PM]`) · 24h/12h 관대.
  - 숫자 timeRaw (엑셀 fraction): 하루 초 단위 산술 (`Math.round(timeRaw * 86400)`).
  - 반환: `"${dateStr}T${hh}:${mm}:${ss}"` (Z 없음 · offset 없음).
- **Date 객체 · .toISOString() · getUTCHours 완전 폐기**.
- pairSessions punch sort = 문자열 localeCompare (Date.getTime 대체).

**프론트 Fix**:
- `PconAttendanceLeft.tsx:74~90` `formatIsoHms` = `iso.slice(11, 19)` (slice only).
- `PconCalendarModal.tsx:33~37` `formatHm` = `iso.slice(11, 16)` (slice only).

**고정 unit test** (`backend/src/todoboss/payroll/pcon-adapter/attendance-minors.pairing.spec.ts` · 8 assert):
- 문자열 "08:15:00" · "17:30:45" 무변환 확증.
- 엑셀 숫자 0.34375 → "08:15:00".
- 12h AM/PM → 24h 변환.
- 빈 값/잘못 형식 → null.
- **회귀 방어**: Date 객체 미사용 확증 (원문 서버 시간대 무관).

## R-2 · 결과 2회 노출 fix (Q-1 ① 이식안 채택)

**뿌리** (Q-1 ①): O-1 fix 후에도 첫 poll 성공 시점 log 미도착 (all=0) → 이전 `if (all.length === 0) return true` 조건에서 완료 판정 → 결과 카드 1회 번쩍 → 후속 log 도착 시 revealed=0 → 사라짐 → Pacer 후 재등장 (총 2회).

**정본 (Q-1 ① 이식안 채택)**:
- `PconAttendanceContext.tsx:isMinorRevealComplete`: `if (all.length === 0) return false` (미완료 판정 · 대기).
- **근거**: attempt 는 항상 최소 1개 로그 발화 (cleanup_started · aggregate_started 등 · attendance-minors.service:emitLog 관찰). 실제 로그 없는 마이너 = edge 극단 (사실상 없음). **대기 안전**.
- 대안 (b) attempt.ended_at 이후 500ms · (c) pollCount>=2 는 시간 의존 · 취약. (a) 채택 = 데이터 단순 · 회귀 감지 명확.

## R-3 · STATUS_BADGE 이식 (구 PacedConsole 정본)

**Fix** (`PconAttendanceRail.tsx`):
```ts
const PCON_STATUS_BADGE = {
  READY:       { cls: 'bg-surface-tertiary text-text-tertiary', icon: '○' },
  IN_PROGRESS: { cls: 'bg-accent-light text-accent',           icon: '▶' },
  DONE:        { cls: 'bg-success-light text-success',          icon: '✓' },
  FAILED:      { cls: 'bg-error-light text-error',              icon: '✕' },
  ABANDONED:   { cls: 'bg-warning-light text-warning',          icon: '⊘' },
  STALE:       { cls: 'bg-warning-light text-warning',          icon: '⧗' },
};
```
- 렌더: `<span className={b.cls}>{b.icon} {st}</span>`.
- ABANDONED/STALE = pcon-engine 신 파생 상태 (구 PacedConsole 미지원 · 확장).

## R-4 · Users 딥링크

**Fix** (`PconAttendanceLeft.tsx`):
- 매핑 실패 세션 정리본 row 급여반영대상 셀:
  - `<a href="/users?search={encodeURIComponent(s.pos_name)}" data-testid="pcon-cleanup-users-link-{i}">Users > 급여 설정에서 등록 →</a>`.
- 구 화면 정본 (`PayrollRunPage.tsx:3671~3678`) 이식.

**이연 (G+6+)**: 지각/야근/기준없음 라벨 · Scheduling 링크 (shift_baseline 배선 후).

## R-5 · AI-감 3종

**Fix**:

**(a) IN_PROGRESS caret ▍ + shimmer** (`web-admin/src/index.css`):
```css
@keyframes pconCaret { 0%,45% {opacity:1} 50%,95% {opacity:.15} 100% {opacity:1} }
.pcon-caret { display:inline-block; animation: pconCaret 1s ease-in-out infinite; }
@keyframes pconShimmer { 0%,100% {opacity:.55} 50% {opacity:1} }
.pcon-shimmer { animation: pconShimmer 1.2s ease-in-out infinite; }
```
- `PconAttendanceRail.tsx:PconLogList` 마지막 라인 (IN_PROGRESS 시): `pcon-shimmer` 클래스 + `▍ caret`.

**(b) 실행 중 결과 자리 스켈레톤 pulse** (`PconAttendanceLeft.tsx`):
- `running !== null` 시 `[data-testid=pcon-result-skeleton-{path}]` 렌더:
  - `border-2 border-dashed border-accent` · `paced-table-skeleton` 3줄 (기존 CSS class 재사용).

**(c) 로그 자동 스크롤** (`PconAttendanceRail.tsx:useFollowScroll`):
- 신 log 도착 시 `<ol>.scrollTop = scrollHeight` (구 PacedConsole:311 오마주).

## R-6 · 감사 이력 모달 (§13 신설)

**Backend** (`backend/src/shared/pcon-engine/`):
- `pcon-audit.service.ts` · `buildTimelineForRun(runId)`:
  - `pcon_step_run` (실행) → type=`execute`.
  - `pcon_row_edit` (편집) → type=`edit`.
  - `pcon_log` (`rework_triggered_by_edit` · `reset_abandoned`) → type=`rework` / `reset`.
  - 시각 asc 정렬 · 동시각은 execute → edit → rework/reset 순.
- `pcon-audit.controller.ts` · `GET /api/admin/pcon/audit-timeline?run_id=...` → `{items}`.

**Frontend** (`PconAuditModal.tsx`):
- Rail `[📜 감사 이력]` 버튼 → `setAuditModalOpen(true)`.
- Dialog nonBlocking · draggable.
- 필터: type (all/execute/edit/rework/reset) · actor · 시각 asc/desc 토글.
- 항목 클릭 → `document.querySelector('[data-testid=pcon-result-{path}]')` 스크롤 + `ring-2 ring-accent` 강조 (2s).

**사유 필수 범위 (Kyu 확정)**: 편집 · 재작업 · reset 만. IMPORT · 마이너 실행 = 사유 불필요.

## R-7 · 오버라이드 1급 재도입 (§8-override)

**Backend**:
- **마이그** (`1700000000266-CreatePconOverrideTable.ts`):
  - 테이블 `pcon_override`.
  - `subject_kind` ('session' | 'user') · `subject_id`.
  - `decision_type` ('ot_denied' | 'ot_partial' | 'late_excused' | 'late_partial').
  - `before_value` / `after_value` JSONB · `reason` (CHECK char_length > 0).
  - **append-only 트리거**: UPDATE/DELETE 봉쇄 (재판정 = 신 INSERT).
- **Entity**: `pcon-override.entity.ts`.
- **Service** (`pcon-override.service.ts`): createOverride (whitelist 검증 · reason 이중 검증) · listOverridesForRun.
- **Controller** (`pcon-override.controller.ts`): POST `/pcon/override` · GET `/pcon/overrides`.

**Frontend**:
- Context: `overrides` state · `overridesForSubject(kind, id)` 헬퍼 · `saveOverride` action.
- `PconAttendanceLeft.tsx`: 정리본 row 에 `⚠ 오버라이드` 배지 (bg-warning-light · cursor-help · hover title).
- session subject_id = `"session:{pos_name}:{date}"`.

**실 OT/Late 판정 소비 = G+6+** (본 라운드 = 개념·저장·표시 계층만).

## R-8 · 파리티 자동 테스트 병기

**신설**:
- `backend/src/todoboss/payroll/pcon-adapter/attendance-minors.pairing.spec.ts` (8 assert · R-1 시각 정본):
  - 문자열/숫자/AM PM/빈값/서버 시간대 무관 · slice 형식.

**기존 유지**:
- `attendance-file-import.service.spec.ts` (7 assert · file period 파싱).
- `PconAttendanceImportView.smoke.test.tsx` (mount smoke).

**총 회귀**: Jest 15 pass (7→15 · 신 pairing 8 assert) · Vitest 341 pass.

## R-9 · 기각 확정 (Kyu 정본)

- 비포함 토글 재도입 = **불채택** (excluded_sessions 박스 유지).
- 재작업 세분성 = **마이너 수준 유지** (세션 revert 안 함).
- 집계 지각/야근/계획 배선 = **G+6+ 이연 유지**.

## 회귀

- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Frontend TS**: `npx tsc -b --noEmit` = EXIT 0.
- **Vitest**: 24 files · **341 pass** · 17 skip.
- **Jest (pcon-adapter)**: **15 pass** (7 file-import + 8 pairing).
- **Lint**: EXIT 0.
- **lint:hooks**: EXIT 0.

## 대본 재현 (Kyu 재실기 대비)

**완주 → 시각 정확 → 결과 1회만 → 배지·링크·리듬 → 감사 모달 → 오버라이드**:

1. Reset → IMPORT → 매핑 → 정리 → 집계:
   - 각 마이너 결과 **로그 완료 후 1회만** 등장 (R-2 · all=0 시 대기).
   - Pacer 600ms/줄 (O-2b 유지).
   - **정리본 시각** = 엑셀 원문 그대로 (예: "08:15:00" → 표시 "08:15:00" · WIB 무변환).
2. **STATUS_BADGE** (R-3):
   - `[data-testid=pcon-step-{path}-status-badge]` = `○ READY` · `▶ IN_PROGRESS` · `✓ DONE` (아이콘+색).
3. **Users 링크** (R-4):
   - 미매핑 세션 row → `[data-testid=pcon-cleanup-users-link-{i}]` = "Users > 급여 설정에서 등록 →" · href `/users?search=<pos_name>`.
4. **AI-감** (R-5):
   - IN_PROGRESS 카드 마지막 로그 라인 = `pcon-shimmer` + `▍ caret` (깜빡).
   - 실행 중 좌 결과 자리 = `[data-testid=pcon-result-skeleton-{path}]` 스켈레톤 pulse.
   - 로그 리스트 자동 스크롤 (신 log 도착 시 하단 노출).
5. **감사 이력** (R-6):
   - Rail `[📜 감사 이력]` 클릭 → `[data-testid=pcon-audit-modal]` open.
   - 통합 타임라인: `execute` · `edit` · `rework` · `reset` (시각 asc).
   - 필터: type · actor · 정렬 토글.
   - 항목 클릭 → 관련 카드 스크롤 + ring 강조 2s.
6. **오버라이드** (R-7):
   - POST `/pcon/override` (subject_kind='session' · decision_type='ot_denied' · reason 필수).
   - 정리본 row `[data-testid=pcon-cleanup-override-badge-{i}]` = "⚠ 오버라이드" (hover title).
   - append-only (UPDATE/DELETE 시도 → DB 트리거 raise exception).

## 이연 순증감

**본 라운드 (T0-0807-R) 순증**:
- **Backend 신설 4개**:
  - `1700000000266-CreatePconOverrideTable.ts` (마이그 · 트리거).
  - `pcon-override.entity.ts` · `pcon-override.service.ts` · `pcon-override.controller.ts`.
  - `pcon-audit.service.ts` · `pcon-audit.controller.ts` (감사 이력).
- **Backend 편입**:
  - `attendance-minors.service.ts` (parseTime 폐기 · extractWibTimeStr 신설 · 문자열 diff/sort).
  - `pcon-engine.module.ts` (PconOverride/PconAudit 서비스·컨트롤러 등록).
- **Backend 테스트 신설**: `attendance-minors.pairing.spec.ts` (8 assert · 시각 무변환).
- **Frontend 신설 2개**:
  - `PconAuditModal.tsx` (감사 이력 모달).
- **Frontend 편입**:
  - `api/pcon-engine.ts` (audit-timeline · override API).
  - `PconAttendanceContext.tsx` (overrides · auditModalOpen · saveOverride · overridesForSubject).
  - `PconAttendanceLeft.tsx` (스켈레톤 pulse · Users 링크 · 오버라이드 배지 · slice 형식 · audit modal render).
  - `PconAttendanceRail.tsx` (STATUS_BADGE · PconLogList + useFollowScroll + caret · 감사 이력 버튼).
  - `PconCalendarModal.tsx` (slice 형식).
  - `index.css` (pconCaret · pconShimmer).
- **문서**:
  - `pcon-engine-v1.md` §12 (시각) · §13 (감사) · §8-override (오버라이드) · §6.구현-R.
  - `requirements-tracking.md` §3-P (pcon-engine 정본 편입 · 7 REQ).
- **리포트**: relay `t0/T0-0807-R-report.md` (Q inventory 청소 · R 게시).

**본 라운드 순감**:
- Backend: `parseTime` import 폐기 · Date 객체 punch time 폐기 (문자열로 대체 · ~30 lines refactor).
- Frontend: `formatIsoHms/formatHm` getUTCHours 로직 폐기 (slice 로 대체).

**이연 (G+6+)**:
- OT/Finalize 실 계산 · aggregate "-" 컬럼 실 데이터 (지각·야근·계획·차이).
- shift_baseline 배선 (상세내역 지각/야근/기준없음 라벨 · Scheduling 링크 · CalendarModal 색상).
- 오버라이드 실 소비 (판정 조정 UI + 계산 반영).
- flag 제거 · 구 pos-import 삭제.

## [요약]

- **R-1 완료**: `extractWibTimeStr` (parseTime 우회 · Date 미사용) · 서버 시간대 완전 독립. 프론트 slice only. §12 정본.
- **R-2 완료**: `if (all.length === 0) return false` (Q-1 ① 이식안 (a) 채택 · attempt 최소 1 로그 발화 → 대기 안전).
- **R-3 완료**: PCON_STATUS_BADGE (○▶✓✕⊘⧗ · 6종).
- **R-4 완료**: 매핑 실패 세션 Users 딥링크.
- **R-5 완료**: caret+shimmer (index.css) · 스켈레톤 pulse (Left) · useFollowScroll (Rail).
- **R-6 완료**: 감사 이력 모달 (PconAuditModal) · 통합 타임라인 backend · 항목 클릭 카드 스크롤 · §13.
- **R-7 완료**: pcon_override 마이그 + entity + service + controller · append-only · `⚠ 오버라이드` 배지. 실 소비 = G+6+.
- **R-8 완료**: 시각 무변환 unit 8 assert (jest 15 pass · 신설).
- **R-9 확정**: 비포함 토글 X · 재작업 세분성 유지 · 지각/야근/계획 G+6+.
- **회귀**: Backend TS 0 · Frontend TS 0 · Vitest 341 pass · Jest 15 pass · Lint 0.
- **커밋**: T0-0807-R (본 커밋 SHA).
