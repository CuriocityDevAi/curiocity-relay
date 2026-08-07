# T0-0807-G · 리포트 (게이트⑯ 크래시 · 훅 순서 위반 수리 + 재발 방지 제도화)

## 스코프

Kyu 게이트⑯ 2차 실기 FAIL · 신 화면 자체 크래시 · 실기 불가.

**증거** (Kyu 콘솔):
- React "Rendered more hooks than during the previous render"
- `PconAttendanceImportView.tsx:396`
- PageErrorBoundary 발동
- 훅 테이블 30번째 undefined→useMemo (조건부 훅 확증)
- **F-2 재배치가 도입한 결함**

## G-1 · 훅 순서 위반 수리

**뿌리 실측**:

파일:줄 = `web-admin/src/pages/payroll/pcon-view/PconAttendanceImportView.tsx`.

```
:362~371  if (loading) return <Loading />;   ← early return (조건부 skip)
...
:396      const logsByStepRunId = useMemo(...);   ← 훅 30번째 (조건부 호출)
:406      const logsForMinor = useCallback(...);  ← 훅 31번째 (조건부 호출)
```

**결함 시나리오**:
- 첫 렌더 (loading=true) = early return · 훅 30 개 호출.
- 다음 렌더 (loading=false) = early return skip · 훅 32 개 호출.
- React 훅 순서 규칙 위반 → **"Rendered more hooks than during the previous render"** → PageErrorBoundary.

**Fix**: `useMemo` + `useCallback` 을 early return **위로 이동** (모든 훅 = 무조건 호출 · 최상단).

**파일:줄 신 위치**:
- `PconAttendanceImportView.tsx:363~382` · 2 훅 (logsByStepRunId · logsForMinor).
- `:384~394` · early return (`if (loading) return`).

## G-2 · 재발 방지 제도화

### G-2a · eslint react-hooks/rules-of-hooks = error 강제

**Kyu 명시 근거**: "lint 통과했는데 크래시 = 규칙 미적용 확증".

**변경 파일**:
- `web-admin/package.json:37` · devDep `eslint-plugin-react-hooks@^7.1.1` 추가.
- `web-admin/package.json:14` · npm script `lint:hooks` 신설.
  - `eslint 'src/**/*.{ts,tsx}' --quiet` (errors 만 · warnings 무시).
- `web-admin/eslint.config.js:11·12~40` · 플러그인 import + config block.
  - `files: 'src/**/*.{ts,tsx}'` · `ignores: 테스트 파일`.
  - `rules: { 'react-hooks/rules-of-hooks': 'error' }`.
  - `exhaustive-deps` = off (회귀 위험 · 후속 확장 예약).

**검증 결과**:
```
$ npm run lint:hooks
> eslint 'src/**/*.{ts,tsx}' --quiet
(EXIT 0)
```

**전 파일 위반 = 0** (G-1 fix 후). 재발 검출 인프라 완비.

### G-2b · Mount smoke test 신설

**신설 파일**: `web-admin/src/pages/payroll/pcon-view/__tests__/PconAttendanceImportView.smoke.test.tsx` (150 lines · 4 tests · 100% pass).

**시나리오**:
1. **mount → 크래시 0** (훅 순서 위반 검출) · loading=false 전환 후 실 view 렌더 확증.
   - React 는 훅 순서 위반 시 render 시 throw · render 성공 = 훅 정합.
2. **mount → 4 마이너 카드 모두 렌더**.
3. **mount → 통합 콘솔 (pcon-console-feed) 부재 확증** (F-2 배치 정합).
4. **mount → file_import 만 primary · 나머지 gated** (파생 게이팅 확증).

**Vitest 결과**:
```
✓ src/pages/payroll/pcon-view/__tests__/PconAttendanceImportView.smoke.test.tsx (4 tests) 54ms
Test Files  1 passed (1)
     Tests  4 passed (4)
```

**규칙 (정본 §5.3 · G-2b)**: 신 UI 컴포넌트 = 이 형식 mount smoke test 필수. "렌더 0회 출하" 재발 차단.

## 회귀

- **Frontend TS**: `npx tsc --noEmit` = EXIT 0.
- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Vitest**: 24 files · **340 pass** · 17 skip (T0-0807-F 336 + G smoke 4).
- **Lint (기존 · run-ui)**: `npm run lint` = EXIT 0.
- **lint:hooks (신규 · 전 파일)**: `npm run lint:hooks` = EXIT 0.
- **npm 고정** · **포트 backend:4000/admin:4173 무변경**.

## 크래시 재현→수리 근거

**Before (G-1 fix 전)**:
- Kyu 실 브라우저 · `/payroll/run?use_pcon_engine=1` 진입.
- React DevTools · 훅 리스트 30번째 = undefined (조건부 useMemo).
- 콘솔 에러 "Rendered more hooks than during the previous render".
- PageErrorBoundary "죄송합니다..." 노출.
- **실기 불가**.

**After (G-1 fix 후)**:
- 파일:줄 이동: `useMemo`/`useCallback` (line 396·406) → early return (line 371) **위로 이동** (신 line 363~382).
- 모든 훅 = 무조건 호출 · 첫 렌더 이후 훅 개수 불변.
- Vitest mount smoke test 4/4 pass · render 크래시 0.
- `npm run lint:hooks` = 0 errors · 재발 검출 인프라 완비.

## 이연 순증감

**본 라운드 (T0-0807-G) 순증**:
- 코드: `PconAttendanceImportView.tsx` · 훅 순서 재배치 (~20 lines 이동).
- 코드: `eslint.config.js` · react-hooks 규칙 신설 (~30 lines).
- 코드: `package.json` · 신 script + devDep.
- 테스트: `PconAttendanceImportView.smoke.test.tsx` (150 lines · 4 tests).
- 문서: `pcon-engine-v1.md` §5.3 mount smoke 의무 + §6.구현-G 절.
- 리포트: `curiocity-relay/t0/T0-0807-G-report.md` (F 청소 · G 게시).

**본 라운드 (T0-0807-G) 순감**: 없음.

**이연 (G+5)**:
- 3 마이너 실 도메인 로직 (name_mapping · data_cleanup · aggregate stub → 실 배선).
- 진짜 RAW 전량 렌더 (샘플 → 페이지네이션).
- 데이터 정리본 · 집계표 실 데이터.
- 기존 코드 삭제 (G+6 · flag 제거).

## [요약]

- **G-1**: 훅 순서 위반 뿌리 특정 (PconAttendanceImportView.tsx:362~406 · early return 뒤 useMemo/useCallback) · fix (훅 최상단 무조건 호출로 이동).
- **G-2a**: eslint-plugin-react-hooks 도입 · `rules-of-hooks: error` 전 파일 강제 · `lint:hooks` npm script · 재발 검출 인프라 완비 (0 errors 확증).
- **G-2b**: PconAttendanceImportView mount smoke test 4 tests · render 크래시 즉시 검출 · "렌더 0회 출하" 재발 차단. 규칙 = 신 UI 컴포넌트 필수.
- **회귀**: TS 0 · Lint 0 · lint:hooks 0 errors · Vitest 24 files 340 pass 17 skip.
- **커밋**: T0-0807-G (본 커밋 SHA).
