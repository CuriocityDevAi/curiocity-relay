# M3-1105-AB · 캡슐 토스트 (어두운 배경 · 화면 위 가운데)

## §0 토스트 출처 · 기술 선택

**현재 토스트**: `react-native-toast-message` (v2.3.3) 1개 라이브러리 · 커스텀 `ToastConfig`
는 `config/toast.tsx` 가 `ToastMessage` 컴포넌트(= `InfoBanner` 의 outline 변종)로
렌더 · provider 는 `app/_layout.tsx` + `components/ui/BottomSheet.tsx` (모달 위 토스트).
호출 지점(grep `Toast.show\(`): 17 개 파일 · 46 개 호출. `type: success|error|info` 3 종.

**sonner-native 채택 검토**: peer = `react-native-reanimated@4.7.1` · `react-native-gesture-handler@~3.3.0` ·
`react-native-safe-area-context@~5.11.1` — 현재 의존성과 맞음. 단, sonner-native 는 reanimated
3.x 대 기준 안내 · reanimated 4 호환 PR 가 수개월 미병합(Expo SDK 58 대응 미상).
Expo Go 동작 미보장 · 번들 +~30 KB.

**선택: 자체 구현(기존 토스트 restyle)** — 새 의존성 0 · `Toast.show` 흐름 그대로 재사용 ·
기본 top-slide 애니메이션/visibilityTime/swipe-up 닫힘 모두 라이브러리가 제공. 스택 쌓임은
라이브러리 미지원(한 번에 1 개) — V1 는 미채택 (Kyu 수용 가능 범위, 추가 PR 로 이관 가능).

## 구현 요약
- 새 컴포넌트 `components/ui/toast/CapsuleToast.tsx` — `bg-ink` · `text-on-ink` · 캡슐
  (`rounded-full`) · 그림자 약하게 · 최대 폭 420 · 아이콘만 결과색(success=토큰 green ✓ ·
  error=토큰 red ! · info=토큰 muted i).
- 새 공용 API `components/ui/toast/index.ts` — `showToast.success/error/info(text1, {text2?,
  visibilityTime?})` · default visibility: success 2.5s · error 4s · info 2.5s.
- `config/toast.tsx` 가 `CapsuleToast` 로 교체. `app/_layout.tsx` 와 `components/ui/BottomSheet.tsx`
  provider 는 `position="top" topOffset={60}` 로 전환.
- 토큰 쌍 추가 (tailwind.config.js + constants/brand.ts):
  - `on-ink: #FFFFFF` / `TOKEN_ON_INK`
  - `toast-success: #22C55E` / `TOKEN_TOAST_SUCCESS`
  - `toast-danger: #F87171` / `TOKEN_TOAST_DANGER`
  - `toast-muted: #B5B5B5` / `TOKEN_TOAST_MUTED`
- 호출 지점 전부 새 공용 API 로 교체 (문구 변경 0건):
  - `contexts/auth.tsx` · `app/(tabs)/orders.tsx` · `app/register/{close,open,pickup,z-result}.tsx`
    · `app/checkout/tender-cash/[draftOrderId].tsx` · `app/orders/[orderId].tsx` · `utils/errors.ts`
    · `components/register/OpenShiftSheet.tsx` · `components/setup-wizard/{SetupWizardContent,
    StockLocationSelectionStep}.tsx`
- #70 소유 (`app/checkout/success/**`) 와 M3-1105-X 소유 (`components/orders/FulfillSheet*`) 는
  파일 미변경 — 동일 config 전환으로 해당 토스트들도 캡슐 디자인으로 자동 렌더.

## 어설션 (run-all)
`node scripts/run-all.mjs assertions` → **22/22 PASS** (소요 17.6s).
  - `m3-1105-ab-assertions.mjs` (신규) · CapsuleToast=bg-ink · raw hex 0 · 허용 파일 호출
    전부 새 API · 토큰 쌍 존재 — ✅
  - `m3-1105-a-color-assertions.mjs` (팔레트 가드) · raw hex 0 포함 — ✅
  - `m2-1105-q-bundle-guard.mjs` (⑦ 번들 가드) · 정적 grep 0 · Metro iOS 번들 해석 — ✅
  - 기존 `m1-1104-b` · `m1-1105-h` 어설션 내 Toast import grep 2 줄은 새 공용 API 경로로 갱신.

## Playwright 스샷
`node scripts/m3-1105-ab-screenshots.mjs` → `screenshots-m3-1105-ab/`
  - `01-ipad-error.png` · iPad 가로 1366×1024 · 흰 로그인 화면 위 "Login Failed" (빨강 ! · 캡슐).
  - `02-ipad-success.png` · iPad 가로 1366×1024 · 흰 products 화면 위 "Register opened" (초록 ✓ · 캡슐).
  - `03-phone-error.png` · 폰 393×852 · 흰 로그인 화면 위 "Login Failed" (빨강 ! · 캡슐).

## PR
`feat/m3-1105-ab-toast-capsule` ← master(77b930c). PR #70 과 파일 겹침 없음 (#70 = success/receipt
쪽 · 이 PR = 토스트 + 공용 API + 토큰). FulfillSheet 는 미변경.
