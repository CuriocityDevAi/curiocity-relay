# M3-1123-K-report

판정: **PASS (m3 몫 5건 전부)** · PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/242

---

## 하네스별 표

| 하네스 | 원인 분류 | 조치 | 전(master FAIL) | 후(fix) | 소요 |
|---|---|---|---|---|---|
| m3-1105-b | 테스트 낡음 | (2) wizard 완료 URL 체크 `/products` → `/(products\|sell)/` | FAIL (1건) | PASS 30/30 | 37.8s |
| m3-1105-d | 테스트 낡음 | (1) URL, (6b) Hand over 후 URL 체크 갱신 | FAIL (3건) | PASS 27/27 | 36.9s |
| m3-1105-f | 테스트 낡음 | (1) URL 체크 갱신 | FAIL (1건) | PASS 19/19 | 21.3s |
| m3-1105-m | 테스트 낡음 | (1) URL 체크 갱신 | FAIL (1건) | PASS 28/28 | 66.5s |
| m3-1105-q | 테스트 낡음 | (A9) Done 후 URL, (A12) reopen 후 URL 체크 갱신 | FAIL (2건) | PASS 25/25 | 36.2s |

**공통 뿌리**: M3-1123-A(#228) 머지로 앱 기본 경로가 `/products` → `/sell`로 변경됨 (Sell 탭 도입). wizard 완료 후 URL 어설션이 `/products` 만 체크 → 모두 FAIL. 앱 버그 아님.

**공용 헬퍼 변경**: `scripts/_harness.mjs` `loginAndReachProducts` waitForFunction에 `/sell` 조건 추가 (최소 변경 · PR 명시).

---

## 로컬 `node scripts/run-all.mjs playwright --workers 4` 전체 결과

| 하네스 | 소요 | 결과 |
|---|---:|---|
| m3-1105-p-playwright | 82.4s | PASS |
| m1-1105-ao-playwright | 77.6s | PASS |
| m3-1105-n-quote-receipt-playwright | 76.2s | PASS |
| m3-1105-m-preorder-playwright | 66.5s | PASS ← fix |
| m1-1105-q-playwright | 47.2s | PASS |
| m3-1105-y-preorder-pay-playwright | 43.7s | PASS |
| m1-1105-aj-playwright | 43.5s | PASS |
| m1-1105-h-playwright | 38.0s | FAIL (m1 별건) |
| m3-1105-b-playwright | 37.8s | PASS ← fix |
| m3-1105-d-playwright | 36.9s | PASS ← fix |
| m3-1105-q-playwright | 36.2s | PASS ← fix |
| m1-1105-p-playwright | 32.6s | PASS |
| m1-1105-u-playwright | 24.1s | FAIL (m1 별건) |
| m1-1105-o-playwright | 23.5s | FAIL (m1 별건) |
| m3-1105-f-playwright | 21.3s | PASS ← fix |
| m1-1105-n-playwright | 18.3s | FAIL (m1 별건) |
| m1-1105-ae-playwright | 13.4s | PASS |
| m2-1105-c-settings-playwright | 9.5s | PASS |
| m3-1117-a-playwright | 9.1s | PASS |
| m1-1105-b-playwright | 7.2s | PASS |
| m3-1104-a-playwright | 4.8s | PASS |
| m1-1104-b-playwright | 4.8s | PASS |
| m0-1104-a-playwright | 4.8s | PASS |
| m1-1104-a-playwright | 4.8s | PASS |
| m2-1104-a-playwright | 4.6s | PASS |
| m3-1105-a-playwright | 4.5s | PASS |
| m2-1105-b-inventory-playwright | 4.5s | PASS |

**총 27개 · 23 PASS · 4 FAIL · wall 208.9s**

남은 FAIL 4건(m1-1105-h · m1-1105-n · m1-1105-o · m1-1105-u)은 m1 몫 별건 · 이번 M3-1123-K 범위 외.
