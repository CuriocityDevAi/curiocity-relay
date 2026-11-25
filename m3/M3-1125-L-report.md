# PASS — M3-1125-L: 손님화면 시작 화면 영수증 갈색 종이 + 노란 M

## PR
https://github.com/CuriocityDevAi/storeport/pull/436

---

## 변경 요약

| 항목 | 내용 |
|---|---|
| 리포 | storeport |
| 브랜치 | `feat/M3-1125-L-cd-splash-receipt-color` |
| 대상 파일 | `apps/customer-display/src/components/SplashAnimation.tsx`, `src/theme/tokens.ts`, `src/components/__tests__/splash-wordmark.test.ts`, `app.config.ts` |

---

## JS / 네이티브 구분

| 화면 | 종류 | 변경 방법 | 새 빌드 필요 |
|---|---|---|---|
| `SplashAnimation.tsx` | **JS 화면** (Expo Router 오버레이) | PNG → SVG 전환, 색 반전 | 아니오 (OTA 가능) |
| `app.config.ts` expo-splash-screen | **네이티브 스플래시** | `splash.png`(177B 더미) → `icon.png` | **예 — 새 EAS 빌드 필요** |

---

## 사용된 색 토큰

| 토큰 이름 | 값 | 역할 | 출처 |
|---|---|---|---|
| `BRAND_MARK_BG` | `#3B2A1F` | 영수증 종이(갈색) | `tokens.ts` pastel.heroInk |
| `BRAND_MARK_FG` | `#FFE58A` | M 글자(노랑) + 스플래시 배경 | `tokens.ts` pastel.hero |
| `BRAND_MARK_BAR` | `rgba(0,0,0,0.75)` | 프린터 막대(근-검정) | 신규 · 갈색 종이와 명확히 구분 |
| `BRAND_MARK_MUTED` | `#7A6656` | "Customer" 부제 텍스트 | `tokens.ts` pastel.muted |

---

## 전후 비교 (SVG 색값 기준)

| | 이전 | 이후 |
|---|---|---|
| 화면 배경 | `#FFE58A` 노랑 | `#FFE58A` 노랑 (동일) |
| 영수증 종이 | `receipt-anim.png` (노란 PNG → 배경과 동색, 불가시) | `#3B2A1F` 갈색 SVG → **가시** |
| M 글자 | `#3B2A1F` 갈색 | `#FFE58A` 노랑 |
| 프린터 막대 | `rgba(59,42,31,0.85)` 갈색반투명 | `rgba(0,0,0,0.75)` 근-검정 (종이와 대비) |
| 톱니(지그재그) 끝 | 노란 배경에 묻힘 | 갈색 종이와 함께 보임 |

---

## 종이색 ≠ 배경색 어설션

`splash-wordmark.test.ts` 에 추가:
- `BRAND_MARK_BG !== BRAND_MARK_FG` ✓
- `BRAND_MARK_BG === "#3B2A1F"` ✓
- `BRAND_MARK_FG === "#FFE58A"` ✓

테스트 결과: 246 passed (14 test files) — customer-display 전체 통과.

---

## 기술 선택 근거 (PR 본문 3줄)

1. **PNG → SVG**: POS SplashReceiptAnim과 동일 경로 데이터 재사용, 런타임 색 적용, 이미지 에셋 갱신 불필요.
2. **프린터 막대**: `rgba(0,0,0,0.75)` 채택 — "한 톤 진하게" 권장안. 갈색 종이와 명확히 구분.
3. **native splash**: 177B 플레이스홀더 → 기존 icon.png 활용(새 에셋 생성 없이 갈색+노랑 즉시 반영). 새 EAS 빌드 필요.

---

## CI

- `pnpm test` 전체: **246 passed** (customer-display), **681 passed** (commerce-core)
- `pnpm typecheck` apps/customer-display: **pass** (apps/wing pre-existing 오류는 무관)
- pre-push hook: **통과**
