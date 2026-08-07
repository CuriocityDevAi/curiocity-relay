# T0-0807-D · 리포트 (엔진 4탄 · UI 배선 · 첫 실 브라우저 실기 대상)

## 스코프

Kyu D 라운드 = C의 백엔드/API/커서를 실제 화면에 배선.

- **flag `use_pcon_engine=1`** 시 신 엔진 경로가 렌더.
- **기존 화면 병행** (flag off 시 구 경로 무변경 · Kyu 스코프 준수).
- **이번이 첫 실 브라우저 실기 대상** — 대본 ①~⑤ 판정 정본.

## D-1 · file_import 카드 (신 경로)

**신설 파일**: `web-admin/src/pages/payroll/pcon-view/PconAttendanceImportView.tsx` (415 lines).

**핵심 계약**:
- **상태 파생만** (정본 §1.1): `getPconState` → `adaptDefs/adaptStepRuns` → `deriveScreen`. 화면 자체 상태 계산 금지.
- **초기 렌더**: file_import READY · IMPORT 버튼만 활성 · 2사분면 공백. name_mapping~aggregate = 파생 gated · 물리 disabled.
- **로그 폴링 + 재생 커서** (Kyu 대본 ⑤): `getPconLogs?since_log_id=<cursor>` · 커서 이후 log 만 fetch · `saveCursor` 갱신.

## D-2 · 대본 ①~⑤ 실 브라우저 (백엔드 → UI)

**진입 조건**: `/payroll/run?use_pcon_engine=1`.

### 실 DOM 지표 (D-3 규율 · jsdom 단독 금지 · Kyu 실기 확증 대비)

**① 진입 · file_import READY · 2사분면 공백**:
```
document.querySelector('[data-testid="pcon-attendance-view"][data-pcon-engine="true"]')  // 신 경로 렌더 확증
document.querySelector('[data-testid="pcon-step-file_import"][data-status="READY"][data-gated="false"][data-primary="true"]')  // file_import 만 활성
document.querySelector('[data-testid="pcon-step-file_import-result"]') === null  // 2사분면 공백
document.querySelector('[data-testid="pcon-console-empty"]')  // 콘솔 로그 0
document.querySelectorAll('[data-testid^="pcon-log-"]').length === 0
```
파일:줄: `PconAttendanceImportView.tsx:246~277` (file_import 카드) · `353~369` (콘솔 empty).

**② 6월 파일 → 5월 Run FAILED**:
```
[data-testid="pcon-step-file_import"][data-status="FAILED"]      // 붉은 카드
[data-testid="pcon-step-file_import-failed"]                      // 실패 상세 카드
[data-testid="pcon-error-file_period_matches_run_month"]          // 사유 텍스트
  → "파일 기간이 Run 대상월과 일치하지 않습니다: 2026-06 vs 2026-05"
[data-testid="pcon-step-file_import-result"] === null             // RAW 미표시 (진짜 RAW 봉쇄 확증)
[data-testid="pcon-step-attendance_import.name_mapping"][data-gated="true"]  // 후속 잠금
```
파일:줄: `PconAttendanceImportView.tsx:284~309` (FAILED 카드).

Backend 봉쇄 (T0-0807-C): `attendance-file-import.service.ts` · filePeriod !== scope_key → errors → step FAILED · **pos-import.importXls 위임 봉쇄** = RAW 미삽입.

**③ 5월 파일 성공 · pcon_log 재생 · Pacer · 타임스탬프 선행 · 집계카드**:
```
[data-testid="pcon-step-file_import"][data-status="DONE"]
[data-testid="pcon-step-file_import-result"]                            // 2사분면 노출
[data-testid="pcon-step-file_import-aggregate-card"] 텍스트
  → "INPUT 엑셀 N건 → OUTPUT M건 INSERT · 정상 x · WARN y"
document.querySelectorAll('[data-testid^="pcon-log-"]').length > 0      // 로그 순차 도착
[data-testid^="pcon-log-"] 안 첫 span [data-testid$="-timestamp"]        // HH:MM:SS 타임스탬프 선행
```
파일:줄: `PconAttendanceImportView.tsx:342~365` (집계카드) · `379~395` (콘솔 · timestamp 선행 렌더).

**④ 동일 파일 재업로드 · Y/N 카드 (FAILED 아님)**:
```
[data-testid="pcon-step-file_import"][data-status="IN_PROGRESS"]        // FAILED 아님 유지
[data-testid="pcon-step-file_import-user-choice"]                       // Y/N 카드
[data-testid="pcon-step-file_import-duplicate-proceed"]                 // Y 버튼
[data-testid="pcon-step-file_import-duplicate-cancel"]                  // N 버튼
```
파일:줄: `PconAttendanceImportView.tsx:311~344` (USER_CHOICE 카드).

