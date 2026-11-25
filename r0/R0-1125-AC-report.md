# R0-1125-AC 리뷰 리포트

판정: **CHANGES** — runtime WORKDIR 경로 단절 1건 (블로커)

## 직접 실행한 명령 로그 꼬리

```
# ① standalone install 재현 (Railway stage 6/11)
$ rm -rf /tmp/stalone-test && mkdir /tmp/stalone-test
$ cp apps/commerce-core/{package.json,pnpm-lock.yaml,.npmrc} /tmp/stalone-test/
$ cd /tmp/stalone-test && pnpm install --frozen-lockfile --ignore-workspace
devDependencies:
+ @medusajs/test-utils 2.17.2
+ @playwright/test 1.65.1
...
Done in 13.7s   ← PASS
```

## 검증 결과 요약

| 항목 | 결과 |
|------|------|
| ① standalone install 재현 | ✅ PASS — `Done in 13.7s` |
| ② runtime WORKDIR 경로 (SSH 스크립트) | ❌ FAIL — 경로 단절 |
| ② customer-display-web COPY 경로 | ✅ OK |
| ② /health 경로 | ✅ OK |
| ③ admin vite alias (medusa build) | ✅ PASS — CI heavy-mac SUCCESS |
| ④ CI step 논리 | ✅ OK |
| ⑤ CI 전체 | ✅ PASS |

## 블로커 상세

`apps/commerce-core/Dockerfile` 119행: runtime WORKDIR 가 `/app/.medusa/server` → `/app/apps/commerce-core/.medusa/server` 로 변경됨.
운영 SSH 스크립트 `cd /app/.medusa/server && npx medusa exec ./src/scripts/...` 가 `No such file or directory` 로 실패.

**최소 수정 (옵션 A):**
```dockerfile
# runtime stage
WORKDIR /app/.medusa/server
COPY --from=builder /app/apps/commerce-core/.medusa/server ./
```
builder WORKDIR 변경은 그대로 유지하고, runtime 복사 출처만 새 경로로 맞추면 됨. SSH 스크립트 수정 불필요.

## 리뷰 링크

PR #442 COMMENT 제출 완료 (자계정 PR — REQUEST_CHANGES API 불가, COMMENT 대체)
