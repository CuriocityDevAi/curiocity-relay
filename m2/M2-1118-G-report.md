PR #361 · route.ts 삭제 · curl / 302 O

## 작업 내역

- `apps/commerce-core/src/api/route.ts` 삭제 (8줄 · middleware 중복)
- `apps/commerce-core/src/api/__tests__/root-redirect.unit.spec.ts` 삭제 (53줄 · route.ts 의존 테스트)
- `docs/feature-map.yaml` 에서 두 파일 항목 제거

## QC 결과

- `pnpm build` exit 0 (backend 5.26s · frontend 17.56s)
- unit 45 suites · 528 tests all PASS
- `medusa start` 후 curl:
  - `GET /` → `HTTP/1.1 302 Found` · `Location: /app` ✓
  - `GET /app` → `HTTP/1.1 200 OK` ✓

## 커밋

`7700384` fix(commerce-core): M2-1118-G — 죽은 코드 src/api/route.ts 삭제
branch: fix/M2-1118-F-root-redirect → push 완료
