# M3-1105-BO · playwright 타임아웃 원인 수정

## 원인

### 원인 1: `scripts/m3-1105-p-playwright.mjs:273-279` — innerText() 30s 블로킹

BN(M3-1105-BN)에서 QRIS 탭이 `enabled: true`로 변경되며 `payment-tab-qris-sublabel` DOM 요소가 삭제됨.  
기존 코드:
```js
await page.locator('[data-testid="payment-tab-qris-sublabel"]').innerText().catch(() => '')
```
Playwright `locator.innerText()`의 디폴트 타임아웃은 **30초**. 요소가 없으면 30s 대기 후 throw.  
`.catch(() => '')`가 최종 처리하지만 그 전에 30s가 소비됨.

master CI: playwright 잡 ~24분대 → BN에서 +30s → 25분 한계 초과 → job timeout.

### 원인 2: `e2e/flows/06-payment-tabs-icons.spec.ts:19-26` — 타임아웃 합산 초과

```
navigateTo → waitForFunction: 최대 20s
expect(tabs).toBeVisible: 최대 15s
expect(payment-tab-cash): 최대 5s
expect(payment-tab-card): 최대 5s
expect(payment-tab-qris): 최대 5s
─────────────────────────────────────
합산 최대: 50s  >  test timeout 45s
```
CI 고부하 환경에서 각 대기가 최대값에 근접하면 `Test timeout of 45000ms exceeded`.

## 수정 내용

### `scripts/m3-1105-p-playwright.mjs`
- `innerText({ timeout: 500 })` 추가 — 요소 미존재 시 0.5s 후 throw, 30s 블로킹 제거
- 어설션을 "sublabel 없음(QRIS 활성화)" 검증으로 갱신 (BN 이후의 올바른 상태 반영)

### `e2e/flows/06-payment-tabs-icons.spec.ts`
- 개별 탭 `page.getByTestId('payment-tab-*')` with `{ timeout: 5_000 }` →  
  `tabs.getByTestId('payment-tab-*')` 스코프 로케이터(타임아웃 없음)으로 변경
- 컨테이너(`payment-method-tabs`)가 가시화된 후 자식 탭은 이미 렌더됨 → 즉시 확인
- 합산 최대: 20s + 15s + ~0s = **35s** (test timeout 45s 이하)

## 새 CI run

- branch: `feat/m3-1105-bn-payment-tabs-icon`
- head SHA: `f8a5b4b`
- push: `40413d0 → f8a5b4b`
