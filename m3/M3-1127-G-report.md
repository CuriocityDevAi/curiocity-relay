# M3-1127-G Report

**Branch:** fix/M3-1127-G-sheet-typing-dots  
**PR:** https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/288  
**Date:** 2026-11-27

---

## Bug 1 — 상품 시트 최상단 방지

**Root cause:** `app/product-details.tsx` 이미지 캐러셀 `height = Math.round(width * 0.75)` 무제한. 390px 뷰포트 기준 ~292px → BottomSheet 콘텐츠가 maxHeight(≈743px)에서 여유 없이 가득 차 시트가 화면 맨 위(Y≈68px)까지 올라감.

**Fix:** `IMAGE_MAX_H = Math.round(screenHeight * 0.26)` (~221px on 852px screen) 상한 추가.

```tsx
// app/product-details.tsx
const { height: screenHeight } = useWindowDimensions();
const IMAGE_MAX_H = Math.round(screenHeight * 0.26);
const height = Math.min(Math.round(width * 0.75), IMAGE_MAX_H);
```

**Spec-guard:** `SELL-PRODUCT-SHEET-POS` — PW 렌더 bgDiv.getBoundingClientRect().y ≥ 100px. 수정 전 68px(FAIL) → 수정 후 ≥100px(PASS).

---

## Bug 2 — 타이핑 칩 `#N ·` 프리픽스 + 접근성 라벨

**Root cause:** v1.4 `CustomerFlowChip`이 `posOrderNum` prop을 받지 않아 `entering/first_visit` 상태에서 `0813 80` 만 표시. 접근성 라벨에 "typing" 없음.

**Fix:** `CustomerPhoneStatus → CustomerFlowChip`에 `posOrderNum` 전달. `entering` 상태 렌더:

```tsx
// components/customer-display/CustomerPhoneStatus.tsx
const numLabel = posOrderNum != null ? `#${posOrderNum}` : '';
const prefix = numLabel ? `${numLabel} · ` : '';
// display: `${prefix}${partial}` → "#3 · 0813 80"
// accessibilityLabel: `${prefix}typing ${partial}` → "#3 · typing 0813 80"
```

**Spec-guard:** `POS-TYPING-DOTS` — PW 렌더 `cd-phone-status-dots` count > 0. 점 3개 JSX 제거 시 count=0 → FAIL (검증의 검증 충족).

---

## 변경 파일

| 파일 | 변경 |
|------|------|
| `app/product-details.tsx` | IMAGE_MAX_H 상한 |
| `components/customer-display/CustomerPhoneStatus.tsx` | posOrderNum → CustomerFlowChip |
| `scripts/m3-1126-k-phone-status-playwright.mjs` | POS-TYPING-DOTS PW 어설션 |
| `scripts/spec-guard-pos-playwright.mjs` | SELL-PRODUCT-SHEET-POS PW 어설션 |
| `scripts/spec-guard-map.json` | POS-TYPING-DOTS · SELL-PRODUCT-SHEET-POS 등록 |

---

## CI

PR #288 푸시 완료. CI 결과 대기 중.
