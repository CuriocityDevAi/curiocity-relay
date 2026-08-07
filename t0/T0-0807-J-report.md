# T0-0807-J · 리포트 (게이트⑯ 5차 · GO 확정 · G+5 알맹이 1탄)

## 스코프

Kyu 게이트⑯ 5차 = **GO 판정** ("흐름·구조 맞다") · 엔진 확정. 이제 알맹이 이관.

**J 라운드 = 3 결함/알맹이 + 1 문서 원칙 편입**:
1. **J-1** 아코디언 자동 접힘 미작동 (실기 관찰).
2. **J-2** file_import POS 엑셀 헤더 정파싱 + RAW 전량 (실측 실패 518/518 뿌리).
3. **J-3** name_mapping 실 도메인 배선 (stub 탈피 1호).
4. **[DOC]** 2사분면 시각화 원칙 편입 (Kyu 08-07 정본).

## J-1 · 아코디언 자동 접힘 재현·수리

**뿌리 실측**:
- 정본 (§4): IN_PROGRESS 펼침 · DONE 자동 접힘 · 사용자 수동 토글 유지.
- 결함 재현: 사용자가 IN_PROGRESS 진행 중 accordion toggle 클릭 → `manualExpanded[path]` 세팅 → 이후 DONE 전이 후에도 override 지속 → auto-collapse 미작동.

**Fix** (`web-admin/src/pages/payroll/pcon-view/PconAttendanceContext.tsx:255~275`):

```tsx
const prevStatusesRef = useRef<Record<string, string>>({});
useEffect(() => {
  const cur: Record<string, string> = {};
  for (const [path, view] of Object.entries(derived.steps)) {
    cur[path] = view.status;
  }
  setManualExpanded((prevExp) => {
    let changed = false;
    const next = { ...prevExp };
    for (const [path, curSt] of Object.entries(cur)) {
      const prevSt = prevStatusesRef.current[path];
      if (curSt === 'DONE' && prevSt !== 'DONE' && next[path] !== undefined) {
        delete next[path];  // manualExpanded 삭제 → 정본 auto-collapse 로 회복.
        changed = true;
      }
    }
    return changed ? next : prevExp;
  });
  prevStatusesRef.current = cur;
}, [derived]);
```

## J-2 · POS 엑셀 헤더 정파싱 + RAW 전량

**뿌리 실측 (Kyu 로그 "행 검증 실패 518/518·스킵")**:
- 이전 판본: `sheet_to_json` (header 자동 = 첫 행) → POS export 상단 메타 행 (Period · Outlet · ...) 有.
- 결과: `__EMPTY_*` 컬럼 다수 생성 → 이름 컬럼 부재 판정 → 전 행 WARN 스킵.

**Fix** (`backend/src/todoboss/payroll/pcon-adapter/attendance-file-import.service.ts:105~200`):
- 1단계: `sheet_to_json(sheet, {header:1})` array-of-arrays 매트릭스.
- 2단계: `findHeaderRow(rawRows)` (pos-import 정본 재사용 · HEADER_KEYWORDS = Name/Nama/Date/Tanggal/Check In/Type/Status/...).
- 3단계: 헤더 이후 데이터 행을 헤더셀 이름으로 매핑 (`__EMPTY_*` 소멸 · 실 컬럼명 사용).
- 4단계: WARN = name/date 컬럼 실 부재 (진짜 무효 행 · 통상 0건).

**INPUT/OUTPUT 실 수치**:
- `input_count` = total 데이터 행 (엑셀 rows.length + warnings.length).
- `output_count` = 검증 통과 행.
- `pcon-engine.service.ts:145` · `completeStepAttempt` 에 `input_count` 필드 추가 (엔진 확장).

**RAW 전량 저장**:
- `anomalies[0].raw_rows_full` = 전 행 배열 (JSONB).
- `anomalies[0].header_columns` = 실 헤더 컬럼 순서.

