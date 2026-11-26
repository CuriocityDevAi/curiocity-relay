# PASS — M1-1126-I
PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/271

---

## 로고 원본 탐색 결과 (REQ 1)

| 경로 | 결과 |
|------|------|
| (a) fork 리포 `assets/brand/meros-mark-*.svg` | 톱니무늬 없는 단순 `<rect>` 버전 — 불합격 |
| (b) storeport `apps/customer-display/assets/brand/icon-hp.svg` | 갈색 배경 M (Customer Display 전용, 톱니 없음) — 불합격 |
| (c) storeport `apps/commerce-core/src/admin/assets/meros-favicon.svg` | 옛 M0-1103-C 주황 로고 (톱니 있지만 색상·형태 모두 구버전) — 채택 불가 |

→ **(c) 직접 작성**: 현재 POS 로고(노란 박스 + 각진 M)에 영수증 톱니 추가

---

## 구현 내역

### LG-2 · 로그인 로고 톱니무늬

**변경**: `components/MerosLogo.tsx`
- `Rect` → `Path` 대체
- 톱니 path: 너비 10px × 16치 (160/10 = 16, 정수 fit), 높이 10px (y=150→160)
- `mark` 캔버스 (160×160): `MARK_BOX_PATH`
- `full` 캔버스 (500×200, y+20 오프셋): `MARK_BOX_PATH_FULL`
- SVG 에셋 (`meros-mark-light.svg`, `meros-mark-dark.svg`)도 동일 톱니 path 로 갱신

### LG-1 · favicon

**원본**: `assets/images/favicon-mark.svg` (신규, 톱니무늬 160×160 mark)
**생성 파일**: `favicon.png` (32×32), `favicon-16.png`, `favicon-180.png`, `favicon-192.png`, `favicon-512.png`
**빌드 출력**: `dist/favicon.ico` (48/32/16px 3-frame, ImageMagick 직접 생성)
**app.json**: 변경 없음 (`web.favicon: "./assets/images/favicon.png"` 그대로, Expo Metro 가 PNG 사용)

### LG-3 · 입력칸 1줄

**원인**: `floatingPlaceholder={true}` → `TextField.tsx:90` 에서 `'pb-2 pt-6': floatingPlaceholder` → `pt-6`(24px) 적용 → 2줄 느낌 발생

**수정**: `app/login.tsx` — Email/Password `TextField` 에서 `floatingPlaceholder` prop 제거
- `pt-6 pb-2` → `py-4` (16px 균등 패딩)
- 측정 결과: **51px** (≤ 56px 기준 통과)
- 공용 `TextField` 컴포넌트 불변 (다른 화면 영향 없음)

---

## 자기 검증 (Playwright)

**실행**: `node scripts/m1-1126-i-playwright.mjs`
**결과**: **14/14 PASS · 0 FAIL**

```
✓ Rect import 없음
✓ MARK_BOX_PATH 존재
✓ 톱니 path 문자열 (V 150)
✓ full canvas 톱니 path (V 170)
✓ loginEmail floatingPlaceholder 없음
✓ favicon-mark.svg 존재
✓ favicon.png 존재
✓ favicon-180.png 존재
✓ favicon link 존재
✓ favicon link 가 *.ico 또는 favicon 포함
✓ loginLogo SVG 존재
✓ 톱니무늬 path 포함 (V 150 → 160)
✓ 입력칸 높이 ≤ 56px (실제: 51.0px)
✓ 비밀번호 입력칸 높이 ≤ 56px (실제: 51.0px)
```

**기존 unit test**: 88 files · 1125 passed · 0 fail

---

## 스크린샷 (3장)

### 로그인 화면 전체 (`screenshots-m1-1126-i/M1-1126-I-login-full.png`)
- 톱니무늬 로고 · POS 부제 · 1줄 입력칸 확인

### 로고 확대 (`screenshots-m1-1126-i/M1-1126-I-logo-zoom.png`)
- 노란 박스 아래 가장자리 톱니무늬 명확

### favicon ICO 48px 프레임 128px 확대 (`screenshots-m1-1126-i/M1-1126-I-favicon-ico-128.png`)
- 새 로고(노란 M + 톱니) 확인

> favicon-orig.png: dist가 `/favicon.ico` 를 서브하고 `/favicon.png` 는 404 → ICO 프레임 직접 추출로 대체 검증

---

## 어설션 파일

`scripts/m1-1126-i-playwright.mjs` — 소스+Playwright 통합, dist 없을 때는 소스 어설션만 실행
