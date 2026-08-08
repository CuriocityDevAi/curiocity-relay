# T0-0807-P · 리포트 (B 확정 · 구 화면 테이블 완전 복제)

## 스코프

**Kyu O 착지 확인** (공통 골격 완성). P = 구 화면 테이블 완전 복제 (B 확정 · "비슷한 게 아니라 제대로 복제").

**P 라운드**:
1. **P-1** 정리본 = 구 `AttendanceRawTable` 완전 이식 (편집 버튼만 hover 스타일로 교체).
2. **P-2** 집계 = 구 `AttendanceAggregationTable` 완전 이식 (이름 클릭 달력 · 숫자 클릭 필터 · Totals).
3. **P-3** O 골격 계승 (§11 접기 · hover 편집 · 셀 툴팁 · 재작업 파생 그대로).

## P-1 · 정리본 완전 이식

**컬럼 (구 화면 파리티)**: `# · 이름 · 날짜 · 출근 · 퇴근 · 근무시간 · 급여반영대상 · 상세내역`.

**Fix** (`web-admin/src/pages/payroll/pcon-view/PconAttendanceLeft.tsx:730~900`):
- **소스 정보 헤더** `[data-testid=pcon-cleanup-source]`: 파일명 (N행 파싱본) · N sessions · 업로드 시각. 구 화면 payroll-run-attendance-raw-source 대응.
- **이름 셀**: `mapped_pairs` 로 pos_name → user 해결. 매핑 성공 = `{user_name} (POS: {pos_name})` · 실패 = `{pos_name} (미매핑)` warning 색.
- **급여반영대상 셀** `[data-testid=pcon-cleanup-payroll-scope-{i}]`: 매핑 성공 = `대상` · 실패 = `비포함(Excluded)` 라벨 (bg-warning-light text-warning · hover title).
- **상세내역 셀**: 정상 = `정상` · orphan = `orphan_pulang` / `missing_pulang` warning label.
- **필터 적용** (구 화면 정본):
  - `kind='name'` · userId 매칭 → mapped_pairs 로 pos_name lookup → session 필터.
  - `kind='late'`, `kind='ot'` · shift_baseline 미배선 (G+6+) → 빈 결과 (미배선 정합).
  - `kind='anomaly'` · aggregate.excluded_sessions (pos_name, date) 매칭.
- **필터 라벨 + 해제** `[data-testid=pcon-cleanup-filter-label]` / `[data-testid=pcon-cleanup-filter-clear]`.
- **편집 버튼 대체**: 구 화면 상시 노출 폐지 · **O hover [✎] 스타일 유지** (Kyu 정본: "고정 버튼이 보기 싫었다").

## P-2 · 집계 완전 이식

**컬럼 (구 화면 파리티)**: `년 · 월 · 이름 · 근무일수 · 지각일수 · 야근시간 · 특이사항 · 계획 · 차이 · 반영/제외`.

**Fix** (`PconAttendanceLeft.tsx:220~460`):
- **년/월**: scope_key (yearMonth) 파싱 정본.
- **이름 클릭 → 달력 팝업**:
  - `[data-testid=pcon-aggregate-name-{user_id}]` 버튼 · 클릭 → `setCalendarModal({userId, userName})`.
  - `PconCalendarModal` (신설 · `PconCalendarModal.tsx`) 이 렌더.
- **근무일수 클릭 → name filter**:
  - `[data-testid=pcon-aggregate-workdays-{user_id}]` 클릭 → `setRawFilter({kind:'name', userId, userName})`.
  - 정리본 테이블이 즉시 필터 반영.
- **지각/야근/계획/차이 = "-" fallback** (미배선 · G+6+). button 아님.
- **특이사항**: 세션수 · 총 근무시간 표시 (신 정보 · pcon-adapter).
- **반영/제외 배지**: 항상 "반영" · excluded_sessions 별도 박스 (구 화면 정합).

**AttendanceAggregationTotals (합계 1행)** `[data-testid=pcon-aggregate-totals]`:
- 인원 · 총 근무 · 총 지각 (-) · 총 야근 (-) · 특이사항.

**PconCalendarModal (신설 · AttendanceCalendarModal 이식)**:
- `[data-testid=pcon-attendance-calendar-modal]`.
- 월 그리드 · 요일 헤더 (일~토) · 첫날 padding · 마지막 padding.
- 헤더 요약 (근무일수 · 지각(0) · 야근(0)).
- 각 셀 `[data-testid=pcon-attendance-calendar-day-{n}]` · 출근/퇴근 시각.
- hover title (날짜 · 출근 · 퇴근 · 상태).
- Dialog nonBlocking · draggable (구 컴포넌트 재사용).
- 세션 필터: 해당 user 매핑된 pos_name 들의 세션만 표시.

