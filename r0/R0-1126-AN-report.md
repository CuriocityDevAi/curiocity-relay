#275 APPROVE
#277 APPROVE (SELL-PRODUCT-SHEET-IMG fits 단언 0×0 주의 사항 포함)

---

## 사전 작업 (REQ 0)

- `git fetch origin` 완료
- 포트 4321: 미사용 (playwright webServer가 자동 시작)
- 포트 8081: expo dev server 실행 중
- `npx expo export -p web` → dist/ 빌드 완료 (PR #275 worktree /tmp/pr275-wt, PR #277 worktree /tmp/pr277-wt)

---

## #275 — fix(cd-preview): M3-1126-I V4-9 로딩전환·X버튼·드래그 수정

### 판정: APPROVE

### e2e 9/9 로컬 직접 실행

```
npx playwright test e2e/flows/cd-preview.spec.ts
Running 9 tests using 1 worker

✓  1 CD Preview R1 › badge button visible at 1024w        (1.1s)
✓  2 CD Preview R1 › window opens on button press         (954ms)
✓  3 CD Preview R1 › window closes on second button press (932ms)
✓  4 CD Preview R1 › badge button visible at 600w (narrow)(846ms)
✓  5 CD Preview M3-1126-I › loading state transitions     (1.7s)
✓  6 CD Preview M3-1126-I › X button touch area ≥ 44px   (919ms)
✓  7 CD Preview M3-1126-I › mouse drag: window follows    (1.2s)
✓  8 CD Preview R2 — mirror › window contains mirror WebView (932ms)
✓  9 CD Preview R2 — mirror › window size S ~15% viewport (867ms)

9 passed (11.2s)
```

### gh pr checks 275

```
route    fail  2s   (GitHub Actions 결제 한도 초과)
  → "The job was not started because recent account payments have failed
     or your spending limit needs to be increased."
lint / assertions / flow-tests / playwright / unit-tests  → skipping (route fail 연쇄)
```
코드 오류 아님 — GitHub Actions 결제/지출 한도 문제로 route 잡 자체 미시작.

### master (#276, 6eb28bd 머지) 충돌 없음

`mergeable: "MERGEABLE"` 확인.

### 코드 검토 항목

| 항목 | 판정 |
|---|---|
| `Platform.OS==='web'` 분기 iframe 직접 렌더 (rn-webview v14 웹 미지원 우회) | ✓ |
| `loadState{key,ready,error}` key-coupled — effect 본문 setState 제거 (lint set-state-in-effect 해소) | ✓ |
| `panHandlers` → `useMemo` (렌더 중 ref 접근 → lint refs 해소) | ✓ |
| `postMessage('*')` → `new URL(MEROS_CD_WEB_URL).origin` 고정 (커밋 0cfd795) | ✓ |
| Korean → English UI strings ("Preview unavailable" · "Retry") | ✓ |
| e2e R1·R2 셀렉터 6개 수정 (`waitForURL('/products')→waitForFunction('/sell')`, `cd-preview-badge-button→sell-preview-btn`) | ✓ 실행 통과 |

### storeport #462 CD mirror 3-state 미리보기 — 로컬 불가

**사유**: 운영 API 세션·인증 없이 로컬에서 CD mirror(MEROS_CD_WEB_URL/mirror) 실제 접근 불가.
아이프레임 `onLoad`/`onError` 연결은 e2e test 5(loading state transitions)에서 간접 확인됨.
로컬 실행 시 iframe src 실패 → `onError` → `cd-preview-load-error` 즉시 전환 (Loading… 15s 타임아웃 제거 동작 확인).

### 주의 사항 (후속 필요)

커밋 메시지(0cfd795)에 명시: storeport `mirror.tsx` `event.origin` 미검사.
POS 측 postMessage target origin은 `MEROS_CD_WEB_URL.origin`으로 고정됐으나, 수신 측 origin 검증 없으면 임의 출처 postMessage도 처리됨. 별도 티켓 필요.

### PR 코멘트

GitHub 자기 PR APPROVE 불가 → COMMENT로 제출. 리뷰 본문에 위 로그·항목 전체 포함.

---

## #277 — test(spec-guard): LG-1~3·SELL-TAB-LABEL·SELL-PRODUCT-SHEET-IMG·ORDER-LINK-CUSTOMER 보존 테스트

### 판정: APPROVE

### spec-guard 23/23 × 3회 연속 실행

```
Run 1: 23/23 passed · 0 failed
Run 2: 23/23 passed · 0 failed
Run 3: 23/23 passed · 0 failed
```

(빌드: `npx expo export -p web` → dist/, worktree /tmp/pr277-wt)

### gh pr checks 277

```
route    fail  2s   (GitHub Actions 결제 한도 — #275와 동일 원인)
assertions/flow-tests/playwright/unit-tests  → skipping (route fail 연쇄)
```

### master (#276, 6eb28bd) 충돌 없음

`mergeable: "MERGEABLE"` 확인.

### SELL-TAB-LABEL 대비 단언 — 실 렌더 색 읽음 확인

Playwright가 DOM `getComputedStyle(labelEl).color` + 부모 체인 비투명 배경 탐색으로 실제 렌더 색 측정:

```
light: 17.67:1  (TOKEN_INK #0E1B18 ≈ 검정 on white)
dark : 18.73:1  (TOKEN_ON_SELECTED white on charcoal)
```

SRC 단언(`isDark.*TOKEN_ON_SELECTED` 소스 패턴) + PW 단언(실 대비) 이중 보호.

### SELL-PRODUCT-SHEET-IMG — background-size:contain 유효 · fits 단언 주의

```
background-size: contain  ✓  (NativeWind CSS Interop bgDiv, 3회 모두 확인)

bgDivRect : { w:390, h:0 }
parentRect: { w:390, h:0 }
fits check: 390×0 ≤ 390×0 → 항상 참 (실질 경계 검증 없음)
```

**원인**: `pushState` 기반 navigate → product-details 에서 이미지 컨테이너(`h-full`)가 부모 체인 높이 미확정으로 0 측정.

**영향**: `background-size:contain` CSS 단언은 유효 (핵심 보호). `fits container` 단언은 현재 navigation 방식에서 측정 실패 조건에서도 조용히 통과 → 오인 가능성.
보존 요소 보호(resizeMode="contain" SRC + background-size:contain PW)를 무효화하지 않으므로 머지 차단 사유 아님. 후속 개선 권장.

### PR 코멘트

GitHub 자기 PR APPROVE 불가 → COMMENT로 제출. 리뷰 본문에 위 로그·항목 전체 포함.
