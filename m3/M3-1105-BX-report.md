# M3-1105-BX report
iOS 미검증

## 원인
1. **lint** — BW 커밋이 `app/_layout.tsx:81,88` 에 Stack.Screen multiline 포맷(prettier 단일행 규칙 위반) 도입. `tender-cash`에서 `displayId` 미사용 변수도 BW가 Stack.Screen 삭제 시 선언만 남긴 것.
2. **playwright** — BW가 `app/checkout/tender-cash/[draftOrderId].tsx`에서 `headerLargeTitle` 제거 시 `Stack` import 와 `Stack.Screen options={{ title: displayId ? \`Order #\${displayId}\` : '' }}` 까지 삭제 → `m1-1105-ao-playwright.mjs` SRC3 "tender-cash · Stack import" + "Order # 타이틀 패턴" 2건 실패.

## 수정 파일:줄
- `app/_layout.tsx:81,88` — Stack.Screen multiline → inline (prettier 오류 2건)
- `app/checkout/tender-cash/[draftOrderId].tsx:28,241` — `Stack` import 복원, `displayId` 재선언, `Stack.Screen` 동적 타이틀 복원(`headerLargeTitle` 없이)

## CI 결과
assertions · flow-tests · lint · playwright 전부 pass (run 43449130354 / 43449130330)

## head SHA
4e73ad32855b09cae8e75e3b8a1837ba4bcc3068
