# M1-1123-B · POS 미러링 미리보기 창 진단 + 수정

뿌리: WebView 가 로드하는 `/customer-display-web/mirror` 가 mirror 라우트 번들이 아니라 **index 번들**을 받음 → `pos-mirror` CustomEvent listener 등록 안 됨 → POS 가 아무리 `injectJavaScript` 해도 아무도 못 받아 화면 전환 0.

보조 뿌리: fork#226 (M2-1121-E) 미머지 → 서버 snapshot 이 null 일 때 `CdPreviewOverlay` 가 `pos_screen` 을 덮어쓰지 못해 전이 자체가 생성 안 됨. 둘 다 고쳐야 완결.

관련 PR:
- fork#227 (이 라운드 M1) — WebView URL `.html` 명시. https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/227
- fork#226 (M2 선 머지 필요) — CdPreviewOverlay 로컬 힌트 주입. https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/226
- 서버 영구 패치 (M0 소관) — commerce-core middlewares.ts `cdwResolveFile()` extensionless → `<path>.html` 폴백. 아래 §서버 패치.

---

## 고리 조사 결과

| 고리 | 상태 | 증거 |
|------|------|------|
| 1. snapshot API (`GET /admin/pos/registers/:id/snapshot`) | **동작** | storeport#411 (M0-1121-D) 이 `sloc_` 접두어 분기 추가 · origin/main 에 머지 (`54279de`). 운영 `curl -sI /admin/pos/registers/sloc_nonexistent/snapshot` → `401 Unauthorized` (라우트 존재 확인, auth 는 있어야 통과). 기존 M2-1121-E 진단에서 식별된 `null 고정` 버그는 해소. |
| 2. WebView URL `/mirror` | **끊김 (뿌리 1)** | 운영 실측: `curl -s https://admin.meros.id/customer-display-web/mirror \| grep .js` → `index-dc791642…js`. `.../mirror.html` → `mirror-d0324e4246…js`. commerce-core `apps/commerce-core/src/api/middlewares.ts:94-98` `cdwResolveFile()` 가 extensionless 경로에 대해 `<path>.html` 을 시도하지 않고 `index.html` SPA fallback 반환. Expo static export 는 `mirror.html` 파일로 생성(preload 확인). |
| 3. injectJavaScript ↔ pos-mirror listener | **설계는 정상** | fork `components/cd-preview/CdPreviewWindow.tsx:131-137` 가 `onLoadEnd` 와 `[snapshot, webReady]` 두 트리거로 `window.dispatchEvent(new CustomEvent('pos-mirror',{detail:...}))` 주입. storeport `apps/customer-display/app/mirror.tsx:28-41` 가 `window.addEventListener('pos-mirror', …)` 로 수신. 이벤트 이름 · detail 모양 일치. **but 고리2 때문에 mirror.tsx 자체가 로드 안 됨 → listener 미등록**. |
| 4. 미러 아키텍처 | **주입만 받음 (서버 폴링 X)** | `mirror.tsx:28-41` — 서버 호출 없음. 100% POS 가 보내는 snapshot 에 의존. `posScreenToDisplay(pos_screen)` → 기존 화면 컴포넌트(CartScreen/QrisScreen/ReceiptScreen/KeypadScreen/DoneScreen/MainScreen) 재사용. 손님 화면 앱과 동일 state machine 재활용은 아니지만, **동일한 화면 컴포넌트** 사용. 그래서 서버 snapshot 모양이 고리1 통과하면 "픽셀 동일" 성립. |
| 5. fork#226 관계 | **미머지 — 보조 뿌리** | #226 가 추가하는 11 줄은 `usePosScreenHint()` 를 `CdPreviewOverlay` 에 끌어와 서버 snapshot 위에 로컬 `pos_screen` 덮어씌움. 현재 master 의 `CdPreviewOverlay` 는 서버 snapshot 만 읽음(§코드 증거 하단). 서버 `/admin/pos/registers/:id/snapshot` 이 null 을 반환하는 순간(세션 없음 · 손님 화면 미연결 등)에 미리보기가 얼어붙는 원인. `setPosScreenHint` 호출은 이미 `cart.tsx/products.tsx/checkout/[draftOrderId].tsx/tender-qris/[…]/success/[orderId].tsx` 전부에 wiring 완료되어 있음 — 유일한 미연결 지점이 Overlay. |
| 6. 실기 차이 (iPad/Android WebView) | **별도 이슈 아님** | 고리2 가 모든 플랫폼에서 동일하게 index 를 반환 → iOS/Android 공통 증상. mixed content/쿠키/CSP 개입 없음 (HTTPS 단일 도메인). |

---

## 수정 내역

