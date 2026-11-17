PASS — 앱 안 로고(로그인·Z-결과·스플래시) A안(각진 M) 전체 교체 완료 · PR #162 추가 커밋 push

## 판정
PASS

## 수행 내역

### 브랜치
feat/m2-1116-ak → origin/master 위로 rebase 후 추가 커밋 (신규 PR 없음)

### 변경 파일 목록
| 파일 | 변경 내용 |
|------|-----------|
| `constants/brand.ts` | `BRAND_PASTEL_HERO (#FFE58A)` · `BRAND_PASTEL_HERO_INK (#3B2A1F)` 토큰 추가 |
| `components/MerosLogo.tsx` | 영수증 티켓 마크 → Rect(rx=16)+Polygon A안 · mark 뷰박스 160×160 · full canvas y+20 오프셋 · 워드마크 translate(176,126) |
| `assets/brand/meros-mark-dark.svg` | A안 업데이트 (viewBox 0 0 160 160) |
| `assets/brand/meros-mark-light.svg` | A안 업데이트 |
| `assets/brand/meros-logo-dark.svg` | A안 mark + 워드마크 ink #F2F4F1 |
| `assets/brand/meros-logo-light.svg` | A안 mark + 워드마크 ink #0E1B18 |
| `assets/brand/meros-mark-{dark,light}@{1x,2x,3x}.png` | SVG에서 ImageMagick 재생성 |
| `assets/brand/meros-logo-{dark,light}@{1x,2x,3x}.png` | SVG에서 ImageMagick 재생성 |
| `assets/images/icon.png` | gen-icons.mjs 재실행 (변경 없음 · 이미 A안) |
| `assets/images/splash-icon.png` | 동상 |
| `assets/images/adaptive-icon.png` | 동상 |

### 로고 노출 위치 (grep 결과)
- `app/login.tsx` → `<MerosLogo kind="full" theme="light" width={260}>` (로그인 화면 상단)
- `app/register/z-result.tsx` → `<MerosLogo kind="mark" width={24}>` (Z-결과 헤더)
- `app/index.tsx` → `splash-icon.png` Image (앱 시작 로딩 화면) — 이미 A안 아이콘 사용 중
- `components/receipt/ReceiptCard.tsx` → store.logo_url 사용 · MerosLogo 미사용 → 변경 불필요

### 타입체크
MerosLogo.tsx · constants/brand.ts 관련 에러 없음.
기존 사전 오류(cart.tsx FlashList · e2e playwright 타입) 는 이전부터 존재, 본 PR과 무관.

### 미리보기 검증
- 웹 빌드(`npx expo export --platform web`) → Python HTTP server → Playwright 스크린샷:
  - `/` (로그인 화면): 노란 rounded-square 마크 + MEROS 워드마크 확인 ✓
  - icon.png 1024×1024: 노란 배경 + 각진 M ✓
  - meros-logo-light@1x.png: mark + wordmark 렌더 확인 ✓

### 기술 선택지
- **Polygon + Rect(rx=16)** 사용: 앱 아이콘의 rounded-square 외관을 인앱 로고에서도 유지.
  flat `Path`로도 표현 가능하나 `Polygon`이 가독성·유지보수 우수.
- **색은 brand.ts 토큰만**: BRAND_PASTEL_HERO·INK 추가, raw hex 없음 (REQ 준수).
- full 로고: viewBox 500×200 유지(기존 사용처 aspect ratio 무변), mark y+20 오프셋으로 세로 중앙.

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/162

## 이연 순증감
0건 (신규 이연 없음)
