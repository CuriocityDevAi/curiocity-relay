---
round: M1-1105-A
pr:
  fork: agilo-medusa-pos-fork#23
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/23
  fork_commit: ac35042
outcome: setup wizard 매장 1개 자동 선택 무한 루프 해소 (M1-1104-B 회귀)
kyu_checks: 2 (no-white-flash · no-max-update-depth)
---

# M1-1105-A · Setup wizard 매장 자동 선택 무한 루프 뿌리 해소

**일자**: 2026-11-05 · **허브**: M1 · **작업 디렉토리**: `pos-m1` · **리포지토리**: `agilo-medusa-pos-fork` (브랜치 `fix/m1-1105-a-wizard-loop` · base `0515209` M2-1104-D/E) · **성격**: M1-1104-B 회귀 핫픽스 · Kyu 11-05 아이패드 실기 ✗.

---

## 0. 원문 (Kyu 11-05 아이패드 실기)

로그인 뒤 상품 화면 도달 전 흰 화면이 반복 새로고침 (무한 루프).
로그:
- `Maximum update depth exceeded` (react-query notifyManager → expo-router useNavigationTreeReducer)
- `ROUTE_NAMES_CHANGED [products,orders,scan,cart,settings] not handled` 반복 → 탭 네비게이터가 반복 재마운트
결국 상품 화면엔 도달.

---

## 1. 뿌리 (실측 3항)

| # | 가설 | 결과 | 근거 |
|---|------|------|------|
| ① | 자동 선택 effect 가 재마운트마다 재실행 (`useRef` 가드 리셋) | **✓ 재현** | `scripts/m1-1105-a-repro.mjs` (A) — 3 마운트 → 3회 발화. `autoSelectFiredRef.current` 는 인스턴스별 초기화 (JS 특성). |
| ② | `router.replace` 가 wizard/`AuthedBootstrap` 재마운트 유발 | **✓ 재현** | M1-1104-B `SetupWizardContent.useUpdateSettings.onSuccess` 가 `router.replace('/(tabs)/products')` 를 `invalidateQueries` 직후 호출 — **refetch 는 await 안 함**. navigate 시점에 `settings.data` 아직 stale (`stock_location` 미포함) → `_layout.tsx` `Stack.Protected` `isSetupComplete` false 유지 → `/(tabs)/products` 매칭 실패 → `/index` 폴백 → `/index` effect 가 `router.replace('/setup-wizard')` → **setup-wizard 재마운트** → `useRef` 리셋 → auto-select 재발화 → mutate 재발화 → LOOP. `AuthedBootstrap` 자체는 `auth.state.status` 가 flip 하지 않아 remount X · 다만 tabs `Stack.Protected` guard flip 과정에서 `ROUTE_NAMES_CHANGED` 가 반복 로깅됨. |
| ③ | M1-1104-A 마이그레이션 분기가 기동마다 반복 | **✗ 무관** | `contexts/auth.tsx:174` 조건 `storedMedusaUrl && storedMedusaUrl !== MEROS_API_URL`. 로그인 시 `medusaUrl=MEROS_API_URL` 저장 → 재부팅 조건 false → 분기 미발화. 또한 `loadAuthState` 는 AuthProvider mount 1회만 실행 · setup-wizard 루프 중 AuthProvider remount 없음. |

---

## 2. 산출물 (허용 주인 파일 3 · 보조 4 · 금지 영역 0)