### 1. fork#227 — WebView URL `.html` 명시 (이 라운드)

- 브랜치: `fix/M1-1123-B-cd-preview-mirror-url` (origin/master 에서 분기)
- 커밋: `85dee2e`
- 파일: `components/cd-preview/CdPreviewWindow.tsx` (10줄: 주석 + 1 토큰)

```diff
-const MIRROR_URL = `${MEROS_CD_WEB_URL}/mirror`;
+const MIRROR_URL = `${MEROS_CD_WEB_URL}/mirror.html`;
```

**머지 순서**: 반드시 #226 → #227 순. #226 선행이 아니면 서버 snapshot null 인 시나리오(손님 화면 미연결 · 세션 open 직후 등)에서 여전히 전환 X.

### 2. fork#226 (M2 선 머지) — CdPreviewOverlay 로컬 힌트 주입

M1 수정 범위 밖. M2 소관. 현재 OPEN. PR 본문의 11줄 `CdPreviewOverlay.tsx` 패치가 유일한 핵심 (나머지 20+ 파일은 M0/M3 contamination).

### 3. 서버 영구 패치 (M0 소관 · 코드 수정 금지)

`storeport apps/commerce-core/src/api/middlewares.ts` `cdwResolveFile()`:

```diff
 function cdwResolveFile(requested: string): string | null {
   if (existsSync(requested) && !statSync(requested).isDirectory()) {
     return requested;
   }
   if (existsSync(requested) && statSync(requested).isDirectory()) {
     const idx = join(requested, "index.html");
     if (existsSync(idx)) return idx;
   }
   // SPA fallback only for extension-less paths; assets (.js/.css/etc.) → 404
   if (extname(requested)) return null;
+  // M1-1123-B · Expo static export 는 route 당 `<name>.html` 을 생성(e.g. mirror.html).
+  // index.html SPA fallback 으로 돌기 전에 같은 파일명의 .html 변형을 먼저 시도.
+  const htmlVariant = requested + ".html";
+  if (existsSync(htmlVariant)) return htmlVariant;
   const fallback = join(CDW_BASE, "index.html");
   return existsSync(fallback) ? fallback : null;
 }
```

이 패치가 머지되면:
1. POS `/mirror` (확장자 없는 경로) 가 정상 동작 → fork 쪽 `.html` 명시 되돌려도 됨
2. 앞으로 추가되는 Expo router 라우트(`/some-route`) 도 모두 올바른 번들을 받음
3. decor-preview, keypad-after 등 기존 라우트도 동일 이득

리스크: 없음 (기존 동작은 extensionless 경로를 index 로 날리고 있었고, `<path>.html` 미존재 시 기존 fallback 그대로 적용).

---

## 재현 로그 / 실측 증거

### 1. 운영 URL 비교 (2026-11-23 07:02 UTC)

```
$ curl -s https://admin.meros.id/customer-display-web/mirror | grep -oE 'static/js/web/[^"]*\.js' | sort -u
static/js/web/__common-c6019b74beda6f6753fe44ff21ed4d41.js
static/js/web/__expo-metro-runtime-8c088df87a31e4e6accd81c554ec290d.js
static/js/web/_layout-18097bd79b68675efcd7d6a14bbd12d6.js
static/js/web/entry-51f8c5eeb5e757f8dbdf19f807019ad8.js
static/js/web/index-dc791642ff36bdec8ffdd80d4ecfc98a.js        ← ★ mirror 가 아닌 index

$ curl -s https://admin.meros.id/customer-display-web/mirror.html | grep -oE 'static/js/web/[^"]*\.js' | sort -u
static/js/web/__common-c6019b74beda6f6753fe44ff21ed4d41.js
static/js/web/__expo-metro-runtime-8c088df87a31e4e6accd81c554ec290d.js
static/js/web/_layout-18097bd79b68675efcd7d6a14bbd12d6.js
static/js/web/entry-51f8c5eeb5e757f8dbdf19f807019ad8.js
static/js/web/mirror-d0324e4246ba8181d88dde46f58032b4.js       ← ★ 올바른 mirror 번들

$ curl -sI https://admin.meros.id/customer-display-web/_expo/static/js/web/mirror-d0324e4246ba8181d88dde46f58032b4.js
HTTP/1.1 200 OK                                                  ← 번들은 배포돼 있음
Content-Type: application/javascript; charset=utf-8
```

→ 번들 자체는 배포 OK. 라우팅만 깨짐.

### 2. 코드 증거 (고리별)

