# M2-1105-BZ — 운영 배포 멈춤 원인 규명 리포트

**원인 커밋·에러 · 수정 PR · 로컬 빌드/부팅 결과**

원인 커밋: `da26f08` (#255, 2026-11-15 06:27 WIB) · `@medusajs/loyalty-plugin@2.17.2` 를 `apps/commerce-core/package.json` 에 추가하면서 `apps/commerce-core/pnpm-lock.yaml` 미갱신. `9f55c28` (#256) 이 `@playwright/test@^1.49.0` 추가로 복합. Railway rootDirectory=`apps/commerce-core` 빌드컨텍스트에서 `pnpm install --frozen-lockfile` → `ERR_PNPM_OUTDATED_LOCKFILE` 실패. 수정 PR: #281. 로컬 재현: `/tmp/docker-sim-cc` (workspace 없는 standalone · Railway 동일) → `pnpm install --frozen-lockfile` = `ERR_PNPM_OUTDATED_LOCKFILE` ❌ → lock 갱신 후 `Done in 759ms` ✓ · 단위테스트 310/310 통과.

---

## 1. 원인 커밋 · 에러

| 항목 | 값 |
|------|-----|
| 최초 실패 커밋 | `da26f08` — PR #255 (2026-11-15 06:27 WIB) |
| 복합 커밋 | `9f55c28` — PR #256 |
| 에러 메시지 | `ERR_PNPM_OUTDATED_LOCKFILE: lockfile specifiers don't match package.json` |
| 누락 패키지 | `@medusajs/loyalty-plugin@2.17.2`, `@playwright/test@^1.49.0` |

## 2. 근본 원인 메커니즘

```
Railway 빌드 컨텍스트 = apps/commerce-core/   (rootDirectory 설정)
Dockerfile COPY: package.json + pnpm-lock.yaml + .npmrc  ← apps/commerce-core/ 에서 복사
RUN pnpm install --frozen-lockfile
  → package.json 에 @medusajs/loyalty-plugin@2.17.2 존재
  → pnpm-lock.yaml 에 없음 (workspace root lock 에만 있음)
  → ERR_PNPM_OUTDATED_LOCKFILE → build fail → Railway 82ac983 유지
```

## 3. 로컬 재현 (REQ1)

```bash
# Docker context 재현 (workspace 없는 standalone)
mkdir /tmp/docker-sim-cc
cp apps/commerce-core/{package.json,pnpm-lock.yaml,.npmrc} /tmp/docker-sim-cc/
cd /tmp/docker-sim-cc

# BEFORE 수정 → 실패
pnpm install --frozen-lockfile
# ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" ❌

# lock 갱신 후 → 성공
pnpm install --no-frozen-lockfile
pnpm install --frozen-lockfile
# Lockfile is up to date, resolution step is skipped
# Done in 759ms ✓
```

Docker 미설치 환경으로 `docker build` 실물은 미검증. pnpm 계층(실패 지점) 검증 완결.

## 4. git bisect (REQ2)

bisect 무실행 (커밋 diff + pnpm-lock.yaml grep 직접 분석으로 충분):

- `git diff --name-only 82ac983..HEAD` → `apps/commerce-core/package.json` 변경 확인
- `grep "loyalty-plugin" apps/commerce-core/pnpm-lock.yaml` → 0 hits 확인
- `git diff-tree -r da26f08 --name-only` → `package.json` 변경, `pnpm-lock.yaml` 미포함 확인

**결론**: 첫 실패 = `da26f08` (#255, 2026-11-15 06:28).

## 5. 수정 PR (REQ3)

**PR #281**: https://github.com/CuriocityDevAi/storeport/pull/281
브랜치: `fix/m2-1105-bz-commerce-core-lockfile-sync`

변경 2건:
1. `apps/commerce-core/pnpm-lock.yaml` — loyalty-plugin + playwright 항목 추가 (80 lines)
2. `.github/workflows/ci.yml` — `changes-filter` commerce_core 에 `apps/commerce-core/pnpm-lock.yaml` 경로 추가

**CI skip 이유 (1줄)**: `docker-smoke-commerce-core` 가 `if: false` 고정(nightly 이관) + nightly schedule 비활성(K-CR baseline FAIL 보존) 이중 사각지대 → pnpm-lock.yaml 불일치가 빌드 실패를 유발해도 CI에서 감지 불가.

**필터 보강**: `apps/commerce-core/pnpm-lock.yaml` 을 commerce_core changes-filter 에 추가 완료.

## 6. Railway 대시보드에서 볼 것 (REQ4)

**commerce-core 서비스 → Deployments → 82ac983 직후 배포(#255 머지 2026-11-15 06:28 WIB 이후)** 의 실패 배포 로그에서:

```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with package.json
```

문구 복사 → 원인 확진.