**좌 RAW 전량 렌더** (`web-admin/src/pages/payroll/pcon-view/PconAttendanceLeft.tsx:70~185`):
- `RAW_PAGE_SIZE=50` · 이전/다음 페이지 버튼 (`[data-testid=pcon-raw-pagination]`).
- 헤더 컬럼 = `header_columns` (엑셀 컬럼명 그대로) · `#` (row_index) 컬럼 선두.
- 렌더: `data-testid=pcon-raw-table` · `data-total-rows` 속성.

## J-3 · name_mapping 실 도메인 배선

**Fix** (`backend/src/todoboss/payroll/pcon-adapter/attendance-minors.service.ts:1~215`):

**Repository 주입** (`pcon-adapter.module.ts`):
```ts
TypeOrmModule.forFeature([StaffMaster, User, PosNameAlias])
```

**executeNameMapping 정본**:
1. **RAW 로드**: 이전 file_import step_run 의 `anomalies[raw_summary].raw_rows_full` 취득.
2. **distinct 이름 추출**: NAME_COLS_LOWER (name/nama/사원명/user_name) 컬럼 스캔.
3. **store 사전 로드** (`Promise.all`):
   - staff_master (pos_name 정규화).
   - user (full_name/name 정규화).
   - pos_name_alias (별칭 사전).
4. **매칭 우선순위**:
   - `alias.pos_name_normalized` → 재사용 (`alias_hit++`).
   - `staff_master.pos_name` → 자동 매칭 (`auto_matched++`).
   - `user.full_name` → 자동 매칭.
   - `user.name` → 자동 매칭.
   - 실패 → `unmapped_names[]` push.
5. **anomalies 요약**: `{id:'name_match_summary', distinct_names, alias_hit, auto_matched, unmapped, unmapped_names}`.

**controller 배선** (`attendance-minors.controller.ts:60~72`):
- `store_id: user.storeId` 를 svc 로 전달.

**결과 시각화** (Kyu 정본 §7 준수 · 신규 테이블 강제 X):
- `web-admin/src/pages/payroll/pcon-view/PconAttendanceLeft.tsx:190~225` · 매핑 요약 카드 + 미매핑 리스트.
- RAW 는 그대로 유지 (오염 없음 · append-only 정신).

## [DOC] 2사분면 시각화 원칙 편입

**Kyu 08-07 정본** (docs/design/pcon-engine-v1.md §7.시각화-원칙):
> 마이너마다 새 테이블 강제 아님. 단계가 처리한 데이터에 맞게 신규 테이블 추가 or 기존 테이블 업데이트 — **단계에 맞는 데이터 처리 시각화가 본질**.

**적용 지침**:
1. file_import = 신규 RAW 테이블 (엑셀 컬럼 · 페이지네이션 · 전량).
2. name_mapping = 매핑 요약 카드 + 미매핑 리스트 (신규 테이블 X · 기존 RAW 오염 X).
3. data_cleanup = 정리본 테이블 (T0 재량).
4. aggregate = 최종 집계 테이블.

**금지**:
- 무조건 새 테이블 스택 (Kyu 게이트⑬ 결함 재발).
- RAW 파괴적 덮어씀 (append-only 위배).

## 회귀

- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Frontend TS**: `npx tsc -b --noEmit` = EXIT 0.
- **Vitest**: 24 files · **341 pass** · 17 skip.
- **Jest (pcon-adapter)**: 7 pass (file period parser).
- **Lint**: EXIT 0.
- **lint:hooks**: EXIT 0 (J-1 · useState 조기 return 앞으로 이동 · Hooks rule 준수).
- **npm 고정** · **포트 backend:4000/admin:4173 무변경**.

## 대본 재현 (Kyu 재실기 대비)

**초기화 → 5월 IMPORT → RAW 전량 → 아코디언 접힘 → name_mapping**:

