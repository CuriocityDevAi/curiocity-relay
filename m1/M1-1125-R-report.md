PASS

## Dockerfile diff

```diff
-# M0-1125-N: builder WORKDIR 변경 반영 (/app → /app/apps/commerce-core)
-WORKDIR /app/apps/commerce-core/.medusa/server
+# M1-1125-R: runtime WORKDIR를 SSH 스크립트 경로에 맞춤 (/app/.medusa/server)
+WORKDIR /app/.medusa/server
```

## runtime 경로 전/후 표

| 항목 | 변경 전 (M0-1125-N) | 변경 후 (M1-1125-R) |
|------|---------------------|---------------------|
| runtime WORKDIR | `/app/apps/commerce-core/.medusa/server` | `/app/.medusa/server` |
| runtime COPY source (from builder) | `/app/apps/commerce-core/.medusa/server` | `/app/apps/commerce-core/.medusa/server` (무변경) |
| CMD | `npx medusa db:migrate && npx medusa start` | 동일 (무변경) |
| SSH 스크립트 | `cd /app/.medusa/server && npx medusa exec ...` | 동일 (server 측 무변경) |

## 작업 내용

- 파일: `apps/commerce-core/Dockerfile` (runtime stage WORKDIR 1줄만 수정)
- worktree: `~/projects/curiocity-relay-wts/M0-1125-N`
- branch: `hotfix/M0-1125-N-dockerfile-lockfile`
- commit: `9884684` — fix(dockerfile): M1-1125-R — runtime WORKDIR /app/.medusa/server 복원
- push: 성공 (테스트 65 suites / 730 tests 전체 PASS)
- PR #442 코멘트: https://github.com/CuriocityDevAi/storeport/pull/442#issuecomment-7158245857
