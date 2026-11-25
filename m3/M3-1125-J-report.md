PASS

## M3-1125-J — unit-tests CI job 추가 (__tests__/ 갭 해소)

### 변경 workflow

| 파일 | 변경 |
|------|------|
| `.github/workflows/ci.yml` | `unit-tests` job 신규 추가 (25줄) |

### 신규 job: unit-tests

```yaml
runs-on: runs_on_light   # self-hosted fork-light → ubuntu fallback
timeout-minutes: 5
command: npx vitest run  # vitest.config.ts 기준 전체
```

- 커버리지: `__tests__/` + `tests/` 전체 (79 files · 1011 tests)
- `.claude/**` 제외: PR #260 vitest.config.ts 로 보장 (이 PR 은 #260 위에 쌓임)
- 기존 job 구조(`assertions · flow-tests · lint · playwright · route · heavy-cloud`) 그대로 유지

### 소요 시간

| 환경 | wall time |
|------|-----------|
| 로컬 (M3 Mac, 4-core) | 3.8s |
| CI (self-hosted Mac runner) | **40s** (npm ci 포함) |

샤딩 불필요 — 5분 timeout 에 충분한 여유.

### CI 결과 (PR #261 첫 실행)

| job | 결과 | 소요 |
|-----|------|------|
| route | pass | 1m10s |
| unit-tests | **pass** | **40s** |
| flow-tests | pass | 39s |
| assertions | pass | 1m9s |
| heavy-cloud | pass | 3s |
| playwright | fail | 8m58s |

playwright 실패: `m3-1124-o-checkout-b-playwright.mjs` — 이 PR 의 변경(.github/workflows/ci.yml 추가)과 무관한 기존 이슈.

### 필수 체크 갱신 필요 여부

`unit-tests` 가 빨강이어도 머지가 차단되지 않는 현재 상태. 머지 차단을 원하면:

**Settings › Branches › master › Require status checks to pass before merging** 에
`unit-tests` 체크 항목 추가 필요 (Kyu 직접 설정 — 이 PR 에서는 미변경).

### PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/261

base: `feat/M3-1125-I-fix-failing-tests` (#260 위에 쌓음 — vitest.config .claude/** 제외 의존)
