PASS · PR #442

# M0-1125-N — Dockerfile workspace layout + receipt-view-model admin alias (hotfix)

- 브랜치: `hotfix/M0-1125-N-dockerfile-lockfile`
- 커밋: `91f7ca5` (origin/hotfix/M0-1125-N-dockerfile-lockfile)
- PR: https://github.com/CuriocityDevAi/storeport/pull/442

## 뿌리
#431 (admin · 영향도 미리보기 모달) 이 `apps/commerce-core/package.json` 에 `"@storeport/receipt-view-model": "workspace:*"` 를 추가. Railway Dockerfile builder 는 `apps/commerce-core/` 만 flat 하게 복사한 뒤 그 폴더의 **독립 `pnpm-lock.yaml`** 로 install 하므로:
1. 독립 lockfile 에 신규 명세 부재 → `ERR_PNPM_OUTDATED_LOCKFILE`.
2. 설령 있어도 `workspace:*` 는 워크스페이스 밖에선 해석 불가.

CI 는 워크스페이스 루트에서 `pnpm install --frozen-lockfile` 을 돌려 통과 → 머지 → Railway 에서만 FAIL. 4건 (#432 4583d5df 이후 #431·#436·#434·#438) 연속 운영 미반영.

## 채택 (Option B · 가장 단순)
- `@storeport/receipt-view-model` 을 commerce-core 의존성에서 제거 (runtime 서버 미사용 · admin UI 전용).
- admin vite 번들이 공용 소스를 `resolve.alias` 로 직접 import.
- Dockerfile builder 레이아웃을 워크스페이스 그대로 보존 (`/app/apps/commerce-core` + `/app/packages/receipt-view-model`) → vite alias 가 local/Docker 동일 상대 경로로 해석.
- commerce-core 는 자체 pnpm-lock 유지 · `--ignore-workspace` 명시.

### 왜 A 가 아니었나
A 는 Dockerfile 에 `packages/receipt-view-model` 복사 **+** commerce-core 독립 lockfile 에 `workspace:*` 를 어떻게든 담아야 함 (현실적으로 `file:` 상대참조로 변경). 이번 drift 는 해소되지만 `packages/*` 를 commerce-core 가 쓰는 한 미래의 같은 유형이 또 발생 가능. B 는 runtime 서버가 쓰지 않는 공용 소스를 서버 의존성 그래프에서 배제해 뿌리 유혹을 끊음 (변경 7파일 75 insertions).

## 수정 파일 (`91f7ca5`)
| 파일 | 변경 |
| --- | --- |
| `apps/commerce-core/package.json` | `@storeport/receipt-view-model` 제거 |
| `apps/commerce-core/medusa-config.ts` | `admin.vite` 에 `resolve.alias['@storeport/receipt-view-model']` 추가 |
| `apps/commerce-core/src/admin/tsconfig.json` | `baseUrl` + `paths` 로 TS 해석 유지 |
| `apps/commerce-core/Dockerfile` | 워크스페이스 레이아웃 보존 · `--ignore-workspace` 명시 · runtime WORKDIR 조정 |
| `pnpm-lock.yaml` | commerce-core 섹션에서 receipt-view-model 엔트리 제거 (customer-display 유지) |
| `.github/actions/heavy-steps/action.yml` | **`commerce-core-standalone-install`** step 신규 |
| `.github/workflows/docker-smoke.yml` | paths 필터에 package.json · pnpm-lock.yaml · packages/** 추가 |

## 재발 방지
**CI gap**: PR CI 는 워크스페이스 루트 install 만 돌려서 Railway 가 보는 standalone 모드를 한 번도 재현하지 않음. docker-smoke 는 Dockerfile 셋만 트리거해 이번 변경을 못 잡음.
- `heavy-steps` 에 `commerce-core-standalone-install` step 추가. tmpdir 에 commerce-core 의 package.json/lockfile/.npmrc 만 복사한 뒤 `pnpm install --frozen-lockfile --ignore-workspace` 실행 → **Railway stage 6/11 를 PR 단계에서 그대로 재현**.
- `docker-smoke.yml` paths 에 `apps/commerce-core/package.json` · `apps/commerce-core/pnpm-lock.yaml` · `packages/**` 추가 → main push 시 full docker build 트리거.

## 검증 로그

### 1) docker 가용성
이 호스트에는 docker 미설치. 따라서 실제 `docker build -f apps/commerce-core/Dockerfile .` 는 미실행. 대신 Dockerfile builder stage 6/11 과 **동일한** pnpm 명령을 격리 tmpdir 에서 재현. Railway redeploy 가 머지 후 최종 확진.

### 2) 수정 전 FAIL 재현 (`pnpm install --frozen-lockfile`) — 꼬리 20줄
```
---files---
total 1024
drwxr-xr-x@   5 kyu.lee  wheel     160 Nov 25 15:26 .
drwxrwxrwt  232 root     wheel    7424 Nov 25 15:26 ..
-rw-r--r--@   1 kyu.lee  wheel     469 Nov 25 15:26 .npmrc
-rw-r--r--@   1 kyu.lee  wheel    2689 Nov 25 15:26 package.json
-rw-r--r--@   1 kyu.lee  wheel  512699 Nov 25 15:26 pnpm-lock.yaml
---pnpm install--frozen-lockfile---
 ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with <ROOT>/package.json

Note that in CI environments this setting is true by default. If you still need to run install in such cases, use "pnpm install --no-frozen-lockfile"

    Failure reason:
    specifiers in the lockfile ({"@medusajs/admin-sdk":"2.17.2", ... /* no @storeport/receipt-view-model */ })
    don't match specs in package.json ({"@medusajs/test-utils":"2.17.2", ..., "@storeport/receipt-view-model":"workspace:*", ...})
```
= Railway 1a7f75d6 (#438) 빌드 로그와 동일.

### 3) 수정 후 OK (`pnpm install --frozen-lockfile --ignore-workspace`) — 꼬리 20줄
```
---pnpm install --frozen-lockfile --ignore-workspace---
devDependencies:
+ @medusajs/test-utils 2.17.2
+ @playwright/test 1.65.1
+ @swc/core 1.15.47
+ @swc/jest 0.2.39
+ @types/jest 29.5.14
+ @types/node 20.19.43
+ @types/react 18.3.31
+ @types/react-dom 18.3.7
+ jest 29.7.0
+ pg-god 1.0.12
+ prop-types 15.8.1
+ react 18.3.1
+ react-dom 18.3.1
+ ts-node 10.9.2
+ typescript 5.9.3
+ vite 5.4.21
+ yalc 1.0.0-pre.53

Done in 14.4s
```

### 4) 로컬 빌드·테스트 (워크트리 루트)
```
$ pnpm typecheck        # OK (출력 무오류)
$ pnpm test             # Test Suites: 65 passed · Tests: 730 passed · Snapshots: 18 passed
$ pnpm build            # medusa build
Backend build completed successfully (6.44s)
Frontend build completed successfully (21.40s)
```
`settingImpact.unit.spec.ts` (admin → receipt-view-model alias 소비 테스트) 포함 전 테스트 통과. `medusa build` 의 Frontend (admin vite) 가 alias 로 공용 소스를 성공 번들링.

## 미수행 / 미검증
- 실제 `docker build -f apps/commerce-core/Dockerfile .` + 컨테이너 기동 + `/health` 200 — 이 호스트 docker 미설치로 미검증. Railway redeploy 또는 self-hosted docker-smoke 가 최종 확진.
- 셀프 머지 금지 지시에 따라 PR #442 머지 대기.
