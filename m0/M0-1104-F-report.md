---
round: M0-1104-F
pr:
  storeport: storeport#176
outcome: railway-lockfile-hotfix · ERR_PNPM_OUTDATED_LOCKFILE 해소 (standalone app lock 갱신)
kyu_checks: 1 (railway-build-green · 머지 후 Railway 재배포 SUCCESS)
---

# M0-1104-F · Railway 핫픽스 (pnpm-lock.yaml 갱신 — Sentry 패키지)

**일자**: 2026-11-04 · **허브**: M0 · **대상**: `apps/commerce-core/pnpm-lock.yaml` 1 파일 · **원인**: M0-1104-E 후속 lock 누락.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | 뿌리 재현 (Railway 동일 `--frozen-lockfile` 격리 실행) | ✓ `ERR_PNPM_OUTDATED_LOCKFILE` 명세 포획 |
| 2 | `apps/commerce-core/pnpm-lock.yaml` 재생성 (standalone) · 다른 파일 변경 0 | ✓ |
| 3 | `--frozen-lockfile` exit 0 + `pnpm --filter commerce-core build` PASS | ✓ |
| 4 | fix 브랜치 + PR #176 · 커밋 메시지 `!` 금지 | ✓ |

---

## 1. 뿌리 (왜 E 에서 lock 누락이 발생했나)

storeport 는 **두 개의 pnpm-lock.yaml** 을 이원 유지:

1. **workspace 루트** `pnpm-lock.yaml` — 로컬 개발 · `pnpm --filter <app>` 기반 빌드
2. **`apps/commerce-core/pnpm-lock.yaml` (standalone)** — Railway Dockerfile 전용. Dockerfile 이 `COPY package.json pnpm-lock.yaml .npmrc ./` 로 **app-level 파일만** 복사 → 컨테이너 안엔 `pnpm-workspace.yaml` 이 없음 → pnpm 이 standalone 모드로 lock 검증.

M0-1104-C 에서 `apps/commerce-core/package.json` 에 `@sentry/node`, `@sentry/profiling-node` 를 추가하고 `pnpm install` 을 root 에서 돌림 → workspace 모드로 **root `pnpm-lock.yaml` 만** 갱신. standalone lock 은 미갱신. 로컬 `pnpm --filter commerce-core build` 는 workspace 모드라 통과 → 미발견 → 머지 후 Railway Dockerfile 이 standalone lock 만 참조 → 실패.

**체크 gap**: 오케가 **"standalone lock 과 Railway Dockerfile 이 workspace 를 모르고 격리로 install 한다"** 는 조건을 반영한 **격리 `--frozen-lockfile` 리허설** 을 미실행.

---

## 2. 변경

| 파일 | 변경 |
|------|------|
| `apps/commerce-core/pnpm-lock.yaml` | `+352 / -2` · `@sentry/*` 11.10.0 + 하위 전이 (`@sentry/core`, `@sentry/opentelemetry`, `@sentry/node-cpu-profiler`, `@opentelemetry/*`, `import-in-the-middle`) 편입 |

**재생성 명령**: `cd apps/commerce-core && pnpm install --ignore-workspace --lockfile-only`. 다른 파일 변경 **0** (`git status` 재확인).

---

## 3. 검증

### Railway 동일 조건 (격리 `--frozen-lockfile`)

```
$ mkdir -p /tmp/repro-m0-1104-f && cp apps/commerce-core/{package.json,pnpm-lock.yaml,.npmrc} /tmp/repro-m0-1104-f/
$ cd /tmp/repro-m0-1104-f && pnpm install --frozen-lockfile
… +jest/+react/+typescript/+vite/+yalc …
Done in 9.4s
=== EXIT 0 ===
```
**이전 (pre-fix)**: 동일 격리에서 즉시 `ERR_PNPM_OUTDATED_LOCKFILE` + `specifiers in the lockfile (…) don't match specs in package.json (…@sentry/node…@sentry/profiling-node…)`.

### 빌드

```
$ pnpm --filter commerce-core build
Backend  3.93s · Frontend 15.32s
```
PASS · exit 0.

---

## 4. 재발 방지 (상시 조항 제안)

> `[REPORT] 상시` — `apps/commerce-core/package.json` (또는 그 외 standalone lock 유지 앱의 package.json) 변경 시, PR 본문에 아래 로그 둘을 **반드시** 붙인다:
> 1. **격리 `--frozen-lockfile` exit 0** (`mkdir /tmp/x && cp apps/*/package.json apps/*/pnpm-lock.yaml apps/*/.npmrc /tmp/x && cd /tmp/x && pnpm install --frozen-lockfile`)
> 2. `pnpm --filter <app> build` PASS

별건 PR 로 `AGENTS.md` (혹은 `scripts/pre-pr-check.sh`) 에 체크리스트 등재 제안.

---

## 5. 규약 정합

| 규약 | 상태 |
|------|------|
| 건드린 파일 = pnpm-lock.yaml 1개 | ✓ |
| Railway 동일 조건 `--frozen-lockfile` exit 0 | ✓ |
| `pnpm --filter commerce-core build` PASS | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |
| 자기 검증 (뿌리 + 재발 방지 1줄 씩) | ✓ |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (Railway 빌드 실패 핫픽스) |
| 등재 | +1 (상시 조항 제안 — 별건 PR 대기) |
| 미결 | 1 (railway-build-green · PR #176 머지 후 Railway 재배포 성공 확인) |
| **총 순증감** | **0** (해소 1 · 등재 1 상쇄 · 미결 신규 1) |

---

## 7. 다음 게이트

1. **Kyu**: PR #176 머지 → Railway 자동 재배포 → `BOOT OK ... · sentry on` 확인 → kyu_checks `railway-build-green` PASS.
2. **별건**: standalone lock 재발 방지 조항을 `AGENTS.md` 에 편입 (M0-1104-G 또는 별건 micro-PR).
3. **별건**: Expo 앱 (fork) Sentry 연결 (`@sentry/react-native`) · 원 라운드 계획 유지.

---

*M0-1104-F · 2026-11-04 · lockfile 핫픽스 1 파일 · Railway 동일 조건 exit 0 + build PASS · 자기 검증 포함 · 머지 후 재배포 성공은 Kyu 확정 대기*
