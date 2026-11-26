OK https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/272

## 원인 (1줄)
`formatElapsed`가 `M:SS` 무제한 포맷을 사용해 13.4일짜리 실제 대기 주문이 `19263:15`로 표시됨 — 계산 오류가 아닌 실제 오래된 draft order.

## 수정 내용

| 파일 | 변경 |
|------|------|
| `components/order-chips/types.ts` | `formatElapsed` → `<60m: Nm` · `60m~24h: Nh Mm` · `≥24h: Nd` · `elapsedMs: number\|null` (createdAt=0/미래 → null) |
| `components/order-chips/OrderChips.tsx` | `elapsedMs !== null`일 때만 경과시간 렌더 |
| `__tests__/m3-1123-a-order-chips.test.ts` | 기존 4개 기댓값 수정 + 경계값 9개 추가 (26 passed) |
| `e2e/flows/M3-1126-E-waiting-elapsed.spec.ts` | Playwright 5m·2h·3d fixture 어설션 + 스크린샷 (1 passed) |

## 자기 검증

```
Playwright: 1 passed (4.8s)
  [M3-1126-E] 5m chip: "#2· 5m" | 2h chip: "#3· 2h" | 3d chip: "#4· 3d"

Vitest: 26 passed (217ms)
  M3-1126-E · formatElapsed 경계값: 5/5 passed
  M3-1126-E · waiting chip elapsedMs null 처리: 3/3 passed
```

스크린샷: `e2e/screenshots/M3-1126-E-waiting-elapsed.png` (커밋 포함)

## 오래된 대기 카트 현황 보고
서버 `created_at`이 13.4일 전인 draft order가 실제로 존재함 (19263분 ≈ 2026-11-12 이후). 현재 `lowerBound`는 세션 `opened_at`(2026-11-12) 기준이므로 이후 생성된 모든 주문이 복원됨. 삭제·정리 로직은 이번 PR에 포함하지 않음 — Kyu 결정 사항.
