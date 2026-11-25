PASS

## M1-1125-AD — /cd-sync 절대경로 baseUrl 버그 수정

### #448 new HEAD
`a5a762ca21853d77ac7638c7042f9ab057e0ed22`
Branch: `feat/M1-1125-AB-base-url-pair-redirect`

### grep 결과 — 잔존 window.location 이동 패턴
```
# apps/customer-display 전체 grep (window.location.replace / window.location.href =)
apps/customer-display/app/index.tsx:435:  // M1-1125-AB: window.location.replace("/pair") ... (주석만)
# → 실제 이동 목적 window.location 사용 없음. 클린.
```

읽기 전용 `window.location.search` 사용(qris.tsx, _layout.tsx, useActiveEvent.ts, adapter.ts)은
baseUrl과 무관하므로 수정 불필요.

### 수정 내용
**apps/customer-display/app/index.tsx** (line 59–65)
```diff
-    if (Platform.OS === "web" && typeof window !== "undefined") {
-      // Forward all params to the cd-sync route
-      window.location.replace("/cd-sync" + window.location.search);
-    } else {
-      router.replace("/cd-sync");
-    }
+    // M1-1125-AD: window.location.replace bypassed baseUrl ("/customer-display-web").
+    // router.replace correctly resolves to /customer-display-web/cd-sync.
+    router.replace(
+      Platform.OS === "web" && typeof window !== "undefined"
+        ? "/cd-sync" + window.location.search
+        : "/cd-sync",
+    );
```

### Playwright 결과
```
3 passed (8.4s)
✓ ① / 진입 → pair 화면 뜸 (Cannot GET /pair 없음)
✓ ② /pair 직접 새로고침 → pair 화면 뜸 (SPA fallback)
✓ ③ /?mock=1&flow=cd-sync → /customer-display-web/cd-sync 로 리다이렉트
```

### 스크린샷
`apps/customer-display/screenshots/base-url-fix/03-cd-sync-baseurl-preserved.png`
— `payment_phase=building, customer_flow=none` 상태로 OrderListScreen 정상 렌더.
URL: `http://localhost:4173/customer-display-web/cd-sync?mock=1&flow=cd-sync&payment_phase=building&customer_flow=none`
(루트 `/cd-sync` 아님 확인)
