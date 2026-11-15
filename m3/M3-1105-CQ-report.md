# M3-1105-CQ 완료 보고

PR: https://github.com/CuriocityDevAi/storeport/pull/275 (Draft)

## 결과 요약
`useActiveEvent` 훅 신규 생성 + Main·Receipt·Done 화면에 `<EventDecor>` overlay 연결 완료.

## 구현 항목

| 항목 | 파일 | 상태 |
|---|---|---|
| useActiveEvent 훅 (신규) | `src/hooks/useActiveEvent.ts` | ✅ |
| MainScreen EventDecor overlay | `src/screens/MainScreen.tsx` | ✅ |
| ReceiptScreen EventDecor overlay | `src/screens/ReceiptScreen.tsx` | ✅ |
| DoneScreen EventDecor overlay | `src/screens/DoneScreen.tsx` | ✅ |
| e2e 날짜 주입 테스트 (신규) | `e2e/event-decor-screens.spec.ts` | ✅ 2/2 통과 |
| feature-map 업데이트 | `docs/feature-map.yaml` | ✅ cd-event-decor |

## 확인(실기) 항목

| 항목 | 결과 |
|---|---|
| TypeScript `--noEmit` | ✅ 오류 없음 |
| vitest unit (customer-display) | ✅ 113 passed (25 files) |
| e2e receipt-done 기존 7건 | ✅ 7 passed |
| e2e event-decor-screens 신규 2건 | ✅ 2 passed |

## Playwright 결과

```
9 passed (6.2s)
✓ event-decor-screens: ?testDate=2026-12-20 → event-decor-christmas 표시
✓ event-decor-screens: 무주입 → event-decor-christmas 없음
✓ receipt-done: rule-A (?state=done renders DoneScreen with earn amount)
✓ receipt-done: rule-B (?state=receipt renders ReceiptScreen with method badge)
✓ receipt-done: rule-C (receipt + ?state=done flow)
✓ receipt-done: rule-G (?state=checkout stays on cart)
✓ receipt-done: rule-I (default idle renders main screen)
✓ receipt-done: done-progress bar visible
✓ receipt-done: receipt-paper present
```

## `gh pr checks 275` 결과
| job | 결과 |
|---|---|
| check (feature-map) | pending |
| markers-and-forbidden | pending |
| changes-filter | pending |
| unit-commerce-core | pending |

## REQ 충족 현황

| REQ | 내용 | 상태 |
|---|---|---|
| REQ 1 | 서버 없으면 장식 없음 · 이슬람력 빈 표 · 하드코딩 연도 금지 | ✅ `eventsEnabled === undefined && today == null → null` |
| REQ 2 | 3화면 overlay · pointerEvents none · reduce-motion 존중 | ✅ EventDecor 내부 처리 |
| REQ 3 | 날짜 주입 e2e (활성→존재, 비활성→없음) | ✅ 2/2 통과 |

## 이연 순증감
신규: `src/hooks/useActiveEvent.ts` · `e2e/event-decor-screens.spec.ts`. 이연 항목 증감 없음.
