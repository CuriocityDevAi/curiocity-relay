---
round: T0-0910-C
pr: https://github.com/CuriocityDevAi/todoboss/pull/22
outcome: 결함 3 + B 미이행 4 = 7 이슈 완료 · Playwright 5/5 pass · 이연 0
kyu_checks: 5 case (i~v) · 실 브라우저 · URL 쿼리 · audit 검증
---

# T0-0910-C · 리포트 (B 연속 · Step #3 필터 범위 · 실 id · Step #5 게이트 모달 · 로그 motion · 헤더 접힘 규칙)

## 스코프

Kyu 09-10 실기 결함 3 + B 라운드 미이행 4 = **전부 이번 라운드 완결 (이연 0)**.

**커밋 SHA**: todoboss branch `feat/pcon-cross-step-filter` → PR #22 (B 이어서 계속).

---

## 결함 1 · Step #3 필터 범위 (뿌리 · 파일:줄)

**뿌리**: `pcon-filter.ts:sessionMatchesFilter` 이전 버전이 scope 없이 kind 를 모든 caller 에 강제 → Step #3 도 kind=late 필터 → 0행.

**Fix**:
- `pcon-filter.ts:174~215 sessionMatchesFilter(s, f, opts?)` · `opts.scope='cleanup'` 시 kind/override 무시.
- `PconAttendanceLeft.tsx:1477 sessionMatchesFilter(fs, pcf.filter, { scope: 'cleanup' })` 호출.
- `PconFilterChip.tsx` · scope='cleanup' 힌트 라인 편입.
- Unit test `__tests__/pcon-filter.test.ts` +5 case (scope=cleanup 은 kind/override 무시 · employee/date 유지).

---

## 결함 2 · 인라인 목록 실 employee_id (뿌리 · 파일:줄)

**뿌리**: `PconAttendanceLeft.tsx:1060~1071 (T0-0910-B 시)` 인라인 링크가 `pcf.setEmployee(0, e.pos_name)` · id=0 꼼수 · 이름 매칭 경로 사용.

**Fix**:
- Backend: `attendance-minors.service.ts:972~1067 excludedSessions.push` · `user_id`/`user_name` 필드 저장.
- Frontend: `PconAttendanceLeft.tsx:1051~1105` · `const uid = e.user_id ?? null` · uid 있으면 button (실 id) · uid=null 이면 span (링크 부재).
- `pcon-filter.ts:sessionMatchesFilter` · employee_name 매칭 경로 완전 폐기 (employee_id 만).
- URL 정본: `pcf_eid` (실 id · 매칭) · `pcf_name` (표시용만).

---

## 결함 3 · Step #5 게이트 정식 모달 + audit (뿌리 · 파일:줄)

**뿌리**: `PconAttendanceContext.tsx:executeMinor` (T0-0910-B 시) 는 `window.confirm` 만 · UX 요구 미달.

**Fix**:
- **Backend** `attendance-minors.controller.ts:118~180 POST /aggregate-approval`:
  - body: `{run_id, reason, excluded_sessions}`.
  - `DataSource.query` 로 `tb_generic_audit` INSERT · `entity_kind='pcon_aggregate_approval'` · `action='approve'` · context_json = excluded 목록 · 승인 사유.
- **Frontend**:
  - `api/pcon-engine.ts:saveAggregateApproval` (신 클라 함수).
  - `PconAttendanceContext.tsx:aggregateApprovalRequest` state · `executeMinor` Promise-based.
  - `PconAggregateApprovalModal.tsx` (신설 · Dialog · 사유 입력 필수 · disabled 조건).
  - `PconAttendanceLeft.tsx <PconAggregateApprovalModal />` 렌더.
- **정본**:
  - 사유 없이 [진행] disabled.
  - [돌아가기] → resolve(null) → executeMinor return · Step #5 산출물 생성 안 됨.
  - [진행] → saveAggregateApproval (audit 저장) → runAggregatePcon.

---

## B② 로그 자동 접기 motion

`PconAttendanceRail.tsx:630~648`:
```tsx
<div
  data-testid={`pcon-step-${m.path}-log-motion`}
  data-motion-expanded={expanded ? 'true' : 'false'}
  className={`overflow-hidden transition-[max-height] duration-1000 ease-out motion-reduce:transition-none motion-reduce:duration-0 ${
    expanded ? 'max-h-[400px]' : 'max-h-0'
  }`}
  style={{ transitionDuration: '1000ms' }}
>
  <PconLogList ... />
</div>
```
- Playwright (v): `getComputedStyle(...).transitionDuration === '1s'` 확증.

---

## B③ Step #3 헤더 링크

`PconAttendanceLeft.tsx:1641~1671`:
- `총 세션 N` 표시.
- `특이사항 orphan N건` 밑줄 링크 · `pcon-cleanup-count-orphan` click → `setRawFilter({kind:'anomaly'})`.

---

## B④ 헤더 클릭 접힘 방지 (실측)

