# M1-1123-C · POS 미러링 미리보기 2-뿌리 수정

판정: **완료** — PR #229 열림 · #226 · #227 close 완료

---

## PR

- **fork PR #229**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/229
  - base: `master` · head: `fix/M1-1123-C-cd-preview-mirror`
  - 변경 파일 2개: `components/cd-preview/CdPreviewWindow.tsx` · `components/cd-preview/CdPreviewOverlay.tsx`

---

## 커밋

| 커밋 | 내용 |
|------|------|
| `004b2be` | fix(cd-preview): M1-1123-B — mirror WebView URL `/mirror.html` 명시 (Root 1 cherry-pick from #227) |
| `fc06ad6` | fix(cd-preview): M1-1123-C — CdPreviewOverlay 로컬 POS 힌트 주입 (Root 2) |

---

## 적용 diff

### 뿌리 1 — `components/cd-preview/CdPreviewWindow.tsx`

```diff
-const MIRROR_URL = `${MEROS_CD_WEB_URL}/mirror`;
+const MIRROR_URL = `${MEROS_CD_WEB_URL}/mirror.html`;
```

### 뿌리 2 — `components/cd-preview/CdPreviewOverlay.tsx`

```diff
+// M1-1123-C · 서버 snapshot null 이어도 로컬 POS 화면 힌트로 pos_screen 덮어씌움 — 손님 화면 미연결 시에도 미리보기 작동.
+import { usePosScreenHint } from '@/hooks/usePosScreenAutoEmit';
 …
+  const hint = usePosScreenHint();
+
+  // 로컬 pos_screen 힌트를 서버 snapshot 에 덮어씌운다. hint 없으면 서버 snapshot 그대로.
+  const liveSnapshot = React.useMemo(() => {
+    const ps = hint?.pos_screen ?? null;
+    if (!ps) return snapshot ?? null;
+    return { ...(snapshot ?? {}), pos_screen: ps, ...(hint?.extras ?? {}) };
+  }, [snapshot, hint?.pos_screen, hint?.extras]);
 …
-      snapshot={snapshot ?? null}
+      snapshot={liveSnapshot}
```

---

## CI 결과 (PR #229)

| 체크 | 상태 |
|------|------|
| route (lint workflow) | ✅ pass |
| route (CI workflow) | ✅ pass |
| lint | ⏳ pending |
| assertions | ⏳ pending |
| flow-tests | ⏳ pending |
| heavy-cloud | skipping |

어설션 파일: `CdPreviewWindow.test.ts` / `cd-preview.spec.ts` — MIRROR_URL · liveSnapshot 에 대한 직접 어설션 없음. 기존 testID 기반 어설션은 영향 없음. CI 완료 후 fail 발생 시 동일 PR 에서 갱신 예정.

---

## #226 · #227 close 여부

| PR | 조치 |
|----|------|
| #226 (M2-1121-E · base 오염 · 27파일) | ✅ 코멘트 후 close |
| #227 (M1-1123-B · 뿌리1만) | ✅ 코멘트 후 close |

---

## 서버 영구 패치 diff (M0 소관 · 이 PR 범위 밖)

`storeport apps/commerce-core/src/api/middlewares.ts` `cdwResolveFile()`:

```diff
   if (extname(requested)) return null;
+  // M1-1123-B · Expo static export 는 route 당 `<name>.html` 을 생성(e.g. mirror.html).
+  // index.html SPA fallback 으로 돌기 전에 같은 파일명의 .html 변형을 먼저 시도.
+  const htmlVariant = requested + ".html";
+  if (existsSync(htmlVariant)) return htmlVariant;
   const fallback = join(CDW_BASE, "index.html");
   return existsSync(fallback) ? fallback : null;
```

패치 적용 후: `/mirror` (확장자 없음) → `mirror.html` → 올바른 bundle. fork 쪽 `.html` 명시는 그 뒤에도 멱등.

---

## Playwright 비고

WebView 는 RN 네이티브 컴포넌트이므로 fork e2e(Playwright web)로 `injectJavaScript` 결과 직접 검증 불가. Kyu 실기(OPPO/iPad · 담기 → QRIS → 완료 화면 전환 확인)로 최종 검증 예정.