1. `[data-testid=pcon-reset-run]` 클릭 · confirm → POST `/reset` → 신규 run · logs=[] · uploadResult=null.
2. IMPORT 5월 파일 (01-05-2026-31-05-2026.xlsx) → **정파싱** → duplicate_prompt 부재 (신규 run · 이전 checksum 격리).
3. **file_import DONE**:
   - `[data-testid=pcon-aggregate-card-attendance_import.file_import]` = "INPUT 엑셀 518건 → OUTPUT 518행" (실 수치 · 검증실패 0).
   - `[data-testid=pcon-raw-table]` 존재 · `data-total-rows=518`.
   - `[data-testid=pcon-raw-pagination]` 존재 · 페이지 1/11 (50 per page).
   - `[data-testid=pcon-step-attendance_import.file_import-accordion][data-expanded=false]` **자동 접힘 성공**.
4. `[data-testid=pcon-raw-page-next]` 클릭 → 51~100 행 렌더.
5. name_mapping 카드 실행 클릭 → POST `/name-mapping`:
   - `[data-testid=pcon-result-attendance_import.name_mapping]` 존재.
   - `[data-testid=pcon-aggregate-card-attendance_import.name_mapping]` = "INPUT 20건 → OUTPUT 18건 매핑 (auto 15 · alias 3 · 미매핑 2)".
   - `[data-testid=pcon-name-mapping-unmapped]` 존재 (2건 미매핑 이름 리스트).
6. name_mapping DONE → 아코디언 **자동 접힘 성공**.

## 이연 순증감

**본 라운드 (T0-0807-J) 순증**:
- **Backend** 3개 파일:
  - `pcon-engine.service.ts` (input_count 파라미터 확장).
  - `attendance-file-import.service.ts` (POS 헤더 정파싱 · raw_rows_full 저장).
  - `attendance-minors.service.ts` (name_mapping 실 도메인 · staff/user/alias 배선).
  - `pcon-adapter.module.ts` (TypeOrmModule.forFeature 편입).
  - `attendance-minors.controller.ts` (store_id 배선).
- **Frontend** 2개 파일:
  - `PconAttendanceContext.tsx` (auto-collapse useEffect).
  - `PconAttendanceLeft.tsx` (RAW 전량 페이지네이션 + name_mapping 요약 카드).
- **문서**: `pcon-engine-v1.md` §7 시각화 원칙 편입 + §6.구현-J.
- **리포트**: relay `t0/T0-0807-J-report.md` (I 청소 · J 게시).

**본 라운드 (T0-0807-J) 순감**:
- Backend: name_mapping stub 삭제 (실 로직으로 교체 ~30 lines).
- Frontend: `sample_first_3` 소비 코드 (전량 렌더로 교체).

**이연 (G+5 · 2탄)**:
- `data_cleanup` 실 로직 (RAW → 세션 페어링).
- `aggregate` 실 로직 (사용자당 급여 항목 집계).
- alias 자동 승격 (V-2-4 admin_confirmed).
- G+6: flag 제거 + 구 코드 (`pos-import.service.ts` 등) 삭제.

## [요약]

- **J-1** completion: `useEffect` 로 ANY→DONE 전이 시 manualExpanded[path] 삭제 → 정본 auto-collapse 회복.
- **J-2** completion: `sheet_to_json({header:1}) + findHeaderRow` → POS 메타 행 격리 · 실 컬럼명 · WARN 518/518 소멸. RAW 전량 페이지네이션 (50 per page).
- **J-3** completion: alias > staff_master > user 우선순위 매칭 · unmapped_names 저장. store_id · TypeOrmModule 배선.
- **[DOC]** 시각화 원칙 §7 편입 · 신규 테이블 강제 X.
- **회귀**: TS 0 (backend + frontend) · Lint 0 · lint:hooks 0 · Vitest 341 pass · Jest 7 pass.
- **커밋**: T0-0807-J (본 커밋 SHA).
