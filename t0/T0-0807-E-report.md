# T0-0807-E · 리포트 (마이너 수동 · 결과 테이블 · 화면출력 삭제 · 혼재 종식)

## 스코프

Kyu D 실기 판정 3 이슈 회부:
- IMPORT 1회에 4단계 한방 DONE (수동 위반).
- 화면출력 마이너 잔존.
- 결과 테이블 미렌더.
+ 구/신 화면 혼재 (콘솔·브레드크럼 구 컴포넌트).

**Kyu 판정 = (a) 마이너 단위 수동**.

## E-1 · 마이너 단위 수동 실행 (뿌리 fix)

**Backend 파일**:
- **축소**: `attendance-file-import.service.ts` · 기존 pos-import.importXls 통째 위임 탈피 · 파일 파싱 + 검증만. RAW row 배열 진짜 저장 (anomalies.sample_first_3 · XLSX.utils.sheet_to_json). 매핑·정리·집계 안 함.
- **신설**: `attendance-minors.service.ts` (280 lines) · executeNameMapping · executeDataCleanup · executeAggregate 3 method. requirePreviousDone 게이팅 (BadRequestException).
- **신설**: `attendance-minors.controller.ts` · POST /api/admin/pcon/attendance/{name-mapping | data-cleanup | aggregate}.
- **module 갱신**: PosImportModule 종속 제거 · minors service 등록.

**Frontend API**:
- `pcon-engine.ts:runNameMappingPcon` · `runDataCleanupPcon` · `runAggregatePcon` 3 신설.

**실 로직 상태 (본 라운드)**:
- file_import = 실 파일 파싱 (XLSX) · 진짜 RAW row 배열 저장.
- name_mapping · data_cleanup · aggregate = **stub** (log emit + 카운트만 · 실 도메인 로직 = G+5 라운드).

이유: Kyu 명시 = 스코프 밖. 각 마이너 실 로직 (별칭 매칭 · 세션 페어링 · 집계 계산) 은 pos-import·name-match·calculation 서비스 이식이 필요 · 큰 스코프. 본 라운드는 **수동 순차 실행 프레임**만 완결.

## E-2 · 결과 테이블 렌더 (3 종)

**PconAttendanceImportView.tsx 확장**:
- ① file_import DONE 후 = 진짜 RAW 테이블 (`pcon-raw-table` · 샘플 3행 · 엑셀 컬럼 그대로 헤더) + 집계카드 "INPUT 엑셀 N → OUTPUT N행".
- ② name_mapping DONE 후 = 집계카드 "INPUT N → OUTPUT M매칭".
- ③ data_cleanup DONE 후 = 정리본 placeholder + 집계카드 "INPUT 정상 M → OUTPUT (paired) 행".
- ④ aggregate DONE 후 = 집계표 placeholder + 집계카드 "INPUT 정리본 → OUTPUT N명".
- 각 결과 = 해당 마이너 DONE 시에만 조건부 렌더 (파생 기반 · 아래로 밀며 등장 · space-y-3).

## E-3 · 화면출력 마이너 완전 삭제 확증

- **seed** (`1700000000264-SeedPconAttendanceStepDefs.ts`): 4 마이너만 (file_import · name_mapping · data_cleanup · aggregate). screen_output 부재 (T0-0807-A 시점부터 이미 정리).
- **UI** (`PconAttendanceImportView.tsx:minorList`): 4 마이너만.
- **문서** (§3 정본): 4 마이너 · "화면출력 삭제" 명시.

## E-4 · 혼재 종식 (flag on 시 구 컴포넌트 미렌더)

**PayrollRunPage.tsx 조건부 렌더**:
- `MajorMinorBreadcrumb` (:1053~1097) → `{!pconEngineEnabled && (<>...</>)}` 로 감쌈. flag on 시 신 브레드크럼 (`payroll-run-major-tabs-pcon`) 만 노출 · 4 stage 탭.
- `ProcessConsolePanelV2` (:1137~1274) → `{!pconEngineEnabled && (<ProcessConsolePanelV2 ... />)}` 조건부. flag on 시 신 콘솔 (PconAttendanceImportView 안 `pcon-console-feed`) 만 담당.
- flag off (구 경로) = 기존 병행 유지.

## 회귀

- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Frontend TS**: `npx tsc --noEmit` = EXIT 0.
- **Vitest**: 23 files · **336 pass** · 17 skip (T0-0807-D 유지 · 신규 UI = unit test 대상 아님).
- **Lint**: `npm run lint` = EXIT 0.
- **npm 고정** · **포트 backend:4000/admin:4173 무변경**.

## 대본 ①~④ 실 DOM 지표 자체 재현

