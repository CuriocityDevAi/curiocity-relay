---
round: T0-0910-B
pr: https://github.com/CuriocityDevAi/todoboss/pull/22
outcome: 6/6 이슈 완료 · Playwright 5/5 pass · 단위 테스트 16 case
kyu_checks: 5 case (0 · i~iv) · 실 브라우저 · URL 쿼리 검증
---

# T0-0910-B · 리포트 (스텝 간 필터 · 판정불가 레코드 · Step #5 정리 · Step #3 읽기 전용 · 달력 겹침 색)

## 스코프

Kyu 09-10 T0-0910-B 지시 6건 · 새 PR (별개 · PR#21 T0-0909-A 와 병행).

**커밋 SHA**: todoboss branch `feat/pcon-cross-step-filter` · **PR #22** 신규.

---

## 0. 달력 겹침 색 (PR#21 잔여)

**뿌리** (`PconCalendarModal.tsx:160~220`):
```ts
const status = isOt ? 'ot' : isEarly ? 'early_leave' : isLate ? 'late' : 'normal';
// bg = status 단일 판정 → 지각+야근 겹침 시 노란색 사라짐.
```

**Fix**:
```ts
const statusList: string[] = [];
if (isOt) statusList.push('ot');
if (isEarly) statusList.push('early_leave');
if (isLate) statusList.push('late');
// 배경 = statusList[0] (우선순위) · 좌측 테두리 = statusList[1] · 하단 테두리 = statusList[2].
const overlayBorderCls = statusList.length > 1 ? '...' : '';
```

**결과** (Amel 5월):
- 헤더: 지각 8회 · 야근 11회 · 조퇴 0회.
- 노란 셀 (지각만): 5/1, 5/4, 5/8, 5/24, 5/28 = 5개.
- 배경 빨강 + 좌측 노란 테두리 (겹침): 5/5, 5/20, 5/21 = 3개.
- 지각 총 = 5 + 3 = 8 ✓ 헤더 일치.

---

## 1. 스텝 간 필터 (뼈대)

### 신설 파일

- `web-admin/src/pages/payroll/pcon-view/pcon-filter.ts` (210 줄):
  - `usePconFilter()` 훅.
  - 상태: `{ employee_id?, employee_name?, date?, kind?, override? }`.
  - URL 쿼리 자동 sync: `pcf_eid` · `pcf_name` · `pcf_date` · `pcf_kind` · `pcf_ov`.
  - popstate 대응 (뒤로가기).
  - `sessionMatchesFilter` 순수 함수 · `status_tags[]` 우선 · single status fallback.
- `PconFilterChip.tsx`: Step #3 · Step #4 상단 활성 칩 + [해제].

### 링크 진입점 표

| 진입점 | 파일:줄 | 동작 |
|---|---|---|
| Step #5 지각횟수 | `PconAttendanceLeft.tsx:pcon-agg-link-late-days-*` | setEmployee(id, name, 'late') |
| Step #5 지각시간 | `pcon-agg-link-late-mins-*` | setEmployee(id, name, 'late') |
| Step #5 야근횟수 | `pcon-agg-link-ot-days-*` | setEmployee(id, name, 'ot') |
| Step #5 야근시간 | `pcon-agg-link-ot-mins-*` | setEmployee(id, name, 'ot') |
| Step #5 특이사항 "기준 없음 N일" | `pcon-agg-link-unknown-*` | setEmployee(id, name, 'unknown') |
| Step #5 조정이력 "조정#N" | `pcon-agg-link-adjusts-*` | setOverrideOnly(id, name) |
| Step #4 헤더 정상 | `pcon-judge-count-normal` | setKind('normal') |
| Step #4 헤더 지각 | `pcon-judge-count-late` | setKind('late') |
| Step #4 헤더 야근 | `pcon-judge-count-ot` | setKind('ot') |
| Step #4 헤더 조퇴 | `pcon-judge-count-early-leave` | setKind('early_leave') |
| Step #4 헤더 기준없음 | `pcon-judge-count-unknown` | setKind('unknown') + 인라인 목록 open |
| Step #4 헤더 제외 | `pcon-judge-count-excluded` | setKind('excluded') + 인라인 목록 open |
| 인라인 목록 직원명 | `pcon-judgement-excluded-name-*` | setEmployee(0, name) |
| 인라인 목록 날짜 | `pcon-judgement-excluded-date-*` | setDate(date, 0, name) |

### 단위 테스트

`__tests__/pcon-filter.test.ts` (16 case pass):
- `isFilterEmpty` (3).
- `sessionMatchesFilter · employee_id` (3).
- `sessionMatchesFilter · date` (2).
- `sessionMatchesFilter · kind (status_tags 우선)` (4).
- `sessionMatchesFilter · override` (2).
- `sessionMatchesFilter · 복합` (2).

---

## 2. Step #5 정리

- 헤더 = `[근무일수 · 지각횟수 · 지각시간 · 야근횟수 · 야근시간 · 특이사항 · 조정이력]`.
- 삭제: 계획 · 차이 · 반영/제외.
- 특이사항 세션 부분 (`세션 N · XXhYYm`) 제거 · "기준 없음 N일" 밑줄 링크만 유지.
- 조정이력 컬럼 신설: 해당 직원 override 건수 = "조정#N" 태그 (0건은 "-").

---

## 3. 판정불가

- Step #4 테이블에서 제외하지 않음 (레코드 유지 · 필터로 접근).
- 하단 노란 박스 제거 (`false && ...`).
- 헤더 강조 (밑줄 링크) + 인라인 목록 (`pcon-judgement-excluded-inline`).
- Step #5 실행 시 잔존이면 `window.confirm`:
  ```
  판정불가 N건 남아 있습니다.
  이 세션은 급여 집계에서 제외됩니다.
  [확인] = 제외 승인 후 Step #5 진행 · [취소] = 판정 단계로 돌아가기.
  ```
  - [취소] → executeMinor return · 진행 안 됨.
  - tb_generic_audit 기록은 이연.

---

## 4. Step #3 읽기 전용

- `pcon-cleanup-edit-*` 편집 버튼 완전 삭제.
- 편집 필요하면 Step #4 (판정 조정) 에서 처리.
- 다른 스텝 편집 유지.

---

## 5. 공용 UX

- 헤더 집계 숫자 = 필터 진입 링크 (접힘 아님).
- 로그 애니메이션 = motion 토큰 · prefers-reduced-motion 이연.

---

## 자기 검증 (Playwright chromium · 5/5 pass · 5 스샷)

```
✓ (0) Amel 5월 달력 겹침 색 (10.5s)
✓ (i) Step #5 지각횟수 클릭 → 필터 활성 (10.4s)
✓ (ii) 기준없음 클릭 → 인라인 목록 (9.3s)
✓ (iii) Step #3 호버 편집 버튼 부재 (8.6s)
✓ (iv) 조정이력 컬럼 조정#N 클릭 → override 필터 (9.2s)
5 passed (48.8s)
```

### 스샷 첨부

- `T0-0910-B-screenshots/0-amel-calendar.png` : Amel 달력 · 헤더 지각 8·야근 11 · 5/5 5/20 5/21 겹침 셀 좌측 노란 테두리.
- `i-filter-active.png` : Step #5 지각횟수 클릭 후 URL `pcf_eid=22&pcf_kind=late` 반영 · 필터 칩 노출.
- `ii-excluded-inline.png` : 인라인 목록 (excluded 잔존 시).
- `iii-cleanup-no-edit.png` : Step #3 편집 버튼 부재 (테스트: `pcon-cleanup-edit-*` count = 0).
- `iv-adjusts-filter.png` : 조정#N 클릭 후 URL `pcf_ov=1` 반영.

### 어설션 파일 동봉

- `pcon-filter.test.ts` (16 case).
- `t0-0910-b-self-check.spec.ts` (5 spec).

---

## 회귀

- Backend Jest: 152 suites · **1934 pass**.
- Vitest: 30 files · **399 pass** (+16 신).
- TS: 0.
- Lint: 회귀 0.
- Playwright: 5/5 pass.

---

## 이연 순증감

**본 라운드 순증**:
- 신설: `pcon-filter.ts` · `PconFilterChip.tsx` · `pcon-filter.test.ts` · `t0-0910-b-self-check.spec.ts`.
- 수정: `PconAttendanceLeft.tsx` (Step #3/#4 필터 · Step #5 링크 · 판정 헤더 · 인라인 목록 · Step #3 편집 삭제 · Step #5 컬럼 정리) · `PconAttendanceContext.tsx` (executeMinor confirm) · `PconCalendarModal.tsx` (겹침 색).
- 문서: `pcon-engine-v1.md §38` · `requirements-tracking §3-P REQ 47~52` · `EPIC-STATE.md`.

**본 라운드 순감**:
- 종전 `pcon-cleanup-edit-*` 편집 버튼.
- 종전 Step #5 계획/차이/반영·제외 컬럼.
- 종전 Step #5 특이사항 세션 부분.
- 종전 하단 노란 박스.
- 종전 달력 우선순위 덮어쓰기.

**이연**:
- Step #5 실행 confirm → 정식 modal + 사유 + tb_generic_audit.
- 로그 자동 접기 애니메이션 (motion 토큰).
- Step #3 헤더 집계 숫자 링크 (Step #4 만 반영).
- URL 쿼리 확대 (다른 페이지 표준화).

---

## Kyu 실기 절 (처음 하는 사람 기준)

**진입 셋업**: `cd backend && npm run start:dev` (port 4000) · `cd web-admin && npm run dev` (port 4321).
URL: `http://localhost:4321/payroll/run?use_pcon_engine=1` · Admin/Admin123!@# · Month = 5.

### Case (0) · 달력 겹침 색
1. Step #5 Amel 이름 클릭.
2. 달력 modal · 헤더 지각 N회 · 야근 M회.
3. 지각+야근 겹침 셀 확인: 배경 빨강 + 좌측 노란 테두리.
4. 노란 셀 개수 (단독+겹침 포함) = 헤더 지각 N.

### Case (i) · Step #5 지각횟수 클릭 → 필터
1. Amel 지각횟수 셀 클릭.
2. Step #3/#4 상단 필터 칩 노출.
3. URL 에 `pcf_eid=22&pcf_kind=late` 반영.
4. [해제] 클릭 → 필터 해제.

### Case (ii) · 기준없음 클릭 → 인라인 목록
1. Step #4 헤더 "기준없음 N" 클릭.
2. 인라인 목록 노출 (직원명 · 날짜 · 사유).
3. 날짜 클릭 → Step #3/#4 직원+날짜 필터 (1행).

### Case (iii) · Step #5 실행 시 판정불가 confirm
1. 판정 excluded > 0 상태에서 Step #5 실행.
2. window.confirm 팝업.
3. [취소] → 진행 안 됨. [확인] → aggregate.

### Case (iv) · Step #3 편집 버튼 부재
1. Step #3 표 row hover.
2. `pcon-cleanup-edit-*` 개수 = 0.

### Case (v) · 헤더 숫자 링크
1. Step #4 헤더 정상/지각/야근/조퇴/기준없음/제외 각 밑줄 링크.
2. 클릭 시 필터 진입 · 카드 접힘 없음.
