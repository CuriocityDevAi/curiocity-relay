DONE — 아이콘·스플래시 4× 슈퍼샘플링 선명화 + PR 미리보기 스크린샷 커밋 완료

## 흐림 원인

`gen-icons.mjs` 가 `magick -size 1024x1024` 에서 직접 폴리곤을 그려 ImageMagick AA 가
1024px 에서 적용 → 엣지 전환 5–7px 폭(작게 그린 뒤 확대한 것과 동일한 흐릿함).

## 수정

4× 슈퍼샘플링: 4096×4096 에서 렌더 후 목표 해상도로 Lanczos 축소.
  - icon:  4096×4096 렌더 → 1024×1024 (4× SS, AA 전환 2–3px)
  - splash: 4096×4096 렌더 → 2048×2048 (Expo 권장 초과, AA 전환 2–3px)

## 커밋 (feat/m2-1116-ak)

27e0699  fix(brand): M2-1117-C — 손님 화면 아이콘·스플래시 선명도 개선 + PR 미리보기 스크린샷 커밋

변경 파일:
- apps/customer-display/scripts/gen-icons.mjs (4× SS 도입)
- apps/customer-display/assets/icon.png       (1024×1024 RGB, sharp)
- apps/customer-display/assets/splash.png     (2048×2048 RGB, sharp)
- apps/customer-display/assets/brand/preview-cd-76.png
- apps/customer-display/assets/brand/preview-cd-60.png
- apps/customer-display/screenshots/pair-screen.png      (신규 커밋)
- apps/customer-display/screenshots/screen1-default.png  (신규 커밋)
- apps/customer-display/screenshots/screen2-pastel.png   (신규 커밋)
- apps/customer-display/screenshots/icon-before-after.png (전/후 비교)

## 링크 확인 (HTTP 200, 인증 포함 · 비공개 리포)

screenshots/pair-screen.png      ✅ 200
screenshots/screen1-default.png  ✅ 200
screenshots/screen2-pastel.png   ✅ 200
assets/icon.png                  ✅ 200
assets/brand/preview-cd-76.png  ✅ 200
assets/splash.png                ✅ 200

## 테스트

- expo-doctor: 20/20 PASS
- pnpm test: 132 (customer-display) + 351 (commerce-core) + 21 (event-contracts) = 504 PASS
- naming-check.sh: PASS

## 미검증

- 실기(아이패드 앱 빌드 후 아이콘 선명도 육안 확인): Kyu 소관
- screenshots 가 M2-1117-A BrandMark 반영 여부: Playwright 10:00–10:01 생성 (M2-1117-A 커밋 10:04 직전),
  UI 변경 사항이 반영되어 있을 것으로 추정되나 육안 미확인

## 이연 순증감

이연 없음 (이번 PR 범위 내 완결)
