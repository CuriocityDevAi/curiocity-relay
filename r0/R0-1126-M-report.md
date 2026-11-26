#271 APPROVE

## 결론

LG-1·LG-2·LG-3 전체 통과. vitest 88 files · 1125 passed, lint 0 error, playwright 14/14 passed.

---

## LG-2: MerosLogo 톱니무늬 — mark / full 두 캔버스 · 타 화면 영향

### path 수학 검증
- `MARK_BOX_PATH` (160×160 canvas): `V 150 → L 150,160 … L 0,150` — 10px 치아 × 16개 = 160px. 정수 fit ✓
- `MARK_BOX_PATH_FULL` (500×200 canvas, y+20 오프셋): `V 170 → L 150,180 … L 0,170` — 동일 16치, y=170→180 ✓

### 타 화면 MerosLogo 사용처 (grep 결과)
| 파일 | kind | 영향 |
|---|---|---|
| `app/login.tsx:115` | `full` width=260 | MARK_BOX_PATH_FULL 사용 ✓ |
| `app/register/z-result.tsx:34` | `mark` width=24 | MARK_BOX_PATH 사용 · 24px 소형, 치아 1.5px → 시각 허용 ✓ |
| `components/SplashReceiptAnim.tsx:84` | `wordmark` height=28 | 마크 없음 · 무관 ✓ |

### ESC/POS 인쇄 로고 경로
`lib/printer/logo-fetch.ts`는 `store.logo_url`(서버 URL) 기반 PNG 다운로드 → 래스터 비트맵 변환.
MerosLogo SVG와 완전히 분리된 경로 → **이번 변경과 무관**.

---

## LG-1: 웹 favicon 검증

### dist/index.html
```
<link rel="icon" href="/favicon.ico"/>
```
`/favicon.png` 를 가리키지 않음 — 이전 `/favicon.png` 404 이슈 해소 ✓

### dist/favicon.ico 픽셀 색상 분석
ICO (3 icons: 48×48·32×32·16×16) 중 32×32 BMP 샘플:
- 배경: R=255 G=229 B=138 → `#FFE58A` (새 MEROS 노란 배경, 옛 주황 아님) ✓
- 하단 row(row=30): alpha 가변(149·252·138·252…) → 톱니 경계 반영 ✓

### favicon.png dist 경로
`dist/favicon.png` 없음 (`dist/`는 `.gitignore` 제외 빌드 아티팩트).
index.html이 `/favicon.ico`만 참조하므로 404 경로 없음 ✓

### 옛 주황 로고 잔존 여부
- `assets/brand/meros-mark-dark.svg`: Rect→Path 갱신 ✓
- `assets/brand/meros-mark-light.svg`: 동일 ✓
- 소스에서 옛 `#E8872E` 계열 주황 경로 없음 ✓

---

## LG-3: floatingPlaceholder 제거 · 공용 TextField 불변 · iPad 라벨 확인

### 코드 확인
- `app/login.tsx`: `floatingPlaceholder` prop 양 필드에서 제거 ✓
- `components/form/TextField.tsx`: 기본값 `floatingPlaceholder=false`; 공용 컴포넌트 변경 없음 ✓

### 높이 변화
`floatingPlaceholder=true` 시 `pb-2 pt-6`(pb=8+pt=24=32px 패딩) → 텍스트 2줄 느낌.
제거 시 `py-4`(16+16=32px 패딩) → Playwright 측정 51.0px(≤56px 기준 통과) ✓

### iPad/native placeholder 동작
- 빈 칸: `placeholder="Email Address"` / `"Password"` 표시 (TextField line 95: `placeholder={floatingPlaceholder ? undefined : placeholder}`) ✓
- 타이핑 중: placeholder 사라짐 — 로그인 2-필드 화면 표준 UX (email keyboardType + password eye icon 으로 맥락 유지)
- **공용 TextField에서 `floatingPlaceholder=false`가 기본값이므로 타 화면에 영향 없음** ✓

---

## 테스트 결과

### vitest
```
Test Files  88 passed (88)
     Tests  1125 passed | 6 expected fail | 3 todo (1134)
  Duration  1.91s
```

### expo lint
```
✖ 71 problems (0 errors, 71 warnings)
```
모두 기존 경고(BottomSheet.tsx react-hooks/immutability 등). 이번 PR 관련 신규 error 없음.

### playwright script (node scripts/m1-1126-i-playwright.mjs)
```
(SRC1) MerosLogo: Rect 미사용 · MARK_BOX_PATH 존재
  ✓ Rect import 없음
  ✓ MARK_BOX_PATH 존재
  ✓ 톱니 path 문자열 (V 150)
  ✓ full canvas 톱니 path (V 170)

(SRC2) login.tsx: floatingPlaceholder 없음
  ✓ loginEmail floatingPlaceholder 없음

(SRC3) favicon 에셋 존재
  ✓ favicon-mark.svg 존재
  ✓ favicon.png 존재
  ✓ favicon-180.png 존재

(a) favicon link
  ✓ favicon link 존재
  ✓ favicon link 가 *.ico 또는 favicon 포함

(b) 로고 SVG 톱니무늬 path
  ✓ loginLogo SVG 존재
  ✓ 톱니무늬 path 포함 (V 150 → 160)

(c) 입력칸 높이 LG-3
  ✓ 입력칸 높이 ≤ 56px (실제: 51.0px)
  ✓ 비밀번호 입력칸 높이 ≤ 56px (실제: 51.0px)

총계: 14 passed · 0 failed
```
