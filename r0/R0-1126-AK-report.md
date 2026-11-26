#276 APPROVE — 스크린샷 11장 글자 직접 확인 OK · e2e 12/12 · CI all PASS
#275 CHANGES — CdPreviewWindow.tsx 한글 UI 문자열(ADDENDUM §2 위반) · mirror.tsx message 리스너 없음(M3 리포트 맞음 · storeport 별도 발부 필요)
#277 CHANGES — SELL-TAB-LABEL·SELL-PRODUCT-SHEET-IMG SRC only → 보존 테스트 규약(실제 화면 노출 증거) 미달 · PW 어설션 추가 필요

---

## 사전 확인

- `git fetch origin` ✅
- 포트 4321 선점 없음 ✅
- PR heads: #276 b08dd53 · #275 0cfd795 · #277 e2f5aae ✅

---

## #276 APPROVE

### 스크린샷 11장 직접 확인 (파일 크기 판정 아님)

PNG 유효 (`file`: PNG image data · 96×36px 등). 11장 모두 글자 선명히 읽힘.

| 파일 | 확인 텍스트 |
|------|------------|
| M3-1126-K-none-ask | "Ask phone" |
| M3-1126-K-confirmed-reenter | "0813 **** 80 · +Rp 12,345 Re-enter" |
| M3-1126-K-confirming | "Awaiting confirm · 0813 **** 80" |
| M3-1126-K-entering-typing | "0813 80" |
| M3-1126-K-entering-waiting | "Waiting for customer" |
| M3-1126-K-locked-busy | "🔒 #? entering…" |
| M3-1126-K-phone-entry-chip | "Phone entry" |
| M3-1126-K-reenter-cancel-visible | "0813 1 Cancel" |
| M3-1126-K-skipped-ask-again | "Skipped Ask again" |
| M3-1126-K-viewport-landscape | "Ask phone" |
| M3-1126-K-viewport-portrait | "Ask phone" |

### e2e 12/12

`e2e/flows/M3-1126-K-phone-status.spec.ts` 테스트 카운트:
- V4-8 7상태 (`for` 루프 CASES[7]): 7
- V4-8 Re-enter cancel: 1
- V4-7 Phone entry chip (보임 + eligible=false 숨김): 2
- portrait + landscape: 2
- 합계 **12** ✅

### CI

```
assertions  PASS  1m16s
flow-tests  PASS    58s
lint        PASS    54s
playwright  PASS  6m59s
unit-tests  PASS    42s
```

PR 코멘트: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/276#issuecomment-7194500542

---

## #275 CHANGES

### postMessage origin 2곳 — ✅ 올바름

`components/cd-preview/CdPreviewWindow.tsx`:
- 라인 284 (handleLoadEnd web 분기): `iframeEl.contentWindow.postMessage({ type: 'pos-mirror', detail: payload }, new URL(MEROS_CD_WEB_URL).origin)`
- 라인 336 (snapshot useEffect web 분기): 동일

`'*'` 아닌 `MEROS_CD_WEB_URL.origin` 고정 ✅

### mirror.tsx message 리스너 — ⚠️ M3 리포트 맞음

`CuriocityDevAi/storeport: apps/customer-display/app/mirror.tsx` 직접 확인:

```typescript
// useEffect 내부
window.addEventListener("pos-mirror", handleMirror);  // CustomEvent only
// window.addEventListener("message", ...) — 없음
```

POS `iframe.contentWindow.postMessage(...)` → `MessageEvent` 도착 → mirror.tsx 수신 불가 → POS 웹 미리보기 snapshot 미반영.

판정: #275는 POS 쪽 origin 고정만으로 완결 안 됨. storeport `mirror.tsx`에 `message` 이벤트 수신 추가 필요. M0 별도 발부 예정으로 이해. #275 자체 APPROVE 가능성 있었으나 아래 한글 UI 문자열 위반으로 CHANGES.

### 🔴 assertions CI FAIL — CHANGES 필요

`m3-1105-c-english-assertions.mjs` (ADDENDUM §2 영어 전용 UI) 실패:

```
총 47 개 · 46 PASS · 1 FAIL
실패: m3-1105-c-english-assertions.mjs (exit 1)
```

원인: `components/cd-preview/CdPreviewWindow.tsx` 한글 UI 문자열:

```tsx
<Text>미리보기를 불러올 수 없습니다</Text>   // → "Preview unavailable"
<Text>다시 시도</Text>                        // → "Retry"
```

### CI

```
assertions  FAIL  1m7s  (m3-1105-c-english-assertions.mjs)
unit-tests  PASS   46s
flow-tests  PASS   48s
playwright  SKIP
lint        PASS   58s
```

PR 코멘트: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/275#issuecomment-7194510479

---

## #277 CHANGES

### 6요소 PW/SRC 판정

| 요소 | SRC | PW | 판정 |
|------|-----|----|------|
| LG-1 (favicon) | ✅ 파일 존재 | ✗ | ⚠️ 화면 증거 없음(허용범위 내 · 파일 존재 체크) |
| LG-2 (MerosLogo) | ✅ MARK_BOX_PATH, V 150 | ✅ loginLogo isVisible | ✅ |
| LG-3 (loginEmail) | ✅ floatingPlaceholder 없음, testID | ✅ 높이 51px ≤ 56px | ✅ |
| **SELL-TAB-LABEL** | ✅ isDark/TOKEN_ON_SELECTED | ✗ 없음 | **SRC only — 미달** |
| **SELL-PRODUCT-SHEET-IMG** | ✅ resizeMode="contain" | ✗ 없음 | **SRC only — 미달** |
| ORDER-LINK-CUSTOMER | ✅ testID, import | ✅ 클릭→PIN시트 | ✅ |

SELL-TAB-LABEL: `_layout.tsx` 소스 grep만 → 조건 미발화·dead code 시 탭 색 변화 없어도 통과.  
SELL-PRODUCT-SHEET-IMG: `product-details.tsx` `resizeMode="contain"` grep만 → 실제 contain 렌더 미검증.

**PW 추가 필요**: 탭 활성 색(다크모드에서 TOKEN_ON_SELECTED 렌더) · 이미지 contain 렌더.

### 3회 실행 결과 (안정성 ✅)

```
Run 1: 14/17 passed · 3 failed  (SRC: SELL-TAB-LABEL×2 · SELL-PRODUCT-SHEET-IMG×1)
Run 2: 14/17 passed · 3 failed
Run 3: 14/17 passed · 3 failed
```

SRC 3 fail은 현재 작업 브랜치에 TOKEN_ON_SELECTED·resizeMode 미적용 상태 때문. master에는 존재 ✅. 스크립트 자체 안정적.

### CI 연결 — ✅

`run-all.mjs` playwright 패턴: `/^[a-z0-9-]+-playwright\.mjs$/`  
`spec-guard-pos-playwright.mjs` → 매치 ✅ CI `node scripts/run-all.mjs playwright --workers 4` 자동 포함.

### CI #277

```
assertions  PASS  1m6s
flow-tests  PASS   42s
playwright  PASS  8m56s
lint        PASS   54s
unit-tests  PASS   45s
```

PR 코멘트: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/277#issuecomment-7194523775