| 파일 | 변경 | 비고 |
|------|------|------|
| `components/setup-wizard/StockLocationSelectionStep.tsx` | 수정 | `useRef` 제거 · `useSettings` + `useMutationState(['update-settings'], pending|success)` state 기반 가드 2개 (`stockLocationAlreadySaved`, `isSavingOrSaved`). MutationCache 는 컴포넌트 재마운트 후에도 in-flight/완료 상태를 유지해 재발화 자체를 봉쇄. `isSavingOrSaved` 상태에서도 선택 UI 숨김으로 시각적 flash 차단. |
| `components/setup-wizard/SetupWizardContent.tsx` | 수정 | `useQueryClient` → `updateSettings` onSuccess 에서 `await queryClient.refetchQueries({queryKey:['settings']})` **후** `router.replace`. navigate 시점에 `settings.data` 반영 완료 보장 → `Stack.Protected` guard 즉시 flip · `/index` 폴백 사라짐. `handleStockLocationAutoComplete` 에 `updateSettings.isPending \|\| isSuccess` 재진입 가드 1줄. |
| `app/index.tsx` | 수정 | `usePathname` 가드 — `/index` 는 Stack 에 잔존해 background 재렌더 시 effect 중복 실행하던 문제 → `pathname !== '/'` 조기 return. |
| `scripts/m1-1105-a-repro.mjs` | 신규 | 결정적 Node 시뮬 — 수정 전 3회 발화, 수정 후 1회 발화 재현 로그. |
| `scripts/m1-1105-a-assertions.mjs` | 신규 | 코드 shape + state 머신 + parent/index 가드 33건. |
| `scripts/m1-1104-b-assertions.mjs` | 수정 (2줄) | useRef 어설션 2건 → state 가드 승계. |
| `docs/M1-1105-A-login-reach.png` | 신규 | Expo 웹 로그인 도달 스샷. |

**금지 영역 미건드림** (확인): `contexts/settings.tsx`, `_layout.tsx`, M3 색 토큰 대상 파일 전부 untouched. `contexts/auth.tsx` 마이그레이션 분기는 **읽기만** 하고 수정 없음 — idempotent 라서 수정 불요 (실측 ③).

### 수정 핵심 1줄 요약
- Step: 가드를 remount-fragile `ref` 에서 → remount-safe `settings.data + useMutationState` 로 이전.
- Wizard: `invalidateQueries` 대신 `refetchQueries` await 로 navigate 타이밍 동기화.
- Index: 활성 경로일 때만 라우팅.

---

## 3. 검증 (돌려본 로그 전원 pass)

### 재현 (수정 전 로직 모의 · 결정적)
```
$ node scripts/m1-1105-a-repro.mjs
--- (A) 현행 M1-1104-B · ref 가드 + 재마운트 → 루프 ---
  autoSelect 호출 수: 3
  ✓ 자동 선택 호출 2+회 (ref 리셋 → 재발화 재현)
  ✓ 매 인스턴스마다 autoSelectFiredRef 초기값 false
--- (B) 수정 · state 기반 가드 → 1회만 ---              ✓ step 가드만 ≤ 2 · settings 저장 뒤 0
--- (C) 완전 수정 · parent 가 refetch await ---         ✓ 정확히 1회
5/5 passed · 0 failed
```

### 수정 어설션 33/33 pass
```
$ node scripts/m1-1105-a-assertions.mjs
--- (1) 코드 shape (회귀 가드) ---                 ✓ 19건
--- (2) step 가드 state 머신 ---                   ✓ 7건
--- (3) parent handleStockLocationAutoComplete ---  ✓ 1건
--- (4) /index effect pathname guard ---            ✓ 4건
--- (5) 종합 재현 ↔ 수정 시뮬 ---                   ✓ 2건
33/33 passed · 0 failed
```

### 상시 ⓐ Expo 웹 Playwright (M1-1104-B 하네스 재사용 · 8/8 pass)
```
$ rm -rf dist && npx expo export -p web --output-dir dist   → 3 bundles · 29 routes
$ node scripts/m1-1104-b-playwright.mjs
--- (1) 미인증 상태 index.html 로드 → crash 없음 ---      ✓ pageerror (신규 분만) 0건
  ℹ pre-existing pageerror 1건 (React #418 · M1-1104-B 때 등재 flag · 본 라운드 무관)
--- (2) 로그인 화면 DOM 도달 ---                            ✓ email · password · "Sign In"
--- (3) Shop URL 필드 부재 회귀 가드 ---                    ✓ loginShopUrl testID 0 · placeholder 0
--- (4) Meros 로고 렌더 ---                                 ✓ SVG 존재
--- (5) 콘솔 error 총 수 ---                                ✓ 0건 (요구 명시 체크)
8/8 passed · 0 failed
```