## P-3 · O 골격 계승 (재구현 금지)

- 두 테이블 모두 `CollapsibleHeader` 헬퍼 재사용 (§11 접기 · STEP 헤더 · 눈 아이콘 동기화).
- hover [✎ 편집] · `PconRowEditModal` (O · 사유 필수).
- 편집 셀 hover 툴팁 (O-6 · 개별 title).
- 재작업 파생 (`hasEditsUpstream` · `ReworkOrExecuteButton`) 그대로.

## 파리티 체크표

| 구 화면 기능 | 이식 | 사유/비고 |
|---|---|---|
| **정리본 (AttendanceRawTable)** | | |
| # 순서 컬럼 | ✓ | `pcon-cleanup-row-{i}` |
| 이름 컬럼 | ✓ | user_name + (POS: pos_name) |
| 날짜 컬럼 | ✓ | tabular-nums |
| 출근/퇴근 시간 (WIB · font-mono) | ✓ | formatIsoHms · WIB 관행 |
| 근무시간 컬럼 | ✓ | overlay 반영 |
| 급여반영대상 셀 | ✓ | 매핑 실패 = Excluded |
| 상세내역 (정상/지각/야근) | 부분 | 지각/야근 = shift_baseline 미배선 (G+6+) |
| 상단 셀 필터링 (name/late/ot/anomaly) | ✓ | name/anomaly 완전 · late/ot 미배선 |
| 필터 라벨 + 해제 | ✓ | pcon-cleanup-filter-label/clear |
| 비포함만 보기 토글 | X | excluded_sessions 별도 박스 (중복 회피) |
| 소스 정보 헤더 | ✓ | pcon-cleanup-source-* |
| 이름 매핑 확인 버튼 | X | name_mapping 마이너 카드 자체가 대체 |
| 상시 [편집] 버튼 | 대체 | hover [✎] (Kyu 정본) |
| [수정됨] 배지 | ✓ | ✎ 수정됨 + hover title |
| [오버라이드] 배지 | X | pcon = 편집만 (append-only) |
| [재작업] 컬럼 (세션 수준) | 대체 | 마이너 수준 [⚠ 재작업] (Rail) |
| Skeleton pulse | 부분 | Pacer M-1 로 대체 |
| 페이지네이션 | ✓ | 50/page (신) |
| **집계표 (AttendanceAggregationTable)** | | |
| 년/월 | ✓ | scope_key 파생 |
| 이름 클릭 → 달력 | ✓ | PconCalendarModal |
| 근무일수 클릭 → name 필터 | ✓ | pcon-aggregate-workdays-{user_id} |
| 지각일수 클릭 필터 | X | 미배선 (G+6+) · "-" |
| 야근시간 클릭 필터 | X | 미배선 (G+6+) · "-" |
| 특이사항 클릭 → anomaly 필터 | 대체 | 별도 excluded 박스 |
| 계획/차이 | X | Work Rotation 미연동 (G+6+) |
| 반영/제외 배지 | ✓ | 항상 "반영" (excluded_sessions 분리) |
| Skeleton pulse | 부분 | Pacer M-1 |
| **AggregateTotals** | | |
| 인원·총근무·총지각·총야근·특이·제외 | ✓ | 지각/야근 "-" |
| 초기화 버튼 | X | Rail pcon-reset-run |
| **CalendarModal** | | |
| 월 그리드 · 요일 헤더 · padding | ✓ | pcon-attendance-calendar-day-{n} |
| 헤더 요약 | 부분 | 지각/야근 = 0 (미배선) |
| 셀 색상 (지각/야근/정상/기준없음) | 부분 | 지각/야근 미배선 |
| hover title | ✓ | 날짜·출근·퇴근·상태 |
| Dialog nonBlocking · draggable | ✓ | 구 컴포넌트 재사용 |
| **관련 다이얼로그** | | |
| AttendanceEditDialog | 대체 | O · PconRowEditModal (5 계명) |
| NameMatchDialog | X | name_mapping 마이너가 대체 |
| AttendanceIssuesDialog | X | excluded_sessions 박스 |

## 회귀

- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Frontend TS**: `npx tsc -b --noEmit` = EXIT 0.
- **Vitest**: 24 files · **341 pass** · 17 skip.
- **Jest (pcon-adapter)**: 7 pass.
- **Lint**: EXIT 0.
- **lint:hooks**: EXIT 0.
- **npm 고정** · **포트 backend:4000/admin:4173 무변경**.

## 대본 재현 (Kyu 재실기 대비)

**완주 → 이름 클릭 달력 → 숫자 클릭 필터 → hover 편집 → 접기**:

1. Reset → IMPORT → 매핑 → 정리 → 집계 (4-클릭 완주 · O 골격 준수 · 결과 로그 완료 후 1회 · Pacer 600ms).
2. **집계표에서 이름 클릭**:
   - `[data-testid=pcon-aggregate-name-{user_id}]` 클릭.
   - `[data-testid=pcon-attendance-calendar-modal]` open (nonBlocking · draggable).
   - 헤더 요약 (근무일수 X일 · 지각 0일 · 야근 0회).
   - 월 그리드 · 각 셀 `[data-testid=pcon-attendance-calendar-day-{n}]` · 출근/퇴근 시각.
3. **집계표에서 근무일수 클릭**:
   - `[data-testid=pcon-aggregate-workdays-{user_id}]` 클릭.
   - 정리본 테이블 즉시 필터 반영.
   - `[data-testid=pcon-cleanup-filter-label]` = "필터: 이름 = {user_name}".
   - 필터된 세션만 표시.
   - `[data-testid=pcon-cleanup-filter-clear]` 클릭 → 필터 해제.
4. **정리본 hover [✎ 편집]**:
   - row hover → `[data-testid=pcon-cleanup-edit-{i}]` 등장 (opacity-0 → 100).
   - 클릭 → modal → 저장.
   - 편집 셀 `bg-accent-light/40` · hover title 툴팁.
5. **접기 (§11 O 골격)**:
   - Rail 카드 `[data-testid=pcon-step-{path}-eye]` 클릭 → 좌 결과 접힘.
   - 좌 헤더 `[data-testid=pcon-result-header-{path}]` 클릭 → 우 눈 상태 동기화.

## 이연 순증감

**본 라운드 (T0-0807-P) 순증**:
- **Backend**: 없음 (엔진 변경 X · UI 이식만).
- **Frontend 신설 1개**:
  - `web-admin/src/pages/payroll/pcon-view/PconCalendarModal.tsx` (AttendanceCalendarModal 이식).
- **Frontend 편입 2개**:
  - `PconAttendanceContext.tsx` (rawFilter · calendarModal state · PconRawFilterState 타입).
  - `PconAttendanceLeft.tsx` (소스 헤더 · 필터 라벨 · 컬럼 확장 · 이름/근무일수 클릭 · Totals · CalendarModal render · describePconRawFilter).
- **문서**: `pcon-engine-v1.md` §6.구현-P (파리티 체크표 포함).
- **리포트**: relay `t0/T0-0807-P-report.md` (O 청소 · P 게시).

**본 라운드 순감**:
- Frontend: `yearMonthOfAttempt` 헬퍼 삭제 (yearMonth prop 직접 사용으로 교체).

**이연 (G+6+)**:
- **OT/Finalize 실 계산** → 지각/야근/계획/차이 실 데이터 · CalendarModal 색상 배선.
- 세션 수준 revert (override 개념 pcon 재검토).
- flag 제거 · 구 pos-import 삭제.

## [요약]

- **P-1** completion: 소스 헤더 · 필터 라벨/해제 · 컬럼 확장 (`# · 이름 · 날짜 · 출근 · 퇴근 · 근무시간 · 급여반영대상 · 상세내역`) · pos_name→user 해결 · 미매핑 = 비포함(Excluded). 편집 버튼 = O hover [✎] (Kyu 정본).
- **P-2** completion: 이름 클릭 → PconCalendarModal (신설 · nonBlocking · draggable · 월 그리드) · 근무일수 클릭 → setRawFilter(name) · AggregateTotals · 미배선 컬럼 (지각/야근/계획/차이) "-" fallback.
- **P-3** completion: 두 테이블 모두 §11 접기 · hover [✎] · 셀 툴팁 · 재작업 파생 = O 골격 재사용 (재구현 X).
- **파리티 체크표**: 구 화면 기능 전수 나열 → 이식 ✓/사유 표기 (docs §6.구현-P 편입).
- **회귀**: TS 0 (backend + frontend) · Lint 0 · lint:hooks 0 · Vitest 341 pass · Jest 7 pass.
- **커밋**: T0-0807-P (본 커밋 SHA).
