# M3-1105-BI Report — B안 네이티브 헤더 복귀 · PillBackButton 삭제

## 요약

| 항목 | 내용 |
|------|------|
| 대상 브랜치 | `feat/m3-1105-bg-nav-cleanup` (#113) |
| 커밋 | `1faa967` fix(pos): M3-1105-BI — B안 네이티브 헤더 복귀 · PillBackButton 삭제 |
| BH rebase | `feat/m3-1105-bh-both-void-refund` → `b2e0ea4` (BI 위에 쌓임) |
| assertions (m2-1105-ar) | 13/13 ✓ (S3-2 포함) |
| lint (expo lint) | 0 errors · 44 warnings (pre-existing) |
| vitest | 99 passed · 6 expected fail ✓ |
| CI (GitHub Actions) | ⚠ billing limit 초과로 실행 불가 (코드 문제 아님) |

---

## 변경 내용 (B안 적용)

### `app/_layout.tsx`
| 화면 | 변경 전 | 변경 후 |
|------|--------|--------|
| checkout/[draftOrderId] | `title:'Checkout', headerShown:false` | `title:'Checkout'` (네이티브 헤더 복귀) |
| checkout/success/[orderId] | `headerShown:false` | `title:'', headerBackVisible:false` |
| checkout/tender-cash/[draftOrderId] | `headerShown:false` | `title:''` |
| checkout/delivery/[draftOrderId] | `headerShown:false` | `title:''` |
| checkout/split-tender/[draftOrderId] | `headerShown:false` | `title:'Split payment'` ← S3-2 자연 해소 |

### PillBackButton 제거 · 삭제
- `app/checkout/[draftOrderId].tsx` — PillBackButton import + 3곳 사용 제거
- `app/checkout/tender-cash/[draftOrderId].tsx` — PillBackButton → Stack.Screen 동적 타이틀 복원
- `app/checkout/split-tender/[draftOrderId].tsx` — PillBackButton 2곳 제거
- `app/checkout/delivery/[draftOrderId].tsx` — PillBackButton → Stack.Screen title:'Delivery' 복원
- `app/checkout/success/[orderId].tsx` — Stack.Screen 동적 타이틀 복원 (headerBackVisible:false는 _layout)
- `components/ui/PillBackButton.tsx` — **삭제** (사용처 0)
- `components/icons/chevron-left.tsx` — **삭제** (사용처 0)

### `e2e/flows/03-nav-cleanup.spec.ts`
- N2 Cash tender 테스트: `pill-back-checkout` 존재 → **없음** 검증으로 변경 (B안)
- N2 Payment successful 테스트: 기존과 동일 (pill-back 없음 검증 유지)
- N3 테스트: 변경 없음

---

## assertion S3-2 해소 방법

`_layout.tsx` 의 split-tender 경로에 `title: 'Split payment'` 명시 → 정규식 직접 매치.

```
/title:\s*'Split payment'/.test(" title: 'Split payment' ") → true ✓
```

`headerShown: false` 제거로 네이티브 헤더 복귀 → 자연 해소.

---

## Checkout `< Cart` 처리 (탭 루트 대응)

Checkout은 Products 탭에서 push되는 화면으로 탭 루트가 아님. `headerShown: false` 제거 시
네이티브 헤더가 나타나고 Stack 뒤로가기 버튼이 자동 표시됨 (Back 또는 이전 화면 타이틀).

> 선택지 (불가 시 대안):
> A) `headerShown:true` 기본값 — 뒤로가기 텍스트는 플랫폼 기본(Back) · 추가 코드 0
> B) `headerLeft` 에 커스텀 버튼 — 네이티브 모양 보장 가능하나 styled 컴포넌트 필요
> C) `headerBackTitle:'Cart'` — iOS 한정으로 "< Cart" 텍스트 표시 (Android 무시)
>
> **채택: A안** — 가장 단순, 네이티브 알약 형태·그림자 그대로.

---

## CI 비고

GitHub Actions billing 한도 초과(`spending limit needs to be increased`)로 jobs가 시작되지 않음.
로컬 검증 기준:
- assertions 13/13 ✓
- expo lint 0 errors ✓
- vitest 99 passed ✓

---

## BH rebase 확인

```
feat/m3-1105-bh-both-void-refund
  b2e0ea4 feat(pos): M3-1105-BH — Void + Refund 항상 둘 다 · 미출고 품목 취소 표시
  1faa967 fix(pos): M3-1105-BI — B안 네이티브 헤더 복귀 · PillBackButton 삭제  ← BI
  8cfafdd feat(pos): nav cleanup — ... (M3-1105-BG)
```