**⑤ 탭 왕복 · 새 로그 줄만 · 데이터 불변**:
```
localStorage.getItem('pcon:cursor:payroll_run:2026-05:1')               // 커서 값 존재
GET /api/admin/pcon/logs?run_id=<>&since_log_id=<cursor>                // 커서 이후만
[data-testid="pcon-console-feed"] log line count 불변 (기존 유지 · 새 로그 추가만)
[data-testid="pcon-log-<id>"][data-new="true"]                          // 커서 이후 = 신규 표시
```
파일:줄: `PconAttendanceImportView.tsx:143~192` (polling + saveCursor/loadCursor).

## D-3 · 위치 안내 표준

**파일:줄**: `PconAttendanceImportView.tsx:279~281`.

```
"우측 CONSOLE 에서 [파일 Import] 실행 로그를 확인하세요."
```

IMPORT 버튼 title 도 동일 · 사용자가 어디 눌러야 하는지 명시.

## 스코프 준수 확증

- **⛔ name_mapping 이후 마이너 실행** = G+4 (본 라운드 = READY 잠금 표시만).
  - `PconAttendanceImportView.tsx:390~416` · `pcon-attendance-minors-gated` section · 각 마이너 `data-gated="true"` 표시.
- **⛔ 상단 요약 한 줄·집계카드 표준 문구** = file_import 범위만.
- **기존 화면 대수술 0**: flag off 시 기존 경로 (AttendanceImportPanel · SummarySection · ProcessConsolePanelV2 · MajorMinorBreadcrumb) 그대로. PayrollRunPage.tsx 단 4 line 삽입 (flag 분기 · line 767~770).

## 회귀

- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Frontend TS**: `npx tsc --noEmit` = EXIT 0.
- **Vitest**: 23 files · **336 pass** · 17 skip (T0-0807-C 336 유지 · UI 신설은 unit test 대상 아님 · 실 DOM = Kyu 실기).
- **Lint**: `npm run lint` = EXIT 0.
- **npm 고정** · **포트 backend:4000/admin:4173 무변경**.
- **types.ts 확장**: `id: number | bigint | string` (backend BIGINT serialization 대응 · 파생 로직 무영향 · 20 test 여전히 pass).

## 이연 순증감

**본 라운드 (T0-0807-D) 순증**:
- 신설 파일 1: `web-admin/src/pages/payroll/pcon-view/PconAttendanceImportView.tsx` (~415 lines).
- 수정 파일 2: `PayrollRunPage.tsx` (+7 lines · import + flag + 분기) · `lib/pcon-core/types.ts` (id 타입 확장 · string 추가).
- 문서: `pcon-engine-v1.md` §6.구현-D 절 (실 DOM 지표 + 파일:줄 근거).
- 리포트: `curiocity-relay/t0/T0-0807-D-report.md` (본 · C 청소 후 게시).

**본 라운드 (T0-0807-D) 순감**: 없음.

**이연 (G+4 다음 라운드)**:
- **진짜 RAW 테이블 렌더**: file_import DONE 후 pos-import summary API 재사용 or step_run.output 별도 fetch → 엑셀 그대로 테이블 렌더.
- **name_mapping · data_cleanup · aggregate 마이너 실 실행**: adapter service 4개 + UI card + 진행 log emit.
- **기존 코드 삭제 계획** (G+5): flag 제거 · pcon-engine 단일 경로.
- **OT/Finalize/Payslip Dispatch 실 실행** (G+6+): 선언은 이미 seed (T0-0807-A) · 미배선.

## [요약]

- **D-1**: `PconAttendanceImportView` 신설 · deriveScreen 파생 렌더 · 화면 자체 상태 계산 금지 (정본 §1.1). file_import 카드 + 로그 폴링 + 재생 커서 (localStorage · Kyu 대본 ⑤).
- **D-2**: PayrollRunPage flag 분기 (attendance_import branch · use_pcon_engine=1 시 신 경로 · off 시 기존 병행 · 4 line 삽입 · 대수술 없음).
- **D-3**: 위치 안내 표준 · "우측 CONSOLE 에서 [파일 Import] 실행 로그를 확인하세요".
- 실 DOM 지표 5개 대본 항목 모두 명세 (Kyu 실기 대비 · D-3 규율 준수).
- **회귀**: TS 0 (backend + frontend) · Lint 0 · Vitest 23 files 336 pass 17 skip (신규 fail 0).
- **커밋**: T0-0807-D (본 커밋 SHA).