**고리2 · commerce-core middleware (storeport-m1 origin/main):**
```ts
// apps/commerce-core/src/api/middlewares.ts:86-98
function cdwResolveFile(requested: string): string | null {
  if (existsSync(requested) && !statSync(requested).isDirectory()) return requested;
  if (existsSync(requested) && statSync(requested).isDirectory()) {
    const idx = join(requested, "index.html");
    if (existsSync(idx)) return idx;
  }
  if (extname(requested)) return null;
  const fallback = join(CDW_BASE, "index.html");
  return existsSync(fallback) ? fallback : null;   // ← /mirror 가 여기로 떨어짐
}
```

**고리3 · POS WebView 주입 (fork origin/master):**
```ts
// components/cd-preview/CdPreviewWindow.tsx:122-129
React.useEffect(() => {
  if (!webReady || !snapshot || !webViewRef.current) return;
  const js = `window.dispatchEvent(new CustomEvent('pos-mirror',{detail:${JSON.stringify(snapshot)}}));true;`;
  webViewRef.current.injectJavaScript(js);
}, [snapshot, webReady]);
```

**고리3 · storeport mirror listener (origin/main):**
```ts
// apps/customer-display/app/mirror.tsx:28-41
useEffect(() => {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  function handleMirror(e: Event) {
    const detail = (e as CustomEvent).detail as OrderSnapshot;
    if (detail && typeof detail === "object") setSnapshot(detail);
  }
  window.addEventListener("pos-mirror", handleMirror);
  return () => window.removeEventListener("pos-mirror", handleMirror);
}, []);
```

**고리5 · 현재 master CdPreviewOverlay (hint 미주입, #226 미머지):**
```ts
// components/cd-preview/CdPreviewOverlay.tsx (origin/master)
const { data: snapshot, dataUpdatedAt } = useCustomerDisplaySnapshot(stockLocationId);
// snapshot = null 이면 그대로 null 을 Window 로 → injectJavaScript 조건 false → 전이 X
return <CdPreviewWindow … snapshot={snapshot ?? null} … />;
```

### 3. Playwright 실측 불가 사유

- 이 보고서 작성 환경에 playwright 브라우저 미설치 (fork e2e 환경 전용)
- 운영 URL 로 Playwright 돌려도 WebView 는 iframe 이 아닌 네이티브 컴포넌트라 fork e2e 로는 inject 결과 검증 불가 · storeport 쪽 e2e(`mirror-M2-1121-E.spec.ts`)가 이미 통과(#226 PR 본문)
- 서버 측 수정 영향은 `curl -s /mirror` 전/후 preload JS 비교로 1 커맨드 재현 가능 (§재현 로그 1)

---

## 남은 Kyu 실기 절차

머지 완료(**#226 → #227 순**) + preview APK 재빌드 후 OPPO/iPad 에서:

### 정상이면 보이는 것

1. **홈 화면 (품목 없음) · 우측 상단 배지 "Offline" 또는 "Entering"** — 서버 snapshot 이 없으므로
   - 배지 누름 → 창 열림 → **MainScreen 로고 원 (노란 배경)** · 손님 화면 켜져 있으면 같은 화면
2. **품목 추가 → 장바구니 Review** — `setPosScreenHint({ pos_screen: 'cart_review' })` 동작
   - 창: **CartScreen (품목 목록 · 소계)** · 손님 화면과 동일 레이아웃
3. **Checkout → QRIS 선택** — `setPosScreenHint({ pos_screen: 'payment_qris', extras: { qr_string, amount } })`
   - 창: **QrisScreen · QR 코드 그림 + 금액** · POS 가 보는 QR 과 같은 그림
4. **결제 완료 (success)** — `setPosScreenHint({ pos_screen: 'paid' })`
   - 창: **ReceiptScreen · 거래 요약 + Earn** · 손님 화면과 같은 화면
5. **Next customer 누름** — `setPosScreenHint(null)`
   - 창: **MainScreen 로고 원 복귀**

### 비정상 신호 (로그 포인트)

- 1~5 모두 노란 MainScreen 고정 → 서버 URL 접근 확인 (`.html` 적용 여부) · WebView 콘솔 로그
- 2~3 만 안 바뀌고 4 는 전환 → `setPosScreenHint` 호출 지점 재확인 (cart.tsx / tender-qris.tsx)
- 배지 "Offline" 계속 — Kyu 가 "손님 화면 미연결" 상태라면 **정상** (classifyCustomerDisplay 기준). 손님 화면 폰 켜고 pair 후에도 Offline 이면 §고리1 재점검 (snapshot 401 or network)

### 서버 패치 적용 시점

- M0 가 §수정 §3 적용 + commerce-core 재배포 → fork 쪽 `.html` 명시는 여전히 동작(멱등). 다음 M1 라운드에서 `/mirror` 로 되돌리는 clean-up PR 열면 됨.
