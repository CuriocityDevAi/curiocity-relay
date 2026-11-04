---
round: M1-1104-B
pr:
  fork: agilo-medusa-pos-fork#21
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/21
  fork_commit: b7d093f
outcome: setup wizard 매장 1개 자동 선택 + welcome 스텝 건너뜀 · 토스트 1회
kyu_checks: 1 (auto-select-single-store)
---

# M1-1104-B · Setup wizard 매장 1개 자동 선택

**일자**: 2026-11-04 · **허브**: M1 · **작업 디렉토리**: `pos-m1` · **리포지토리**: `agilo-medusa-pos-fork` (브랜치 `feat/m1-1104-b-auto-stock-location` · base `b55faa9` M1-1104-A) · **선행 승인**: M0-1104-G 계획 D (11-04 오케 "1 매장이면 자동 통과") · **커밋·push·PR 승인 불요** (사전 명시).

---

## 0. 원문 (Kyu 11-03 · M1-1104-B 발의)

로그인 뒤 setup wizard 의 매장(stock location) 선택: 계정이 볼 수 있는 매장이 1개면 자동 선택하고 wizard 를 건너뜀(토스트 1회 "매장: <이름>") · 2개 이상이면 기존 리스트 그대로. 재선택은 Settings → Stock location 그대로.

---

## 1. 산출물 (허용 주인 파일 2 · 보조 3)

| 파일 | 변경 | 비고 |
|------|------|------|
| `components/setup-wizard/StockLocationSelectionStep.tsx` | 수정 | `useStockLocations()` 쿼리 소비 · `onAutoSelect?` prop 신설 · useRef 1회 가드 · count===1 시 Toast(`매장: <name>`) + `onAutoSelect(id)` · willAutoSelect 분기에서 선택 UI 조기 return. |
| `components/setup-wizard/SetupWizardContent.tsx` | 수정 | `handleStockLocationAutoComplete` 신설 — 매장 id 세팅 즉시 `updateSettings.mutate({sales_channel_id, region_id, stock_location_id})`. 기존 mutation `onSuccess` 가 `router.replace('/(tabs)/products')` → **welcome 스텝 skip**. prop 전달만 추가. |
| `scripts/m1-1104-b-assertions.mjs` | 신규 | 로직 어설션 26 건. |
| `scripts/m1-1104-b-playwright.mjs` | 신규 | Expo 웹 상시 ⓐ 8 건 + React #418 필터. |
| `docs/M1-1104-B-login-reach.png` | 신규 | Expo 웹 로그인 도달 스샷. |

**금지 영역 미건드림** (확인): `contexts/*`, `app/login.tsx`, `package.json`, `app/(tabs)/*`, `app/checkout/*`. **`app/index.tsx` 수정 없음** — 기존 재진입 가드가 설정 적용 후 자동 `/products` 분기로 통과.

**Settings 재선택 경로 (요구 "재선택은 Settings → Stock location 그대로")**: `app/settings/stock-location.tsx` 는 `StockLocationList` 직접 사용 — `StockLocationSelectionStep` 과 무관 → 매장 1 개여도 리스트 UI 그대로 뜸. 어설션 (1) 에서 import 미사용 가드.

### 자동 선택 분기 요약
```
useStockLocations() → data.pages[0].count
  === 1 → Toast("매장: <name>") + onAutoSelect(id)
            → updateSettings.mutate(3 ids)
              → onSuccess: router.replace("/(tabs)/products")
  === 0 → (SetupWizardContent 상위에서 이미 creation step 으로 분기)
  >=  2 → 기존 수동 리스트 + Next 버튼 그대로
```
useRef 가드 1 회 발화 · effect 반복 재실행 safe.

---

## 2. 검증 (돌려본 로그 전원 pass)

### TypeScript
```
$ npx tsc --noEmit  → exit 1 (총 2건)
app/_layout.tsx(6,8): TS2882 (global.css · pre-existing)
lib/sentry.ts(11,25): TS2307 (@sentry/react-native · pre-existing · pos-m1 worktree node_modules 재설치 후 해소 가능)
```
**두 건 모두 master `b55faa9` 동일 재현** (stash 기반 확인) · 이번 라운드 신규 에러 **0 건**.

### 로직 어설션 26/26 pass
```
$ node scripts/m1-1104-b-assertions.mjs
--- (1) 코드 shape (회귀 가드) ---              ✓ 15건
--- (2) 1 매장 mock → 자동 선택 ---              ✓ 5건
--- (3) 2 매장 mock → 수동 선택 유지 ---         ✓ 3건
--- (4) useRef 1회성 ---                         ✓ 1건
--- (5) 0 매장 mock → auto-select 비실행 ---     ✓ 2건
26/26 passed · 0 failed
```

