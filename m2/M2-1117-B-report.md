# PASS — M2-1117-B 손님 화면 반응형 레이아웃 완료 · PR #324 생성

## 판정

PASS — wide/normal/narrow 3단 breakpoint 구현 완료. unit 132/132 · 기존 e2e 12/12 · 신규 반응형 e2e 27/27 · typecheck 에러 0.

## 기술 선택 권장안

- **`useWindowDimensions`** (React Native 내장): 회전·분할 즉시 반영. expo-screen-orientation 같은 외부 의존 없음.
- **breakpoint**: wide ≥1033 / normal 600-1032 / narrow <600. iPad Pro landscape=1366, portrait=1024, split≈507 모두 커버.
- **`bpFs()`** 헬퍼로 inline 폰트 스케일 관리 — StyleSheet 중복 없음.
- **KeypadScreen**: wide는 row 유지, non-wide는 "정보→키패드→취소" column 재배치로 narrow에서도 버튼 최소 44px 보장.

## 변경 파일 목록

- `src/hooks/useLayout.ts` (신규)
- `src/screens/MainScreen.tsx`
- `src/screens/KeypadScreen.tsx`
- `src/screens/CartScreen.tsx`
- `src/screens/DoneScreen.tsx`
- `src/screens/ReceiptScreen.tsx`
- `src/screens/ConsentScreen.tsx`
- `app/pair.tsx`
- `e2e/responsive.spec.ts` (신규)
- `docs/feature-map.yaml`

## PR

https://github.com/CuriocityDevAi/storeport/pull/324

> ⚠️ PR base = main · 본문에 "#318 먼저 머지" 명시. 브랜치는 `feat/m2-1116-ak` 위에서 분기.

## 반응형 e2e 어설션 실행 로그 요약

```
27 passed (10.3s)
  - landscape 1366×1024 × {main, keypad, cart} × {id, en, ko} = 9
  - portrait  1024×1366 × {main, keypad, cart} × {id, en, ko} = 9
  - split      507×1024 × {main, keypad, cart} × {id, en, ko} = 9
각 케이스: 가로 넘침 없음 · 글자 세로쪼개짐 없음 · keypad 버튼 ≥40px
```

## 이연 순증감

완료: M2-1117-B / 신규 이연: 없음
