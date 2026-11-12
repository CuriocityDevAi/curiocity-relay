# M1-1105-BM Report — fork master lint 빨강 정리

## 오류 목록 (수정 전)
| 파일 | 줄 | 규칙 |
|------|----|------|
| components/orders/VoidRefundSheet.tsx | 243:30 | prettier/prettier — ternary chain |
| components/orders/VoidRefundSheet.tsx | 511:20 | prettier/prettier — Button props |
| components/payment/QrisTenderPanel.tsx | 21:14 | prettier/prettier — 불필요한 ()  |

**총 49 problems (3 errors, 46 warnings)**

## 수정 파일
- `components/orders/VoidRefundSheet.tsx` — npx prettier --write
- `components/payment/QrisTenderPanel.tsx` — npx prettier --write

**수정 후: 46 problems (0 errors, 46 warnings)**

## 46 warnings 미수정 이유
- `react-hooks/set-state-in-effect` — SSR 가드 패턴 (`useEffect(() => setMounted(true), [])`) · 동작 변경 없이 제거 불가
- `react-hooks/immutability` — Reanimated `SharedValue.value` 직접 대입 패턴 · 라이브러리 필수 사용법으로 변경 불가
- eslint-disable 금지 지침에 따라 경고 유지

## Vitest
- 2 failed (`void-refund-nav-bc.test.ts`) → master HEAD 에서 이미 존재하는 사전 실패, 이번 diff 와 무관
- 172 passed / 6 expected fail / 2 todo — 동작 불변 확인

## CI / PR
- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/121
- 브랜치: fix/m1-1105-bm-lint-master (base: master)
- CI run 결과 대기 중
