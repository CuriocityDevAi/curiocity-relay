fork PR #209 · concurrency O · playwright 3개 고침 3 / 알려진실패 0(앱버그) · CI in_progress · 예상 절약 234분/일

## 작업 요약

### concurrency
- `ci.yml`: 이미 적용됨 (`ci-${{ github.workflow }}-${{ github.ref }}`)
- `lint.yml`: 미적용 → 추가. 같은 브랜치 새 push 시 이전 Lint run 자동 정지.

### Playwright 3개 수정 — 모두 테스트 측 이슈

| 스크립트 | 실패 증상 | 원인 | 판단 |
|---|---|---|---|
| `m3-1105-d` | `locator.click: Timeout` waiting `cash-quick-b` | M2-1116-W에서 `cash-quick-b` → `cash-quick-round`로 testID 변경 | 테스트 측 |
| `m3-1105-p` | `locator.fill: Element is not <input>` on `card-approval-input` | M2-1116-S에서 approval/last4를 display `<Text>` + NumericKeypad 방식으로 변경 | 테스트 측 |
| `m1-1105-ao` | `23/27` — SRC4 testID 검사 2개 + AO3/4/5 2개 | M2-1116-W: `cashQuickButtons`→`cashButtonSet`, `cash-quick-a/b`→`exact/round/100k` | 테스트 측 |

### 수정 내용

- `m3-1105-d`: `cash-quick-b` → `cash-quick-round` (1줄)
- `m3-1105-p`: `.fill('123456')`/`.fill('1234')` → `numpad-key-{d}` 순차 클릭
- `m1-1105-ao`: SRC4 `cashQuickButtons import`→`cashButtonSet import`, `cash-quick-a/b testID`→`cash-quick-exact/round testID`; AO3/4/5 `expectA/B`→`expectRound/Hundred`, AO6 `quick-b`→`quick-round`

### CI run
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/44516069812

### 예상 절약
진단표 기준: Playwright 3개 × 14회 × 평균 16.7분 = **234.3분/일** (CI cloud 실패 시간 95.8%)
