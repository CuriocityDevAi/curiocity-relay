m3-1105-aa 낡은 어설션 · vitest 기존 2건 해소 · 제품 코드 변경 0 · PR #223

## 판정: 낡은 어설션 (화면 회귀 아님)

`success-actions-secondary` View의 `flexDirection: 'row'` + `flexWrap: 'wrap'` 구조는 현재도 유지됨.
M2-1119-W 커밋에서 `alignItems: 'center'` 추가 후 Prettier가 style 속성을 멀티라인으로
reformatting → `<View style={{` 가 `<View\n  style={{` 형태로 바뀌어 regex `<View style=` 불일치.

## 수정 내역

### 1. `scripts/m3-1105-aa-assertions.mjs` — 낡은 regex 수정

```diff
-  /<View style=\{\{[^}]*flexDirection:\s*['"]row['"][^}]*flexWrap:\s*['"]wrap['"][^}]*\}}\s+testID="success-actions-secondary"/.test(
+  /<View\s+style=\{\{[^}]*flexDirection:\s*['"]row['"][^}]*flexWrap:\s*['"]wrap['"][^}]*\}}\s+testID="success-actions-secondary"/.test(
```

결과: 32/32 passed (이전 31/32)

### 2. `__tests__/m1-1117-e-slip-flow.test.ts` — 상태 격리 (반환형 불일치)

M2-1119-AC에서 `signalSplitQrisFirstDone()`이 payload를 받도록 변경되면서
`consumeSplitQrisFirstDone()`이 `SplitQrisFirstPayload | null` 반환으로 바뀌었으나
테스트는 boolean(`true`/`false`) 기대값으로 남아 있었음.

```diff
-    expect(consumeSplitQrisFirstDone()).toBe(true);
+    expect(consumeSplitQrisFirstDone()).not.toBeNull();
-    expect(consumeSplitQrisFirstDone()).toBe(false);
+    expect(consumeSplitQrisFirstDone()).toBeNull();
```

### 3. `vitest.config.ts` — Playwright spec 오탐 방지

```diff
-    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
+    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**', 'docs/**'],
```

`docs/plans/splitview-capture.spec.ts` 는 Playwright 파일이지만 `e2e/**` exclude 밖에 위치해 vitest에 잡혔음.

## CI 상태

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/223
- assertions ✅ 로컬 검증 완료 (32/32)
- playwright 실행 여부: CI run 대기 중 — 미검증 (PR CI 에서 확인 필요)
- 제품 코드 변경: 0건
