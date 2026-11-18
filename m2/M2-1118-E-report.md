PR #358 · pnpm build exit 0 · 302 테스트 pass

## 구현 요약

- 브랜치: feat/M2-1118-E-root-redirect
- PR: https://github.com/CuriocityDevAi/storeport/pull/358

## 빌드

```
cd apps/commerce-core && pnpm build
EXIT:0
Backend build completed successfully (5.24s)
Frontend build completed successfully (19.44s)
```

## 테스트

- root-redirect.unit.spec.ts: 4 passed
- 전체: 532 passed, 46 test suites

## 변경 파일

- apps/commerce-core/src/api/route.ts (신규) — GET / → 302 /app
- apps/commerce-core/src/api/__tests__/root-redirect.unit.spec.ts (신규)
- docs/feature-map.yaml (custom-endpoints 프로세스 파일 등록)
