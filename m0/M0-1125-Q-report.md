PASS · PR #443 · docker-build jon https://github.com/CuriocityDevAi/storeport/actions/runs/45599077613/job/139152835649 · 6m28s

# M0-1125-Q — cd-builder 워크스페이스 수정 + PR docker build 가드

## 결과
- **PR**: https://github.com/CuriocityDevAi/storeport/pull/443 (open · 셀프 머지 금지)
- **브랜치**: `hotfix/M0-1125-Q-cd-builder-workspace`
- **HEAD SHA**: `bac606e1ffa4ad43c3a73834a38d0e85e3684c75`
- **docker-build-commerce-core (ubuntu)**: ✅ **pass · 6m28s**
  - job: https://github.com/CuriocityDevAi/storeport/actions/runs/45599077613/job/139152835649
  - run: https://github.com/CuriocityDevAi/storeport/actions/runs/45599077613

## 원인 (Kyu 17:45 Railway 로그 기반)
#431 이 customer-display 에 `@storeport/receipt-view-model` workspace 소비를 추가했으나,
`apps/commerce-core/Dockerfile` 의 **cd-builder** stage 는 `pnpm-workspace.yaml` · 루트 `package.json` · `apps/customer-display` 만 복사했음.
pnpm install 시점에 `packages/receipt-view-model/package.json` 이 없어 workspace 심볼릭 링크 실패
→ Expo Web 번들러가 "Unable to resolve @storeport/receipt-view-model" 로 FAIL.
#442 는 **builder** stage (commerce-core 측) 만 고쳐서 cd-builder 는 여전히 FAIL 이었음.

## 변경
1. `apps/commerce-core/Dockerfile` · cd-builder stage
   - `COPY packages/receipt-view-model/package.json packages/receipt-view-model/` 를 pnpm install 전에 추가
   - `COPY packages/receipt-view-model/ packages/receipt-view-model/` 를 build 전에 추가
   - `pnpm install --filter customer-display --frozen-lockfile`
     → `pnpm install --filter "customer-display..." --frozen-lockfile` (점 3개 = 전이 워크스페이스 의존 포함)
2. `.github/workflows/docker-build-pr.yml` 신규
   - ubuntu-latest · `docker build -f apps/commerce-core/Dockerfile .`
   - 경로 필터: `apps/commerce-core/**` · `apps/customer-display/**` · `packages/**` · `pnpm-lock.yaml` · `pnpm-workspace.yaml` · 이 워크플로 자체
   - timeout-minutes: 25 · BuildKit cache (type=gha)
   - DB 없이 `/health` 가 안 되는 Medusa 특성 상 build 성공까지만 (healthcheck 는 self-hosted `docker-smoke` 가 main push 에서 분담)

## Dockerfile 전체 감사
| 단계 | 소비하는 workspace 패키지 | 커버 상태 |
|---|---|---|
| cd-builder (customer-display) | `@storeport/receipt-view-model` | ✅ 본 PR 로 수정 |
| builder (commerce-core) | 자체 pnpm-lock (`--ignore-workspace`) + `packages/receipt-view-model` 직접 COPY (admin vite alias) | ✅ #442 로 이미 처리 |
| runtime | 없음 (`.medusa/server` 산출물만 복사) | ✅ 변동 없음 |

`packages/event-contracts` 는 anchor/wing/care-agent 가 소비 · 이 Dockerfile 범위 밖.

## 중복 정리 메모 (PR 본문에도 기재)
heavy-steps 의 `commerce-core-standalone-install` 은 `apps/commerce-core` 만 재현 → cd-builder/receipt-view-model 커버 X. 새 docker build 는 상위 집합이지만 신호 속도가 다르므로 (standalone-install ≈ 30s vs docker build ≈ 6-15min) 현재 공존 유지. CI 분이 부담될 때 상위 집합 완전 이관 후 standalone-install 제거 검토.

## docker build 꼬리 로그 (핵심 단계)
```
#19 [cd-builder  7/11] COPY packages/receipt-view-model/package.json packages/receipt-view-model/
#19 DONE 0.0s
#20 [cd-builder  8/11] RUN pnpm install --filter "customer-display..." --frozen-lockfile
#20 DONE 25.5s
#24 [cd-builder 10/11] COPY packages/receipt-view-model/ packages/receipt-view-model/
#24 DONE 0.0s
#26 [cd-builder 11/11] RUN pnpm --filter customer-display run build:web
#26 0.359 > customer-display@0.1.0 build:web /workspace/apps/customer-display
#26 1.128 Expo Autolinking module resolution enabled
#26 43.67 Exported: dist
#26 DONE 43.8s
#27 [builder 10/13] COPY --from=cd-builder /workspace/apps/customer-display/dist/ public/customer-display-web/
#28 [builder 11/13] RUN pnpm build
#28 DONE 36.3s
#29 [builder 12/13] RUN mkdir -p .medusa/server/public && cp -r public/customer-display-web .medusa/server/public/customer-display-web && echo "✓ customer-display web 편입 완료"
#29 0.048 ✓ customer-display web 편입 완료
#30 DONE 49.7s  (prod deps install)
#32 DONE 180.7s (runtime stage · export)
```

전체 이전엔 `[cd-builder 9/9] RUN pnpm --filter customer-display run build:web` 가 "Unable to resolve @storeport/receipt-view-model" 로 FAIL · 이번엔 43.8s 에 Exported: dist.

## 다음 단계 (Kyu)
- PR #443 실기 승인 → 머지 → Railway 재배포 모니터링.
- 운영 복구 확진 후 operations unblock.
