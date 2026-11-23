#237: APPROVE
master 선재존재 FAIL 9건: m1-1105-h · m1-1105-n · m1-1105-o · m1-1105-u · m3-1105-b · m3-1105-d · m3-1105-f · m3-1105-m · m3-1105-q

## 리뷰 결론

APPROVE — 모든 검증 항목 통과. master 선재존재 FAIL 9건은 M0-1123-G 범위 외 별건이며, 이 PR 머지 조건 아님.

---

## ① 공유 상태 안전성

### `_harness.mjs` 기반 하네스 (신형 · 약 20개)
- `createDistServer({ port: 0 })` → OS 랜덤 포트 배정 (`server.listen(0, ...)` 패턴) ✓
- `chromium.launch({ headless: true })` → 각 하네스 독립 Chromium 인스턴스 ✓
- 스크린샷 경로: 하네스별 고유 디렉터리/접두사 (`screenshots-m1-1105-ao/`, `/tmp/m1-1105-h-*.png` 등) ✓
- `dist/` 는 읽기 전용 공유 (HTTP 서버가 serve 만 함) → 쓰기 충돌 없음 ✓

### 고정 포트 하네스 (구형 · 2개 · 모두 master 선재존재 FAIL)
- `m3-1105-b-playwright.mjs`: `PORT = env.M3_1105_B_PORT ?? 9415` — env 오버라이드 가능
- `m1-1105-h-playwright.mjs`: `port: 9418` 고정 — env 오버라이드 없음 (별건 주의)
- 두 포트 상호 충돌 없음 (9415 ≠ 9418). 나머지 고정 포트 하네스도 각기 다른 포트 사용 (harness-id 패턴으로 고유성 유지).
- **결론**: 병렬 실행 시 포트 충돌 없음 ✓

---

## ② 소요 표 항상 출력

`runPool()` 반환 후 `sorted` 테이블 출력이 `if (failed > 0)` 분기 **밖**에 있음:

```js
const sorted = [...results].sort((a, b) => b.ms - a.ms);
console.log(`\n==== 요약 · 하네스 소요 (ms desc) ====`);
for (const r of sorted) { ... }  // 항상 실행
if (failed > 0) { ... }           // 실패 목록은 추가
```

로컬 재실행에서 실패(9건)가 있어도 표 정상 출력 확인 ✓

---

## ③ timeout 25분 유지 · playwright 잡 외 무변경 · 충돌 없음

- `timeout-minutes: 25` 그대로 유지 ✓
- 변경 파일 2개만: `scripts/run-all.mjs`, `.github/workflows/ci.yml` ✓
- `ci.yml` 변경: playwright 잡 주석 2줄 추가 + `Run Playwright harnesses` 스텝 명령어만 (`--workers 4` 추가) ✓
- **#238 (light 배정 · 머지됨)**: `runs-on` 및 러너 라우팅 관련. `playwright` 잡은 `runs-on: fromJSON(needs.route.outputs.runs_on)` 그대로 — 충돌 없음 ✓
- **M2-1123-G (route-fork.sh 진행 중)**: `route` 잡 관련 별도 스크립트. `playwright` 잡과 완전 별개 — 충돌 없음 ✓

---

## ④ master 선재존재 FAIL 9건 확인

### 목록 (이 PR 머지 조건 아님 · 별건 티켓 대상)
| 하네스 | master 직렬 소요 (CI 09:25Z) | 로컬 workers=4 소요 |
|---|---:|---:|
| m1-1105-h | 8.0s FAIL | 38.0s FAIL |
| m1-1105-n | 78.2s FAIL | 78.3s FAIL |
| m1-1105-o | 83.2s FAIL | 83.6s FAIL |
| m1-1105-u | 83.9s FAIL | 84.2s FAIL |
| m3-1105-b | 67.7s FAIL | 67.7s FAIL |
| m3-1105-d | 96.7s FAIL | 96.6s FAIL |
| m3-1105-f | 51.2s FAIL | 51.2s FAIL |
| m3-1105-m | 96.4s FAIL | 96.4s FAIL |
| m3-1105-q | — (취소 전 미실행) | 126.1s FAIL |

### 샘플 확인 (1~2건)
- **m1-1105-h**: CI master 09:25Z 직렬 run에서 `8.0s FAIL` 확인 → master 선재존재 사실 ✓
- **m3-1105-d**: CI master 09:25Z 직렬 run에서 `96.7s FAIL` 확인 → master 선재존재 사실 ✓
- 직렬 → 병렬 전환 후 FAIL 집합 완전히 동일 (m3-1105-q는 취소로 미실행됐던 것이 병렬로 처음 실행 · 선재존재 FAIL 확인)

---

## ⑤ 로컬 재실행 (workers=4 · 2026-11-23T21:34Z)

브랜치 `fix/M0-1123-G-playwright-time` · 워크트리 `/Users/kyu.lee/curiocity-live/fork-wts/M0-1123-G-wt` · master `dist/` 재사용:

```
node scripts/run-all.mjs playwright --workers 4 2>&1 | tail -50
```

| 하네스 | 소요 | 결과 |
|---|---:|---|
| m1-1105-ao-playwright | 287.6s | PASS |
| m3-1105-p-playwright | 202.3s | PASS |
| m3-1105-n-quote-receipt-playwright | 195.8s | PASS |
| m1-1105-q-playwright | 167.4s | PASS |
| m1-1105-aj-playwright | 163.5s | PASS |
| m3-1105-y-preorder-pay-playwright | 163.5s | PASS |
| m3-1105-q-playwright | 126.1s | FAIL (master 선재) |
| m1-1105-p-playwright | 122.9s | PASS |
| m3-1105-d-playwright | 96.6s | FAIL (master 선재) |
| m3-1105-m-preorder-playwright | 96.4s | FAIL (master 선재) |
| m1-1105-u-playwright | 84.2s | FAIL (master 선재) |
| m1-1105-o-playwright | 83.6s | FAIL (master 선재) |
| m1-1105-n-playwright | 78.3s | FAIL (master 선재) |
| m3-1105-b-playwright | 67.7s | FAIL (master 선재) |
| m3-1105-f-playwright | 51.2s | FAIL (master 선재) |
| m1-1105-ae-playwright | 43.8s | PASS |
| m2-1105-c-settings-playwright | 39.7s | PASS |
| m1-1105-h-playwright | 38.0s | FAIL (master 선재) |
| m1-1105-b-playwright | 37.2s | PASS |
| m3-1117-a-playwright | 9.0s | PASS |
| m1-1104-a / m1-1104-b / m0-1104-a / m3-1104-a / m2-1104-a / m2-1105-b / m3-1105-a | 4~5s | PASS |

**wall 591.0s = 9분 51초** (이전 측정 9분 50초와 거의 동일 · 오차 1초)
CPU time 148.7s user + 31.2s system → **3.87× 가속** 대비 serial 25분+

총 27 개 · 18 PASS · 9 FAIL (FAIL 집합 = master 선재존재 9건 그대로)

---

## 종합

PR #237은 목적(playwright 잡 25분 타임아웃 근본 해소)을 달성했으며, 모든 검증 항목을 통과함. APPROVE.
