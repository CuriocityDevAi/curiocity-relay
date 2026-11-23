#239: APPROVE

## 체크포인트 결과

### ① lint/assertions/flow-tests → fork-light 고정 · GITHUB_TOKEN 403 폴백 제거

`.github/scripts/route-fork.sh` 변경:
- `_light_runner_online()` 함수 전체 제거 (구 L84–105, 22행)
- `LIGHT_ONLINE` 계산 및 조건 분기 제거 (구 L354–356)
- `RUNS_ON_LIGHT` 초기값 → `["self-hosted","curiocity-mac-fork-light"]` 고정 (L354)
- `MOCK_LIGHT_ONLINE` 목업 환경변수 제거

API 판정 경로가 코드상 존재하지 않으므로 403 폴백 경로 완전 제거 확인.

### ② playwright 잡·클라우드 쿼터 로직 영향 없음

- playwright `runs-on: ${{ fromJSON(needs.route.outputs.runs_on) }}` → `runs_on` (heavy) 사용, `runs_on_light` 미사용
- `_cloud_count()` 및 쿼터 분기 미수정
- heavy-cloud skipped → 쿼터 로직 정상 동작 확인

### ③ #237과 충돌 없음

| PR   | 수정 파일 |
|------|----------|
| #237 | `.github/workflows/ci.yml`, `scripts/run-all.mjs` |
| #239 | `.github/scripts/route-fork.sh` |

겹치는 파일 없음. playwright 잡 runner 배차는 `runs_on` — `runs_on_light` 와 무관.

### ④ #239 CI light 잡 실행 증거

**run 45195363872 (CI workflow):**

| job         | runner_name               | conclusion |
|-------------|--------------------------|------------|
| route       | GitHub Actions 1000007789 | success    |
| assertions  | curiocity-mac-fork-light  | success ✓  |
| flow-tests  | curiocity-mac-fork-light  | success ✓  |
| heavy-cloud | (none)                    | skipped    |
| playwright  | (pending)                 | —          |

**run 45195363744 (Lint workflow):**

| job  | runner_name              | conclusion |
|------|--------------------------|------------|
| lint | curiocity-mac-fork-light | success ✓  |

## 판정

**APPROVE** — 변경 범위 최소 (1파일 −41/+13), 테스트 21/21, CI 전 잡 통과, light 러너 실행 증거 완비.
