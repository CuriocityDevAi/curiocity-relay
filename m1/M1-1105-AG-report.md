# M1-1105-AG Report

## 완료 항목

### REQ 1 · Toast.show → showToast 교체

**`app/checkout/success/[orderId].tsx`** (5곳)

| 위치 | 이전 | 이후 |
|------|------|------|
| onHandOver success | `Toast.show({ type: 'success', text1: 'Product handed over...', visibilityTime: 2000 })` | `showToast.success('Product handed over...', { visibilityTime: 2000 })` |
| onHandOver error | `Toast.show({ type: 'error', text1: 'Fulfill failed', text2: msg, visibilityTime: 4000 })` | `showToast.error('Fulfill failed', { text2: msg, visibilityTime: 4000 })` |
| onReprint | `Toast.show({ type: 'info', text1: 'Reprinted', text2: 'Receipt sent to printer', visibilityTime: 2000 })` | `showToast.info('Reprinted', { text2: 'Receipt sent to printer', visibilityTime: 2000 })` |
| onShare web | `Toast.show({ type: 'info', text1: 'Share (web preview)', text2: text.slice(0,80) })` | `showToast.info('Share (web preview)', { text2: text.slice(0, 80) })` |
| onShare error | `Toast.show({ type: 'error', text1: 'Share failed' })` | `showToast.error('Share failed')` |

**`components/orders/FulfillSheet.tsx`** (2곳)

| 위치 | 이전 | 이후 |
|------|------|------|
| onSubmit success | `Toast.show({ type: 'success', text1: label, visibilityTime: 2000 })` | `showToast.success(label, { visibilityTime: 2000 })` |
| onSubmit error | `Toast.show({ type: 'error', text1: 'Fulfill failed', text2: msg, visibilityTime: 4000 })` | `showToast.error('Fulfill failed', { text2: msg, visibilityTime: 4000 })` |

### REQ 2 · 문구 무변경

text1·text2 모두 원문 그대로 유지.

### REQ 3 · 어설션 스크립트

`scripts/m1-1105-ag-assertions.mjs` 생성 — 26/26 PASS (run-all 회귀 포함).

앱 전체 남은 `Toast.show` 직접 호출: **없음** (§3 목록 비어 있음).

## 검증

- 어설션 26/26 PASS
- Playwright/웹 미검증 — React Native 전용 화면, 캡슐 토스트는 네이티브 런타임에서만 렌더링

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/76
