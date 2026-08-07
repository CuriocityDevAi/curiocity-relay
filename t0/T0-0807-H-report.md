# T0-0807-H · 리포트 (게이트⑯ 3차 · 페이지 레벨 사분면 정합)

## 스코프

Kyu 게이트⑯ 3차: 크래시 ✓ · 4카드 ✓. 잔여 = 배치 페이지 레벨 정합.

**결함**: 마이너 카드 뭉치가 본문 (2사분면 옆) 에 렌더 · 페이지 우측 레일 (3사분면 · 구 콘솔 자리) 공백 (강제초기화만 남음).

## H-1a · View를 Left/Rail 2 컴포넌트로 분리 (Context 공유)

**뿌리**: 기존 `PconAttendanceImportView` = 하나의 컴포넌트로 grid 내부 배치. 페이지 레벨 (canvas + rail 두 슬롯) 로 분리 불가.

**Fix**: Context Provider 로 상태 공유 · Left/Rail 2 컴포넌트로 분리 (mount 1회 · API duplicate 방지).

**신설 파일**:
| 파일 | 역할 |
|---|---|
| `web-admin/src/pages/payroll/pcon-view/PconAttendanceContext.tsx` | Provider (state · loadState · polling · executeMinor · toggleCard) + `usePconAttendance` hook · 391 lines |
| `web-admin/src/pages/payroll/pcon-view/PconAttendanceLeft.tsx` | 본문 · 2사분면 · 결과 스택 전용 · 169 lines |
| `web-admin/src/pages/payroll/pcon-view/PconAttendanceRail.tsx` | 우측 레일 · 3사분면 · 브레드크럼 + 4 마이너 카드 + 아코디언 · 315 lines |

**재작성**: `PconAttendanceImportView.tsx` → backward-compat wrapper (Provider + Left + Rail 조합 · 45 lines · smoke test 유지용).

## H-1b · PayrollRunPage 우측 레일에 콘솔 배치

**파일:줄 변경** (`web-admin/src/pages/payroll/PayrollRunPage.tsx`):

| 위치 | 변경 |
|---|---|
| :100~106 | import 3 개 (Provider · Left · Rail) |
| :767~773 | canvas branch = `<PconAttendanceLeft />` (기존 `<PconAttendanceImportView>` 대신) |
| :1141~1145 | rail 슬롯 = flag on 시 `<PconAttendanceRail />` (구 ProcessConsolePanelV2 위치) |
| :1415~1435 | RunShell 을 Provider 로 wrap (flag on + attendance_import) |

**flag off**: 기존 그대로 (병행 · Kyu 스코프 준수).

**flag on**:
- 본문 (canvas) = **Left** (결과 스택 전용).
- 우측 레일 (rail) = **Rail** (브레드크럼 + 4 카드 + 아코디언).
- Provider 최외곽에서 state 공유 (mount 1회).

## H-1c · smoke test 갱신 (배치 지표)

**신 테스트** (`PconAttendanceImportView.smoke.test.tsx` · 5th test):

```
- Left 슬롯 (data-testid=pcon-attendance-left) 존재.
- Rail 슬롯 (data-testid=pcon-attendance-rail) 존재.
- 4 마이너 카드 = Rail 내부에만 존재 (rail.contains(card) === true).
- 4 마이너 카드 = Left 내부에는 부재 (left.contains(card) === false).
- 브레드크럼 = Rail 안 (data-testid=pcon-attendance-breadcrumb).
- 통합 콘솔 (pcon-console-feed) 부재.
```

**Vitest**: 5/5 pass (기존 4 + H 신규 1).

## 회귀

- **Frontend TS**: `npx tsc --noEmit` = EXIT 0.
- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Vitest**: 24 files · **341 pass** · 17 skip (G 340 + H smoke 5th test 1).
- **Lint**: `npm run lint` = EXIT 0.
- **lint:hooks**: `npm run lint:hooks` = EXIT 0.
- **npm 고정** · **포트 backend:4000/admin:4173 무변경**.

## 실 DOM 지표 (Kyu 재실기 대비)

| 대본 | 실 DOM 지표 |
|---|---|
| 본문 = 결과 스택 전용 | `[data-testid=pcon-attendance-left]` 존재 · `[data-testid=pcon-results-empty]` (초기) or `[data-testid=pcon-result-*]` (DONE 후) |
| 우측 레일 = 브레드크럼 + 4 카드 | `[data-testid=pcon-attendance-rail]` 존재 · `[data-testid=pcon-attendance-breadcrumb]` 안 4 마이너 |
| 4 카드 = Rail 안에만 · Left 부재 | `document.querySelector('[data-testid=pcon-attendance-rail]').contains(document.querySelector('[data-testid=pcon-step-attendance_import.file_import]')) === true` · Left 는 false |
| 통합 콘솔 부재 | `document.querySelector('[data-testid=pcon-console-feed]') === null` |
| flag off = 기존 그대로 | `[data-testid=process-console-v2-*]` 존재 · `[data-testid=pcon-attendance-rail]` 부재 |

## 이연 순증감

**본 라운드 (T0-0807-H) 순증**:
- 신설: `pcon-view/PconAttendanceContext.tsx` · `PconAttendanceLeft.tsx` · `PconAttendanceRail.tsx` (3 파일 · 총 875 lines).
- 재작성: `PconAttendanceImportView.tsx` (700 → 45 lines · wrapper).
- 수정: `PayrollRunPage.tsx` (canvas + rail + Provider wrap).
- 문서: `pcon-engine-v1.md` §6.구현-H 절.
- 테스트: smoke test 5th 케이스 (배치 지표).
- 리포트: `curiocity-relay/t0/T0-0807-H-report.md` (G 청소 · H 게시).

**본 라운드 (T0-0807-H) 순감**:
- 기존 View 내부 grid layout 해체 (좌우 분리로 흡수).

**이연 (G+5)**:
- 3 마이너 실 도메인 로직 (stub → 실 배선).
- 진짜 RAW 전량 렌더 (샘플 → 페이지네이션).
- 데이터 정리본 · 집계표 실 데이터.
- 기존 코드 삭제 (G+6 · flag 제거).

## [요약]

- **H-1a**: Context Provider 로 상태 공유 · Left/Rail 2 컴포넌트로 분리 (신설 3 파일 · 875 lines).
- **H-1b**: PayrollRunPage 페이지 레벨 배치 · canvas = Left · rail 슬롯 = Rail · Provider 최외곽. flag off 병행 유지.
- **H-1c**: smoke test 배치 지표 갱신 · Rail contains card / Left NOT contains card 확증.
- **회귀**: TS 0 · Lint 0 · Vitest 24 files 341 pass 17 skip.
- **커밋**: T0-0807-H (본 커밋 SHA).
