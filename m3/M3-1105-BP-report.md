# M3-1105-BP Report

## 확인 항목

| 항목 | 결과 |
|------|------|
| (a) warnings 46 → N | 46 → **44** |
| (b) errors | **0** |
| (c) tsc 0 | 기존 오류만 (split-tender TS2345, vitest.config TS1117) · 본 PR 무관 |
| (d) vitest 0 failed | `void-refund-nav-bc.test.ts` 2건 pre-existing (#122 리뷰 중) · 본 PR 무관 |
| (e) 보류 표 | 하단 참조 |

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/123

## Head SHA

`8f0876794466e908643cc2ea71166f46ca6f1531`

## 수정 내역 (warnings 46 → 44, -2)

| 파일 | 줄 | 규칙 | 조치 |
|------|----|------|------|
| `app/orders/[orderId].tsx` | 32:29 | `@typescript-eslint/no-unused-vars` | `OrderStatus` import 제거 |
| `components/orders/VoidRefundSheet.tsx` | 366:9 | `@typescript-eslint/no-unused-vars` | `pinSubmitDisabled` 변수 제거 |

## 보류 표 (44건)

| 규칙 | 건수 | 보류 이유 |
|------|------|-----------|
| `react-hooks/set-state-in-effect` | 20 | SSR 가드 패턴(`setMounted(true)`) 등 의도적 동기 setState — 고치면 렌더/마운트 동작 변경 |
| `react-hooks/refs` | 11 | `SwipeableListItem.tsx` React Native Animated API ref-in-render 패턴 — Animated.Value 사용 방식상 필연적 |
| `react-hooks/immutability` | 11 | Reanimated `sharedValue.value = ...` 뮤테이션 패턴 — 고치면 애니메이션 동작 변경 |
| `react-hooks/exhaustive-deps` | 1 | `VoidRefundSheet.tsx:130` `orderItems` useMemo deps — 고치면 렌더 동작 변경 가능 |
| `@typescript-eslint/no-require-imports` | 1 | `app/orders/[orderId].tsx:711` — 주석 "dev client 크래시 방지" 의도적 lazy require, useMemo 안 try-catch |

## 자기 검증 (직접 실행)

```
✖ 44 problems (0 errors, 44 warnings)
tsc: 기존 오류만 (본 PR 변경 없음)
vitest: 2 failed (void-refund-nav-bc.test.ts, pre-existing #122)
```
