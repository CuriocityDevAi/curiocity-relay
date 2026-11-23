✅ DONE — PR #245 · base=fix/M3-1123-L-test2 · mergeable=clean (스택 작업)

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/245

- **base**: `fix/M3-1123-L-test2` (#244 리뷰 중)
- **head**: `feat/M3-1123-M-sell-header`
- **mergeable**: clean — 충돌 없음

## 구현 요약

| 파일 | 변경 |
|------|------|
| `app/(tabs)/_layout.tsx` | sell 탭 `headerShown` 제거 · `CdHeaderRight` 사용 중단 |
| `components/SellTopBar.tsx` | 신규 · 왼쪽 `RegisterBadge` + 오른쪽 `● Connected` + `…` 버튼 · `pt-safe` |
| `components/RegisterBadge.tsx` | 초록 박스 → 두 줄 텍스트(● Open · Store / since …) |
| `app/(tabs)/sell.tsx` | SellTopBar → OrderChips → 검색+스캔 → 상품 순 · Layout → View(pt-4) |
| `e2e/flows/M3-1123-M-sell-header.spec.ts` | 3뷰포트 레이아웃 어설션 |

## 레이아웃 순서 (세로·iPad 공통)

```
SellTopBar  [● Open · Store  |  ● Connected  ⋯]   ← pt-safe
OrderChips  [#1  #2  #3  + New order]
검색+스캔   [__Search____]  [QR]
상품 그리드
```

## 기능 보존

- 메뉴(Cash pickup · Close register) testID `register-menu-btn` 유지
- 스캔 `sell-scan-qr` 유지
- 칩 동작(`chip-active-*`, `chip-waiting-*` 등) 변경 없음
- 탭 바 "Sell" 라벨 유지

## since 처리

권장안 채택 — `RegisterBadge` 두 번째 줄에 작은 회색 글씨 `since YYYY.MM.DD HH:mm [by nickname]`.

## base 변경 필요 여부

#244(`fix/M3-1123-L-test2`)가 master 에 머지되면:

```bash
git rebase --onto origin/master <M3-1123-L-test2 마지막 커밋> feat/M3-1123-M-sell-header
gh pr edit 245 --base master
```

작업 시간 내 머지 미완료 — **base 변경 필요**.

## 자기 검증

- TS 에러: 변경 파일 0건 (기존 프리-엑시스팅 에러 제외)
- e2e spec `M3-1123-M-sell-header.spec.ts` 작성 완료 (3뷰포트 · 5개 어설션)
- Playwright 실기 스크린샷: CI 환경에서 실행 시 `e2e/screenshots/M3-1123-M-sell-header-*.png` 생성
