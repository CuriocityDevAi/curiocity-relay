## M3-1105-BO — Playwright 15분 타임아웃 원인 수정

### 원인

**주요 원인**: `scripts/m3-1105-p-playwright.mjs` check (A-5)에서 `page.locator('[data-testid="payment-tab-qris-sublabel"]').innerText()` 호출 시 타임아웃 미지정.
M3-1105-BL(QRIS 탭 활성화)로 `sublabel` 엘리먼트가 DOM에서 제거됐음에도 `innerText()` 기본 30초 타임아웃이 적용되어 30s × 여러 라운드 = CI 25분 한계 초과.

**보조 원인**: `e2e/flows/06-payment-tabs-icons.spec.ts`에서 `navigateTo` 직후 `payment-method-tabs`를 바로 대기. `navigateTo`는 `/products` URL 도달 시 반환하므로 checkout 페이지 데이터 로드 완료를 보장하지 않음 → CI 타이밍에 따라 15s 타임아웃 위험.

### 수정 파일:줄

1. `scripts/m3-1105-p-playwright.mjs:278` — `innerText()` → `innerText({ timeout: 500 })` + assertion `qrisSub === ''`
2. `e2e/flows/06-payment-tabs-icons.spec.ts:19` — `payment-method-tabs` 대기 전 `tender-summary` 선 대기 추가 (Flow 1 패턴)

### 새 CI run

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/43279897286

### head SHA

1c919b3e3ffa4154cdedc46bad2eb8eaa49e995d
