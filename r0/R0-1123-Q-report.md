#242: APPROVE
23 PASS / 4 FAIL (남은 4 FAIL = m1 선재건 · #241 픽스 포함 master rebase 후 FAIL 0 예상)

---

## ① 5건 낡은 테스트 여부 — 버그 가림 없음 ✓

| 하네스 | 변경 체크 | 판정 |
|---|---|---|
| m3-1105-b | (2) wizard 완료 → 홈 도달: `/products` → `/(products\|sell)/` | 의도 보존 · 완화 아님 |
| m3-1105-d | (1) 로그인 후 홈, (6b) Hand over 후 홈 URL | 동일 |
| m3-1105-f | (1) 로그인 후 홈 URL | 동일 |
| m3-1105-m | (1) 로그인 후 홈 URL | 동일 |
| m3-1105-q | (A9) Done → 홈, (A12) reopen 후 홈 URL | 동일 |

공통 뿌리: M3-1123-A(#228)로 앱 기본 경로 `/products` → `/sell` 변경. 각 어설션은 "홈 화면 도달 여부"를 검증하는 것으로 `/(products|sell)/` regex는 의도를 그대로 유지하며 앱 버그를 가리는 완화가 아님.

## ② 앱 코드 변경 없음 ✓

변경 파일 전체: `scripts/_harness.mjs`, `scripts/m3-1105-{b,d,f,m,q}-playwright.mjs` — 테스트 하네스만. 앱 소스 변경 없음.

## ③ #241 공용 헬퍼 충돌 — 머지 블로커 아님, rebase 필요

`scripts/_harness.mjs`의 `loginAndReachProducts` waitForFunction 변경이 #241(머지됨)과 **동일**한 패치. 현재 PR 브랜치는 #241 머지(2026-11-23T15:31Z) 이전 master 기준. master rebase 후 `_harness.mjs` diff는 no-op으로 소거 예상 — 충돌 없음. 머지 전 `git rebase master` 확인 필요.

## 전체 하네스 결과 (M3-1123-K-report 기준)

총 27개 · **23 PASS · 4 FAIL** · wall 208.9s  
FAIL 4건: m1-1105-h · m1-1105-n · m1-1105-o · m1-1105-u — #241 픽스 선재건, 이번 범위 외  
#241+#242 모두 master 반영 후 FAIL 0 목표 달성 가능.
