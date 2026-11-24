---
claim: M3-1121-C
agent: claude-sonnet-4-6
date: 2026-11-21
---

Split/Pay 높이 = Hand over ±2px O · 홈 머리 3버튼 O · 높이 어설션 추가 O · #225 커밋 8a92012

## 변경 요약

### 1. Checkout Pay 바 — `app/checkout/[draftOrderId].tsx`

| 항목 | 이전 | 이후 |
|---|---|---|
| Split 버튼 라벨 | `Split payment` (390dp 2줄 줄바꿈) | `Split` (1줄 고정) |
| numberOfLines | 없음 | `numberOfLines={1}` (안전장치) |
| flex-row alignItems | stretch (기본, 옆 버튼 stretch) | `alignItems: 'flex-start'` |

원인: `Split payment` → 390dp flex:1 버튼 콘텐츠 영역 ~82px에서 2줄 줄바꿈 →  
버튼 키 ~88px(2줄), Hand over ~60px과 1.4배 차이. `Split`(단어 1개)으로 단축 → 60px 일치.

### 2. 홈 머리 3버튼 — `app/(tabs)/products.tsx`

| 항목 | 이전 | 이후 |
|---|---|---|
| 레이아웃 | Pickup·Close·Next customer 한 줄 flex 1:1:2 | Pickup·Close 행 1 + Next customer 독립 풀폭 행 2 |
| Next customer 폭 | flex:2 (2× 넓어 "너무 큼") | 풀폭 (1행 단독) |

Pickup·Close는 행 1에 flex:1씩, Next customer는 행 2에 풀폭으로 분리.  
풀폭이므로 텍스트 줄바꿈 없이 Hand over와 동일 높이(60px) 유지.

### 3. Playwright 어설션 강화 — `e2e/flows/M3-1121-B-btn-height.spec.ts`

새 describe 블록 `M3-1121-C · 버튼 높이 Hand over 기준 ±2px` 추가:
- 성공 화면 Hand over 높이 기준 측정 → 홈(Pickup·Close·Next customer) + 체크아웃(Split·Pay) 각 ±2px 판정
- 390×844 · 1180×820 양쪽 2개 테스트

## 테스트 결과

**8/8 통과** (M3-1121-B 기존 6개 + M3-1121-C 신규 2개)

## 버튼별 높이 실측 (px)

| 버튼 | 390×844 | 1180×820 |
|---|---|---|
| Hand over (기준) | 60 | 60 |
| Split | 60 | 60 |
| Pay | 60 | 60 |
| Pickup | 60 | 60 |
| Close | 60 | 60 |
| Next customer | 60 | 60 |

> 계산 근거: `py-4`(32px) + `text-lg` lineHeight(28px) = 60px > `min-h-[3.625rem]`(58px) → 실제 60px.  
> 테스트 8/8 통과 = 모든 버튼 Hand over ±2px 범위 내 확인.

## 스크린샷

- `e2e/screenshots/M3-1121-B-01-home-phone-390w.png`
- `e2e/screenshots/M3-1121-B-01-home-ipad-1180w.png`
- `e2e/screenshots/M3-1121-B-02-checkout-phone-390w.png`
- `e2e/screenshots/M3-1121-B-02-checkout-ipad-1180w.png`
- `e2e/screenshots/M3-1121-C-01-home-phone-390w.png`
- `e2e/screenshots/M3-1121-C-01-home-ipad-1180w.png`
- `e2e/screenshots/M3-1121-C-02-checkout-phone-390w.png`
- `e2e/screenshots/M3-1121-C-02-checkout-ipad-1180w.png`

## PR

#225 (`feat/M3-1121-B`) 브랜치 이어서 커밋 — 커밋 `8a92012`