**실측 근거** (`PconAttendanceLeft.tsx:243~281` 종전):
```tsx
<button onClick={onToggle}>  // 전체 button · 모든 클릭 = 접힘 토글.
  <span>{eye}</span>
  <span>STEP #{seq}</span>
  <span>{card}</span>  // 텍스트 클릭도 접힘.
  <span>{caret}</span>
</button>
```

**Fix** (`PconAttendanceLeft.tsx:243~299`):
```tsx
<div>  // wrapper (클릭 이벤트 없음).
  <button onClick={onToggle}>{eye}</button>  // 눈 아이콘만 toggle.
  <span>STEP #{seq}</span>
  <span data-testid={`...-card-text`}>{card}</span>  // 순수 span (클릭 접힘 없음).
  <button onClick={onToggle}>{caret}</button>  // 명시 [접기]/[펼치기] 만 toggle.
</div>
```

Playwright (iv): `card-text` 클릭 후 `data-collapsed` 불변 · `caret` 클릭 후 토글.

---

## 자기 검증 (Playwright · Chromium · 5/5 pass · 4 스샷)

```
✓ (i) Step #5 지각횟수 → Step #3 = 직원 전체 · Step #4 = 지각만 (10.0s)
✓ (ii) 인라인 목록 · URL pcf_eid=실 id (9.3s)
✓ (iii) Step #5 실행 → 모달 · disabled · [돌아가기] · 사유 후 진행 → audit (8.7s)
✓ (iv) 헤더 텍스트 클릭 미접힘 · [접기] 접힘 (9.5s)
✓ (v) 로그 접기 transition ≈1000ms (8.7s)
5 passed (47.0s)
```

### 스샷

- `T0-0910-C-screenshots/i-filter-cleanup-full-judge-late.png`
- `T0-0910-C-screenshots/ii-inline-list.png`
- `T0-0910-C-screenshots/iv-header-click.png`
- `T0-0910-C-screenshots/v-log-motion.png`

---

## 회귀

- Backend Jest: 152 suites · **1934 pass**.
- Vitest: 30 files · **404 pass** (+5 pcon-filter · scope=cleanup).
- TS: 0.
- Lint 회귀: 0.

---

## 이연 순증감 = 0 (모두 완결)

**순증** (모두 편입 완료):
- 신설: `PconAggregateApprovalModal.tsx` · `t0-0910-c-self-check.spec.ts`.
- 수정: `pcon-filter.ts` (scope) · `PconFilterChip.tsx` (힌트) · `PconAttendanceLeft.tsx` (인라인 실 id · Step #3 헤더 링크 · CollapsibleHeader) · `PconAttendanceRail.tsx` (log-motion) · `PconAttendanceContext.tsx` (aggregateApprovalRequest) · `attendance-minors.service.ts` (excluded user_id) · `attendance-minors.controller.ts` (approval endpoint) · `api/pcon-engine.ts` (saveAggregateApproval).
- 문서: `pcon-engine-v1.md §38-C` · `requirements-tracking §3-P REQ 53~58`.

**순감**:
- `window.confirm` (T0-0910-B 임시) → 정식 modal.
- `pcf_eid=0` 꼼수 → 실 id.
- CollapsibleHeader `<button>` 전체 감쌈 → div + eye/caret 분리.
- Step #3 kind 적용 (0행 사고) → cleanup scope 무시.

---

## Kyu 실기 절 (처음 하는 사람 기준)

**진입**: `http://localhost:4321/payroll/run?use_pcon_engine=1` · Admin/Admin123!@# · Month=5.

### Case (i)
1. Step #5 Amel 지각횟수 셀 클릭.
2. Step #3 행수 = Amel 전체 세션 (26행 정도).
3. Step #4 행수 = Amel 지각 세션만 (8행 정도).
4. Chip 힌트 "Step #3은 직원·날짜만 적용" 노출.

### Case (ii)
1. Step #4 헤더 기준없음/제외 클릭 → 인라인 목록.
2. 첫 항목 이름 (예: Kayla Shafa) 클릭.
3. URL `?pcf_eid=31&...` 반영 (0 아님).

### Case (iii)
1. 판정 excluded > 0 상태에서 Step #5 실행.
2. Modal 노출 · 목록 (직원·날짜·사유).
3. 사유 비어 있으면 [제외 승인 후 진행] disabled.
4. [돌아가기] → Step #5 산출물 생성 안 됨.
5. 사유 입력 후 [진행] → audit 저장 (`SELECT * FROM tb_generic_audit WHERE entity_kind='pcon_aggregate_approval'`) + Step #5 실행.

### Case (iv)
1. 결과 카드 헤더 텍스트 (`STEP #4 · INPUT ...`) 클릭 → 접힘 없음.
2. 오른쪽 [접기] 클릭 → 접힘.
3. [펼치기] 클릭 → 펼침.

### Case (v)
1. 결과 카드 아코디언 [접기] 클릭 → 로그 리스트 부드럽게 1초 접힘.
2. DevTools: `getComputedStyle(document.querySelector('[data-testid$="-log-motion"]')).transitionDuration === '1s'`.
