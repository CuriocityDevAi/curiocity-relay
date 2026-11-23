# M0-1123-H-report — PASS

4건 모두 **stale test** 로 분류 · 테스트만 수정 · 앱 코드 손대지 않음 · 전부 PASS.

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/241
- 브랜치: `test/M0-1123-H-fix-legacy-harness` · head `f37c957`
- 워크트리: `/Users/kyu.lee/curiocity-live/fork-wts/M0-1123-H-wt`
- 리포: `CuriocityDevAi/agilo-medusa-pos-fork`
- 로컬 실측 2026-11-23T15:10Z · `node scripts/run-all.mjs playwright --workers 4`
- 상한 50분 중 소요 약 25분 (deps 설치 · dist 빌드 · 반복 실측 · 전체 run 포함).

## 하네스별 결과 (원인 분류 · 조치 · 전/후)

| 하네스 | 원인 분류 | 실패 체크 (전) | 조치 | 전 소요·결과 | 후 소요·결과 |
|---|---|---|---|---:|---:|
| m1-1105-h | **stale** (앱 동작이 바뀌어 테스트가 낡음) | `(4) Retry 성공 → /products 도달` | URL 정규식 `/\/products/` → `/\/(sell\|products)/` · `(3)` 반대 표현도 동반 수정 · waitForFunction 조건도 sell OR products | 38.0s FAIL (1/9) | **8.1s PASS (9/9)** |
| m1-1105-n | **stale** | `(A6) /products URL 유지` · `(B3) /products 유지` | 동일 (2 지점) | 78.3s FAIL (11/13) | **18.5s PASS (13/13)** |
| m1-1105-o | **stale** | `(1) /products 도달` | 동일 (1 지점) | 83.6s FAIL (12/14) | **23.7s PASS (14/14)** |
| m1-1105-u | **stale** | `(A7) /products 라우팅` · `(A10) /products 유지` | 동일 (2 지점) | 84.2s FAIL (15/17) | **24.1s PASS (17/17)** |

**버그 분류**: 없음. **불안정 분류**: 없음. 공통 원인 = M3-1123-A (#228) 가 홈을 `/(tabs)/products` → `/(tabs)/sell` 로 이동 · wizard 는 여전히 `router.replace('/(tabs)/products')` 호출 · hidden tab (`href: null`) + `initialRouteName: 'sell'` 조합으로 expo-router 가 sell 로 폴백 · 최종 URL `/sell` 안착. sell 화면 자체가 "상품 그리드 + 칩 + 카트 패널" 이어서 "홈 상품 그리드 도달" 이라는 테스트 의도는 그대로 보존됨.

## 변경 파일 (최소 범위)

| 파일 | 역할 | 변경 |
|---|---|---|
| `scripts/_harness.mjs` | 공용 헬퍼 | `loginAndReachProducts` 의 waitForFunction 조건에 `includes('sell')` OR 추가 · 주석 추가 |
| `scripts/m1-1105-h-playwright.mjs` | 하네스 | `/products/` 검사 2 지점 + waitForFunction 1 지점 → `/(sell\|products)/` |
| `scripts/m1-1105-n-playwright.mjs` | 하네스 | `/products/` 검사 2 지점 |
| `scripts/m1-1105-o-playwright.mjs` | 하네스 | `/products/` 검사 1 지점 |
| `scripts/m1-1105-u-playwright.mjs` | 하네스 | `/products/` 검사 2 지점 |

**스코프 외 변경 없음**: 앱 코드 · `.github/workflows/ci.yml` · `route-fork.sh` · 다른 허브 하네스 (`m3-1105-*`) 미수정. 공용 helper 변경은 wait 조건 OR 분기만 (기존 products 조건 유지 · regression 안전).

## 자기 검증 — `node scripts/run-all.mjs playwright --workers 4` (27 하네스 전체)

```
==== 요약 · 하네스 소요 (ms desc) ====
    82.9s  PASS    m3-1105-p-playwright.mjs
    78.1s  PASS    m1-1105-ao-playwright.mjs
    76.5s  PASS    m3-1105-n-quote-receipt-playwright.mjs
    68.6s  FAIL1   m3-1105-b-playwright.mjs              ← 범위 외 (M3 track)
    66.4s  FAIL1   m3-1105-m-preorder-playwright.mjs     ← 범위 외
    47.9s  PASS    m1-1105-q-playwright.mjs
    44.1s  PASS    m3-1105-y-preorder-pay-playwright.mjs
    43.7s  PASS    m1-1105-aj-playwright.mjs
    36.9s  FAIL1   m3-1105-d-playwright.mjs              ← 범위 외
    36.5s  FAIL1   m3-1105-q-playwright.mjs              ← 범위 외
    32.9s  PASS    m1-1105-p-playwright.mjs
    24.1s  PASS    m1-1105-u-playwright.mjs              ← 이 PR
    23.7s  PASS    m1-1105-o-playwright.mjs              ← 이 PR
    21.3s  FAIL1   m3-1105-f-playwright.mjs              ← 범위 외
    18.5s  PASS    m1-1105-n-playwright.mjs              ← 이 PR
    13.5s  PASS    m1-1105-ae-playwright.mjs
    10.0s  PASS    m2-1105-c-settings-playwright.mjs
     9.4s  PASS    m3-1117-a-playwright.mjs
     8.1s  PASS    m1-1105-h-playwright.mjs              ← 이 PR
     7.2s  PASS    m1-1105-b-playwright.mjs
     4.9s  PASS    m0-1104-a-playwright.mjs
     4.9s  PASS    m1-1104-b-playwright.mjs
     4.9s  PASS    m1-1104-a-playwright.mjs
     4.8s  PASS    m3-1104-a-playwright.mjs
     4.6s  PASS    m2-1104-a-playwright.mjs
     4.5s  PASS    m3-1105-a-playwright.mjs
     4.5s  PASS    m2-1105-b-inventory-playwright.mjs

  총 27 개 · 22 PASS · 5 FAIL · wall 202.8s
  실패:
    - m3-1105-f-playwright.mjs (exit 1)
    - m3-1105-d-playwright.mjs (exit 1)
    - m3-1105-b-playwright.mjs (exit 1)
    - m3-1105-m-preorder-playwright.mjs (exit 1)
    - m3-1105-q-playwright.mjs (exit 1)
```

- **이 PR 전 (M0-1123-G 보고 §5)**: 9 FAIL · wall ≈9분 50초.
- **이 PR 후**: 5 FAIL · wall 3분 23초. 내 몫 4 하네스 전부 PASS · M3 몫 5 하네스 그대로 FAIL (별건).

## 남은 몫 (별건)

M3 track hub (M3-1123-H 완료 뒤 · 별도 티켓) 처리 대상:
- `m3-1105-b` · `m3-1105-d` · `m3-1105-f` · `m3-1105-m` · `m3-1105-q`
- 같은 홈 라우트 shift 문제가 있을 수 있고, 추가로 M3-1123-A 가 바꾼 UI 요소 (주문 유형 버튼 · CartBottomBar · CartSheet · 결제 완료 화면) 영향을 받을 수 있다. 각 하네스 로컬 로그에 터지는 step 이 그대로 남아 있어 M3 track 에서 즉시 진단 가능.

## 버그 보고 (별건 발부 대상)

없음. 이번 몫 4건 전부 stale test — 앱 동작이 바뀌어 테스트가 낡은 경우. 앱 코드 손대지 않음.
