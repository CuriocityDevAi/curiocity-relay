# M1-1125-W Report — admin-smoke 24건 CI 실패 수정

**날짜**: 2026-11-25  
**브랜치**: feat/M1-1125-W  
**PR**: https://github.com/CuriocityDevAi/storeport/pull/447  
**커밋**: f039bf6

---

## 요약

`e2e-admin-loyalty` CI 스텝 (`pnpm test:e2e:admin`) 에서 발생하던 24건 전체 실패를 수정했다.  
단일 root cause: `vite.smoke.config.ts`에 `@storeport/receipt-view-model` alias 누락.

---

## 재현 확인

### 환경 세팅
- 워크트리: `/Users/kyu.lee/projects/curiocity-relay-wts/M1-1125-W`
- `node_modules/@storeport/receipt-view-model` symlink 제거 (CI 환경 시뮬레이션)
- `vite.smoke.config.ts` 수정 전 상태로 테스트

### 재현 에러
```
Error: The following dependencies are imported but could not be resolved:
  @storeport/receipt-view-model (imported by ...SettingImpactPreviewModal.tsx)
Are they installed?
```

vite 서버 크래시 → Playwright webServer 미시작 → 모든 테스트가 "서버 없음"으로 실패.

---

## 원인 분석

### Root Cause
M0-1125-N 핫픽스가 `apps/commerce-core/package.json`에서 `@storeport/receipt-view-model` 의존성을 제거했다. 이때 `medusa-config.ts`에는 `resolve.alias`를 추가했지만, `vite.smoke.config.ts`는 완전히 별개의 Vite 인스턴스이므로 누락됐다.

### 왜 로컬에서는 통과했나
`pnpm install` 이전에 leftover workspace symlink(`node_modules/@storeport/receipt-view-model`)가 남아있었기 때문. CI는 fresh install이므로 symlink가 없다.

### 의존성 체인
```
vite.smoke.config.ts (harness 서버)
  → harness-smoke/main.tsx
    → PosSettingsPage
      → SettingImpactPreviewModal.tsx
        → import { resolveReceiptView } from "@storeport/receipt-view-model"  ← FAIL
```

---

## 분류표 (24건)

| 분류 | 건수 | 세부 |
|------|------|------|
| Build config bug | 24 | `vite.smoke.config.ts` alias 누락 → vite crash → 전체 실패 |
| Test 코드 오류 | 0 | — |
| 실제 버그 | 0 | — |

24건 모두 동일 단일 root cause. 테스트 로직 자체에는 문제 없음.

---

## 수정 내용

**파일**: `apps/commerce-core/e2e/vite.smoke.config.ts`

```diff
+import path from "path";
 
 export default defineConfig({
   ...
+  resolve: {
+    alias: {
+      // M1-1125-W: M0-1125-N added this alias to medusa-config.ts but missed
+      // vite.smoke.config.ts — CI has no workspace symlink so all 24 tests crashed.
+      "@storeport/receipt-view-model": path.resolve(
+        __dirname,
+        "../../../packages/receipt-view-model/src/index.ts",
+      ),
+    },
+  },
 });
```

`medusa-config.ts`와 동일한 패턴. `__dirname` = `apps/commerce-core/e2e/` 기준으로 `../../../packages/receipt-view-model/src/index.ts`가 workspace 소스를 직접 가리킴.

---

## 검증 결과

```
$ CI=true npx playwright test --config playwright.smoke.config.ts
Running 25 tests using 1 worker
  1 skipped   (Screen 2 · M0-1116-B — 기존 skip, 무관)
  24 passed (16.2s)
```

**조건**: symlink 제거 상태 (CI 환경 시뮬레이션), `CI=true` 플래그 적용.

---

## 참조

| 항목 | 내용 |
|------|------|
| M0-1125-N | receipt-view-model을 package.json에서 제거한 핫픽스 (alias를 medusa-config.ts에만 추가) |
| M1-1125-V | 24건 실패 최초 보고 (CI run 45605306871, 45605358493) |
| PR #447 | 이번 수정 PR |
