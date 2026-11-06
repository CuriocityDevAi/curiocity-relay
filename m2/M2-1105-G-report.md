---
round: M2-1105-G
pr:
  fork: agilo-medusa-pos-fork#34
commit: b06b2298d6b51cb6baf67478a26ee7eb4982e1d8
outcome: fork CI workflow 신설 · assertions + web export + playwright 자동 실행 · 본 PR CI green 확인 · 머지 가능
kyu_checks: 0 (PR 체크가 자동 실행 · Kyu 는 녹색 확인만)
ci_run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42218857397
ci_duration_s: 288
---

# M2-1105-G · fork CI · PR 자동 테스트

**일자**: 2026-11-06 · **허브**: M2 · **상대 리포**: `agilo-medusa-pos-fork` · **base**: `master = 3de8028`

## 1. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | fork 에 GitHub Actions 워크플로 신설 (PR + master push) | ✓ `.github/workflows/ci.yml` |
| 2 | `npm ci` → assertions glob → web export → playwright glob | ✓ 5 단계 (`run-all.mjs`) |
| 3 | 실패 시 PR 체크 빨강 | ✓ exit 1 on any failure |
| 4 | 5분 이내 소요 목표 (캐시) | ✓ 4m48s (cold) · Metro + chromium 바이너리 캐시 적용 |
| 5 | 본 PR 자체 CI green | ✓ run 42218857397 ✓ |
| 6 | 제품 코드 수정 금지 | ✓ scripts/ · .github/ · docs/ 만 |

## 2. 변경 파일

| 파일 | 변경 | 라인 |
|------|------|------|
| `.github/workflows/ci.yml` | 신규 | 73 |
| `scripts/run-all.mjs` | 신규 (glob 실행기) | 91 |
| `docs/testing/web-e2e.md` | "CI (M2-1105-G)" 섹션 | +45 |
| `scripts/m3-1104-a-assertions.mjs` | test drift fix (lib/inventory.ts 참조) | +14/-7 |
| `scripts/m3-1105-b-playwright.mjs` | SPA fallback 반영 (M2-1105-F) | +9/-6 |
| `scripts/m1-1104-a-playwright.mjs` | 공용 하네스 치환 (하드코딩 /pos-m1 제거) | +24/-61 |

**제품 코드 (app/** · components/** · api/** · lib/\*) 미수정**.

## 3. CI 설계

### 트리거

- `pull_request` (모든 branch)
- `push` to `master`
- concurrency: `cancel-in-progress` (중복 run 자동 취소)

### 단계 (`.github/workflows/ci.yml`)

1. `actions/checkout@v4`
2. `actions/setup-node@v4` · Node 20 · npm cache
3. `npm ci --legacy-peer-deps`
4. ImageMagick 설치 (`m0-1103-c-assertions.mjs` 가 `magick identify` 호출)
5. `node scripts/run-all.mjs assertions` — `scripts/*-assertions.mjs` glob (10개)
6. Metro + Expo 캐시 (`actions/cache@v4`)
7. `npx expo export -p web`
8. Playwright 브라우저 바이너리 캐시 (`PLAYWRIGHT_BROWSERS_PATH`)
9. `playwright-chromium@1.64.1` 을 `/tmp/playwright-tmp/` 에 설치 (하네스가 기대하는 경로)
10. `node scripts/run-all.mjs playwright` — `scripts/*-playwright.mjs` glob (10개)
11. 실패 시 `/tmp/m*-screenshot*.png` 아티팩트 업로드 (7일 보관)

### `scripts/run-all.mjs`

- 모드 arg: `assertions` · `playwright` · `all`
- 각 스크립트 `child_process.spawn` 순차 실행 · 소요 시간 기록
- 실패 시 stdout/stderr tail 출력
- 전체 exit: 실패 1건 이상이면 1

## 4. 본 PR CI 결과

- **런**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42218857397
- **총 소요**: **4m48s** (cold cache)
- **어설션**: 10/10 PASS · ~1.4s
- **Web export**: ~70s
- **Playwright**: 10/10 PASS · ~86s
- **Chromium cold install**: ~90s (다음 PR 부터는 캐시 적중 · ~5s 복원)

소요 시간 목표 "5분 이내" 충족. 캐시 완전 적중 시 ~3분 예상.

## 5. 과정에서 드러난 pre-existing drift 3건 (최소 수정으로 해결)

CI 를 켜 보니 로컬에선 가려졌던 세 가지 drift 가 드러났다. 제품 코드 미수정 · 테스트 인프라만 수정.

### 5-A. `scripts/m3-1104-a-assertions.mjs` (test file 참조 drift)
M3-1105-B (#27) 가 `computeInventoryStatus` 를 `app/(tabs)/products.tsx` → `lib/inventory.ts` 로 이동. 이 가드가 여전히 products.tsx 를 찾아 3건 실패. 수정: `lib/inventory.ts` 참조 + M3-1105-A 토큰 클래스 (`bg-warning-soft`/`bg-success-soft`) 허용 정규식.

### 5-B. `scripts/m3-1105-b-playwright.mjs` (SPA fallback drift)
자체 inline HTTP 서버가 M2-1105-F 의 `web.output: 'single'` 에 적응 안 됨 — `/products` 요청에 `products.html` 룩업 → 404 → locator timeout. SPA fallback 로 수정 (`_harness.mjs` 와 동일 패턴).

### 5-C. `scripts/m1-1104-a-playwright.mjs` (하드코딩 /pos-m1 drift)
`DIST = '/Users/kyu.lee/projects/pos-m1/dist'` 하드코딩 — 로컬 Mac 에선 M1 worktree 가 있어 통과했지만 CI runner 에는 없음. 공용 하네스로 치환 (경로 하드코딩 제거).

## 6. 효과

- **모든 PR 이 자동 테스트** — Kyu 3회 요구 "자동 테스트" 충족.
- **라운드별 하네스 20개** (어설션 10 + Playwright 10) 가 **상시 실행** → 회귀 flag 지연 최소화.
- `master` 머지 전 녹색 요구 — 하드 블록.
- **네이티브 영향 0** (웹 export + Node Playwright 만 · iPad 무관).

## 7. 알려진 공존 체크

- `.github/workflows/lint.yml` (기존) · `npm ci` 를 `--legacy-peer-deps` 없이 호출해 실패 중. **본 PR 범위 밖** · M1/M3 또는 orchestrator 가 별도 수정 필요.

## 8. 참고

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/34
- 브랜치: `ci/m2-1105-g-fork-ci` · 커밋 `b06b229`
- CI 런: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42218857397
- 선행 리포트: `m2/M2-1105-E-report.md` (뿌리 진단) · `m2/M2-1105-F-report.md` (하네스 공용화)
