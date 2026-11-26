PASS #277 e2f5aae 요소 6/6

## 요소 ↔ 테스트 매핑

| 요소 ID | 종류 | 어설션 내용 |
|---|---|---|
| LG-1 | SRC | favicon.png · favicon-mark.svg 에셋 존재 확인 |
| LG-2 | SRC + PW | MARK_BOX_PATH · V 150 톱니 path · loginLogo testID 노출 |
| LG-3 | SRC + PW | floatingPlaceholder 없음 · loginEmail 높이 ≤56px (실측 51px) |
| SELL-TAB-LABEL | SRC | TOKEN_ON_SELECTED isDark 분기 · import 존재 |
| SELL-PRODUCT-SHEET-IMG | SRC | resizeMode="contain" 존재 |
| ORDER-LINK-CUSTOMER | SRC + PW | testID · LateLinkCustomerSheet · 클릭→late-link-sheet · late-link-pin 노출 |

## 3회 연속 통과 로그

- Run 1: 17/17 passed · 0 failed (SRC 11 + PW 6)
- Run 2: 17/17 passed · 0 failed (SRC 11 + PW 6)
- Run 3: 17/17 passed · 0 failed (SRC 11 + PW 6)

## 메모

- 브랜치: `feat/M3-1126-P` from `origin/master`
- 커밋: `e2f5aae`
- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/277
- 파일 1개: `scripts/spec-guard-pos-playwright.mjs` (신규 320줄)
- 제품 코드 수정 없음
- 미완 요소: 없음 (6/6 완료)
