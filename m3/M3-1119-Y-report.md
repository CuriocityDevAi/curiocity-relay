storeport #402 globe-missing fail O · overlap 12/12 · mutation O · diff 테스트 2파일만 O · CI https://github.com/CuriocityDevAi/storeport/actions/runs/44571440718 success 24분59초

## 실행 로그

### 1. 파일 수정 (`apps/customer-display/e2e/cd-flow-overlap.spec.ts`)
```diff
-          if (!root || !globe) return null;
+          if (!root) return null;
+          if (!globe) return { globeMissing: true as const };
```
```diff
-        if (rects && rects.globeVisible) {
+        expect(rects, "screen root not found").not.toBeNull();
+        expect(rects?.globeMissing, "globe-button not found").toBeFalsy();
+
+        if (rects && !("globeMissing" in rects) && rects.globeVisible) {
```

### 2. git merge origin/main
- Merge made by 'ort' — 29파일 변경 (#400 · #403 반영)
- diff origin/main --name-only: 2파일
  - apps/commerce-core/integration-tests/pos/cd-full-flow.spec.ts
  - apps/customer-display/e2e/cd-flow-overlap.spec.ts

### 3. pnpm build:web
```
Exported: dist  (12 static routes)
```
성공

### 4. npx playwright test cd-flow-overlap
```
12 passed (5.1s)
```
12/12 통과

### 5. mutation 테스트
- globe testID → "globe-button-REMOVED" 로 변경 후 rebuild
- 결과: 12 failed (12/12 빨강) ✓
- 복구 후 rebuild: 12 passed ✓

### 6. push
```
7dde2c1  test(cd): globe-button missing → fail (M3-1119-Y)
→ origin/test/M3-1119-V-cd-flow-e2e push 완료
```

### 7. CI
- run ID: 44571440718
- feature-map-check: success (5m9s)
- ci (heavy-mac): success (24m59s)
- URL: https://github.com/CuriocityDevAi/storeport/actions/runs/44571440718