| 대본 | 실 DOM 지표 | 파일:줄 근거 |
|---|---|---|
| ① IMPORT 실행 (file_import 만 · 나머지 잠금) | `[data-testid=pcon-step-attendance_import.file_import][data-status=DONE]` · `[data-testid=pcon-step-attendance_import.name_mapping][data-gated=false][data-primary=true]` · data_cleanup/aggregate `data-gated=true` | PconAttendanceImportView.tsx:397~416 (breadcrumb) · 425~529 (minor 카드) |
| 각 마이너 실행 버튼 순차 활성 | `[data-testid=pcon-step-{path}-execute]` disabled=(gated OR busy) · primary 시 animate-pulse | PconAttendanceImportView.tsx:472~503 |
| ② name_mapping 실행 후 | name_mapping DONE · data_cleanup primary=true | Backend requirePreviousDone (attendance-minors.service.ts:45~55) |
| ③ data_cleanup 실행 후 | `[data-testid=pcon-result-attendance_import.data_cleanup]` DOM · placeholder 텍스트 | PconAttendanceImportView.tsx:583~605 |
| ④ aggregate 실행 후 | `[data-testid=pcon-result-attendance_import.aggregate]` DOM | PconAttendanceImportView.tsx:607~629 |
| 각 결과 테이블 등장 순서 | file_import result → name_mapping result → data_cleanup result → aggregate result (DOM order) | PconAttendanceImportView.tsx:555~629 |
| 화면출력 부재 | `document.querySelector('[data-testid$=screen_output]')` = null | minorList 4 마이너 확증 (line 337~342) |
| 콘솔 파생 확인 | `[data-testid=pcon-console-feed]` 존재 · `[data-testid^=pcon-log-]` 순차 · `[data-testid$=-timestamp]` HH:MM:SS | PconAttendanceImportView.tsx:632~666 |
| 구 컴포넌트 부재 (flag on) | `[data-testid=major-minor-breadcrumb]` = null · `[data-testid=process-console-v2-*]` = null | PayrollRunPage.tsx:1053·1137 conditional (flag on 시 미렌더) |

**Kyu 실기 절차 (게이트⑮)**:
1. `/payroll/run?use_pcon_engine=1` 진입 · 신 브레드크럼 4 마이너 · file_import primary/pulse · 나머지 gated.
2. IMPORT 실행 (5월 파일) → file_import DONE · 진짜 RAW 테이블 (샘플 3행 · 엑셀 그대로) · 로그 4~7줄.
3. name_mapping [실행] 클릭 → DONE · 집계카드.
4. data_cleanup [실행] 클릭 → DONE · placeholder.
5. aggregate [실행] 클릭 → DONE · placeholder.
6. 각 로그 timestamp HH:MM:SS 선행 · 순차 도착 확증.
7. 구 브레드크럼/콘솔 미노출 확증 (devtools querySelector).

## 이연 순증감

**순증**:
- Backend 신설 2: `attendance-minors.service.ts` (280 lines) · `attendance-minors.controller.ts` (65 lines).
- Backend 수정: `attendance-file-import.service.ts` (축소 · pos-import 위임 제거 · XLSX 직접 파싱) · `pcon-adapter.module.ts` (PosImportModule 제거 · minors 등록).
- Frontend 확장: `PconAttendanceImportView.tsx` (415 → 700 lines · 4 마이너 카드 · 결과 테이블 3 · 신 브레드크럼).
- Frontend API: `pcon-engine.ts` +3 함수.
- PayrollRunPage.tsx: E-4 조건부 렌더 (신 브레드크럼 + Panel 감싸기).
- 문서: pcon-engine-v1.md §6.구현-E 절.
- 리포트: curiocity-relay/t0/T0-0807-E-report.md (D 청소 · E 게시).

**순감**:
- Backend `attendance-file-import.service.ts` 안 pos-import.importXls 위임 제거 (~40 lines).

**이연 (G+5)**:
- 3 마이너 실 도메인 로직 (name_mapping · data_cleanup · aggregate) · stub 대체.
- 진짜 RAW 테이블 전량 렌더 (샘플 3행 → 페이지네이션).
- 데이터 정리본 · 집계표 실 렌더 (placeholder → 데이터).
- 기존 코드 삭제 (G+6 · flag 제거).
- OT/Finalize/Payslip Dispatch (G+7+).

## [요약]

- **E-1**: 4 마이너 각각 endpoint · 수동 실행 · file_import 축소 (기존 pos-import 통째 위임 탈피 · XLSX 직접 파싱) · 3 minors stub service · 게이팅 (requirePreviousDone).
- **E-2**: 결과 테이블 3 종 · 각 마이너 DONE 시 조건부 노출 · 진짜 RAW 샘플 · placeholder (실 렌더 G+5).
- **E-3**: 화면출력 마이너 완전 삭제 확증 (seed · UI · 문서 4 마이너만).
- **E-4**: 혼재 종식 · flag on 시 MajorMinorBreadcrumb + ProcessConsolePanelV2 미렌더 · 신 엔진 브레드크럼 + 콘솔만 노출. flag off = 기존 병행.
- **회귀**: TS 0 (backend + frontend) · Lint 0 · Vitest 336 pass 17 skip.
- **커밋**: T0-0807-E (본 커밋 SHA).