핵심:
- **(2)** mock `{ count: 1, stock_locations: [{id:'sl_01', name:'Jakarta 본점'}] }` → `willAutoSelect === true` · `onAutoSelect('sl_01')` 1 회 · Toast text2 === `매장: Jakarta 본점`.
- **(3)** mock `{ count: 2, ... }` → `willAutoSelect === false` · `onAutoSelect` 0 회 · Toast 0 회.
- **(4)** effect 3 번 재실행 → `onAutoSelect` 여전히 1 회만.
- **(5)** mock `{ count: 0 }` → `willAutoSelect === false` · auto-select 미발화 (0 매장은 상위 SetupWizardContent 가 이미 creation 분기로 라우팅).
- **(1)** `settings/stock-location.tsx` 에서 `StockLocationSelectionStep` import 가 **없음** 확인 → 재선택은 자동 선택 로직 미적용.

### M1-1104-A 회귀 검사
```
$ node scripts/m1-1104-a-assertions.mjs → 44/44 passed · 0 failed
```
Shop URL 제거 · 서버 상수 · loginRemember migrate 전부 그대로.

### Expo 웹 Playwright 8/8 pass (상시 ⓐ · 필수 체크)
```
$ rm -rf dist && npx expo export -p web --output-dir dist  → 3 bundles · 29 routes
$ node scripts/m1-1104-b-playwright.mjs
--- (1) 미인증 상태 index.html 로드 → crash 없음 ---      ✓ pageerror (신규 분만) 0건
  ℹ pre-existing pageerror 1건 (React #418 hydration · master 동일 재현) — flag 별건
--- (2) 로그인 화면 DOM 도달 ---                            ✓ email · password · "Sign In" 전부 존재
--- (3) Shop URL 필드 부재 회귀 가드 ---                    ✓ loginShopUrl testID 0 · placeholder 0
--- (4) Meros 로고 렌더 ---                                 ✓ SVG 존재
--- (5) 콘솔 error 총 수 ---                                ✓ 0건 (요구 명시 체크)
8/8 passed · 0 failed
```

**요구 명시 체크** ("console.error 0") 통과. pageerror 는 상시 ⓐ 보조 수집용으로 활성이지만, 감지된 1 건 (`Minified React error #418` — SSG hydration mismatch) 은 **master `b55faa9` 에서 동일 재현** 확인 → 이번 라운드가 유발 아님. SDK 57→58 업그레이드 (M0-1104-B · PR #14) 영향으로 추정 · **별건 flag 로 등재 권장**.

**스샷**: `docs/M1-1104-B-login-reach.png` — Expo 웹 로그인 화면 (MEROS 로고 + Email Address + Password + Sign In · Shop URL 칸 부재).

---

## 3. Kyu 아이패드 실기 체크

| # | 체크 | 쉬운 말 |
|---|------|--------|
| ① | **auto-select-single-store** | 아이패드 로그인 → 매장 선택 화면 **안 뜨고** 바로 상품 화면 → 상단 토스트 "매장: <이름>" 1 회. |
| 참고 | 2+ 매장 계정 | (해당 계정 있을 시) 기존처럼 매장 리스트 + Next 버튼 흐름 유지. |
| 참고 | Settings → Stock location 재선택 | 매장 1 개여도 리스트 UI 그대로 (요구 명시 · 자동 선택 미적용). |

---

## 4. 규약 정합

| 규약 | 정합 |
|------|------|
| 허용 주인 파일만 수정 (M0-1104-G 계획 D) | ✓ (2 수정 · 금지 영역 0 건) |
| `app/index.tsx` 수정 없음 (기본 재진입 가드 사용) | ✓ (PR 본문에 "수정 없음" 명시) |
| Settings 재선택 흐름 미영향 | ✓ (StockLocationList 직접 소비 경로 분리) |
| 매장 1 → 자동 선택 + 토스트 1 회 + welcome skip | ✓ |
| 매장 2+ → 기존 리스트 그대로 | ✓ |
| 어설션 (1매장 → 자동 · 2매장 → 리스트) | ✓ (단위 8건 · 추가 보강 18건) |
| 상시 ⓐ Expo 웹 Playwright · 로그인 도달 · console.error 0 | ✓ (8/8 pass) |
| TypeScript 신규 에러 0 | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |
| docs 1 개 추가 (스샷) · README 수정 없음 | ✓ |

---

## 5. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (M0-1104-G 요구 3 — "1 매장 계정" 수동 선택 번거로움) |
| 등재 | +1 (**flag**: React #418 SSG hydration · master 동일 재현 · SDK 58 영향 추정 · 추적 별건) |
| 미완 (Kyu 도장) | 1 |
| **총 순증감** | **+1 해소 · +1 등재 · 도장 시 0** |

---

## 6. 다음 게이트

1. **PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/21 — Kyu 실기 (auto-select-single-store 1 건) → 자가 머지.
2. **M0-1104-G 지연 K (다중 매장 RBAC)** 는 "2+ 매장 계정" 트리거 전까지 대기.
3. **별건 flag (React #418 hydration)**: 다음 M 허브 가용 라운드에서 재현 조건 특정 + root cause (SDK 58 · Sentry init SSR · Image/Font 로더 중 분기) 좁히기.

---

*M1-1104-B · 2026-11-04 · 매장 1 개 자동 선택 · fork PR #21 · 어설션 26/26 + M1-1104-A 회귀 44/44 + Playwright 8/8 pass · kyu_checks 1 · 이연 +1 해소/+1 등재 (도장 시 0)*
