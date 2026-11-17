#162 APPROVE

## R0-1117-D — PR #162 리뷰 결과

판정: **APPROVE** (블로커 없음)

---

## 1. 테스트 / 타입체크 / 웹 빌드

| 항목 | 결과 |
|------|------|
| `npx jest` | 47 suites fail — **전부 pre-existing** (vitest CJS/ESM 충돌). 이 PR 변경파일과 무관 |
| `npx tsc --noEmit` | PR branch 87줄 오류 vs master(pr-62) 164줄 오류. **감소** — master에 merge conflict marker 오류 포함. PR 변경파일 신규 에러 없음 |
| `npx expo export --platform web` | **성공** — dist/ 정상 생성 |

---

## 2. 로고 노출 위치 전수 (`MerosLogo` / splash / icon)

| 위치 | 파일 | 확인 |
|------|------|------|
| 로그인 화면 | `app/login.tsx:115` → `MerosLogo kind="full" theme="light" width={260}` | ✅ |
| Z-결과 헤더 | `app/register/z-result.tsx:34` → `MerosLogo kind="mark" width={24}` | ✅ |
| 앱 로딩(스플래시) | `app/index.tsx:47` → `require('@/assets/images/splash-icon.png')` | ✅ |
| 로고 컴포넌트 | `components/MerosLogo.tsx` | ✅ A안 각진 M (Rect+Polygon) |

누락 없음.

---

## 3. 색 토큰 (raw hex 인라인 금지)

- `components/MerosLogo.tsx` → `BRAND_PASTEL_HERO`, `BRAND_PASTEL_HERO_INK` 임포트 사용 ✅
- TS/TSX 파일 전체에서 `#FFE58A` / `#3B2A1F` raw hex 없음 ✅
- `app.json` `backgroundColor: "#FFE58A"` — JSON 설정 파일 특성상 토큰 참조 불가, `BRAND_PASTEL_HERO` 값과 일치 확인 → **허용** (non-blocker)
- SVG 에셋 내부 hex는 허용됨 ✅

---

## 4. 아이콘 1024 RGB 무투명·선명

```
icon.png: 1024×1024  Mode=RGB  Has_alpha=False
Corner pixel: (255, 229, 138) = #FFE58A ✅
Center pixel:  (59, 42, 31)   = #3B2A1F ✅
```

시각 확인: 노란 배경(#FFE58A) 위 각진 M(#3B2A1F) — 선명, 테두리 선명 ✅

---

## 5. Splash 설정 app.json 일치

```json
"expo-splash-screen": {
  "image": "./assets/images/splash-icon.png",   // 파일 존재 ✅
  "imageWidth": 233,
  "resizeMode": "contain",
  "backgroundColor": "#FFE58A"                  // BRAND_PASTEL_HERO 일치 ✅
}
```

splash-icon.png: 1024×1024 P-mode (투명 PNG) — foreground 이미지로 올바름 ✅

---

## 6. Bundle id / slug / scheme 불변

| 키 | 값 |
|----|-----|
| slug | `meros-pos` ✅ |
| scheme | `merospos` ✅ |
| iOS bundleIdentifier | `id.meros.pos` ✅ |
| Android package | `id.meros.pos` ✅ |

---

## 7. 결제·장바구니 파일 미변경

`git diff master...HEAD -- app/(tabs)/cart.tsx app/checkout/[draftOrderId].tsx components/payment/*` → **출력 없음** ✅

---

## 8. 웹 빌드 로그인 화면 스크린샷

스크린샷 경로: `/tmp/login-screenshot.png`

내용: 노란 rounded-square 마크(#FFE58A) + 각진 M(#3B2A1F) + "MEROS" 워드마크(#0E1B18) + "POS" 부제 — A안 디자인 정상 렌더링 ✅

---

## 판정 요약

| 체크 항목 | 결과 |
|-----------|------|
| 테스트 | 기존 오류만, 신규 없음 |
| 타입체크 | 오류 감소, 신규 없음 |
| 웹 빌드 | 성공 |
| 로고 노출 위치 전수 | 누락 없음 |
| 색 토큰 | 준수 |
| 아이콘 1024 RGB 무투명·선명 | ✅ |
| splash app.json 일치 | ✅ |
| bundle id/slug/scheme 불변 | ✅ |
| 결제·장바구니 미변경 | ✅ |
| 로그인 스크린샷 | ✅ |

**블로커 없음 → APPROVE**
