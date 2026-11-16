# M2-1116-W Report

fork PR #159 · 기본 키패드 숨김 · 금액 버튼: "딱 맞게(=총액)" / 50k 올림(total 초과 시) / 100k(total < 100k & dedup) · "다른 금액" 토글로 NumericKeypad 펼침

## 변경 파일
- `components/payment/CashTenderPanel.tsx` — 핵심 변경
- `lib/cash-quick-buttons.ts` — `cashButtonSet()` 추가
- `__tests__/cash-tender-panel.test.ts` — 17 테스트 신규

## 구현 내용

### [REQ] 1 — 버튼 레이아웃
| 버튼 | 조건 | testID |
|---|---|---|
| 딱 맞게 (=총액) | 항상 | `cash-quick-exact` |
| 50k 올림 | `ceil(total/50k)*50k > total` | `cash-quick-round` |
| 100,000 | `total < 100k AND nextRound ≠ 100k` | `cash-quick-100k` |
| 다른 금액 | 항상 (토글) | `cash-other-amount` |

버튼 예시:
- total=33k → [33k, 50k, 100k, 다른금액]
- total=75k → [75k, 100k(dedup), 다른금액]
- total=100k → [100k, 다른금액]
- total=120k → [120k, 150k, 다른금액]

### [REQ] 2 — 키패드 토글
- "다른 금액" 탭 → 키패드 펼침, 입력 초기화(received=0)
- 금액 버튼 탭 → 금액 설정 + 키패드 접힘
- "다른 금액" 재탭 → 접힘

### [REQ] 3 — 화면 높이
키패드 숨김 시: Totals strip + 버튼 행 + "다른 금액" 버튼 + Process payment → iPad 가로 기준 스크롤 없이 표시 가능한 최소 구조. 실기 검증은 Kyu 항목.

### [REQ] 4 — 테스트 (23 passed)
- 금액 버튼 계산: 7 케이스
- 숫자패드 입력: 5 케이스
- 부족 금액 비활성: 5 케이스
- 기존 cashQuickButtons 테스트: 6 케이스 (유지)

## 미검증
- 시뮬레이터/실기 스크린샷 없음 (UI 렌더링 미실행) — Kyu 실기 항목으로 위임
- iPad 가로 스크롤 없음 여부: Kyu 실기 확인 필요

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/159