### 회귀 (전 라운드)
- M1-1104-A 어설션: **44/44 pass**
- M1-1104-B 어설션: **26/26 pass** (useRef 2건 → state 가드 승계 수정 적용)
- `npx tsc --noEmit` → 신규 에러 0 (잔존 `global.css` TS2882 는 master 동일 재현)

### Note — 웹 E2E 한계
완전 브라우저 E2E (로그인 → wizard → auto-select loop 재현) 는 Expo SDK 58 `expo-secure-store` 웹 폴리필이 `export default {}` (M0-1104-A 에 기록) 이라 `SecureStore.setItemAsync` 가 TypeError → 로그인 성공 흐름 진입 불가. 재현은 `scripts/m1-1105-a-repro.mjs` (결정적 Node 시뮬) 로 대체. Playwright 는 로그인 도달 + console.error 0 유지로 번들에 수정 코드가 들어갔음을 간접 보장.

---

## 4. Kyu 아이패드 실기 체크

| # | 체크 | 쉬운 말 |
|---|------|--------|
| ① | **no-white-flash** | 로그인 → 흰 화면 깜빡임 없이 1회 전환 → 상품 화면. 상단 토스트 "매장: `<이름>`" 1회. |
| ② | **no-max-update-depth** | 콘솔에 "Maximum update depth exceeded" / "ROUTE_NAMES_CHANGED ... not handled" 반복 **없음**. |
| 참고 | 2+ 매장 계정 | 기존 수동 리스트 플로 그대로 (변경 0). |
| 참고 | Settings → Stock location 재선택 | 매장 1개여도 리스트 그대로 (M1-1104-B 요구 유지). |

---

## 5. 규약 정합

| 규약 | 정합 |
|------|------|
| 허용 주인 파일만 수정 (step · wizard · index) | ✓ · (auth.tsx 는 미수정 · 읽기만) |
| 금지 영역 (M3 색 토큰 대상) 미건드림 — 최소 diff | ✓ · 7 파일만 변경 (코드 3 + 스크립트 3 + 스샷 1) |
| 재현 (매장 1개 + stock_location 미설정 · console.error "Maximum update depth") | ✓ · Node 결정적 재현 로그 포함 |
| 뿌리 확정 3항 PR 본문 명시 | ✓ · ①✓ ②✓ ③✗ (실측) |
| 수정: state 기반 가드 (ref 금지) | ✓ · `useSettings` + `useMutationState` |
| 수정: 저장 성공 전엔 이동 X | ✓ · `await refetchQueries` 후 `router.replace` |
| 수정: stock_location 저장돼 있으면 effect 자체 진입 금지 | ✓ · `stockLocationAlreadySaved` 가드 |
| 상시 ⓐ Expo 웹 Playwright · console.error 0 | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (M1-1104-B wizard loop · Kyu 11-05 실기 ✗ 사유) |
| 보강 | +2 (state 가드 패턴 · Node 결정적 재현 하네스) |
| 미완 (Kyu 도장) | 2 |
| **총 순증감** | **+1 해소 · +2 보강 · 도장 2건 시 -1** |

---

## 7. 다음 게이트

1. **PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/23 — Kyu 아이패드 실기 (no-white-flash · no-max-update-depth) → 자가 머지.
2. **별건 flag 유지**: React #418 (SSG hydration) · SDK 58 영향 추정 — 추적 별건.
3. 다음 M 허브 가용 라운드 · 품절 흐름 / 결제 흐름 등 Kyu 요구 큐 소진.

---

*M1-1105-A · 2026-11-05 · setup wizard 자동 선택 루프 핫픽스 · fork PR #23 · Node repro 5/5 + 어설션 33/33 + Playwright 8/8 + M1-1104-A/B 회귀 70/70 pass · kyu_checks 2 · 이연 +1 해소/+2 보강 (도장 시 -1)*
