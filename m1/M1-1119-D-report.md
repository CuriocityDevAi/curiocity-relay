#388 feature-map 미분류 0 ✅ · 등록 2파일 · rebase ✅

## 작업 내용
- `git fetch origin && git rebase origin/main` → 충돌 없음
- `docs/feature-map.yaml` 수정:
  - `apps/commerce-core/src/lib/manager-pin.ts` → `manager-pin` 프로세스 files에 추가
  - `apps/commerce-core/src/lib/pos-settings-module.ts` → `pos-settings` 프로세스 files에 추가
- `node scripts/feature-map-check.mjs` 결과: `scanned: 1205 files → matched=1205 unmatched=0 (0.0%)`
- 커밋: `docs(feature-map): M1-1119-D — manager-pin.ts · pos-settings-module.ts 등록 (미분류 0)`
- push --force-with-lease → ✅ (rebase 후 히스토리 다이버지로 force 필요)
