판정: icon.png color_type=2 (RGB) 확인 — RGBA(color_type=6) → RGB(color_type=2) 변환 성공

## 작업 내용

- **수정 파일**: `apps/customer-display/scripts/gen-icons.mjs`
- **변경 사항**: magick 커맨드 3곳 (base M 레이어, icon.png, splash.png)에 `-alpha off` 추가

## 검증 로그

```
$ file apps/customer-display/assets/icon.png
icon.png: PNG image data, 1024 x 1024, 16-bit/color RGB, non-interlaced

$ file apps/customer-display/assets/splash.png
splash.png: PNG image data, 1024 x 1024, 16-bit/color RGB, non-interlaced
```

## Splash 처리

splash.png 배경색은 `xc:"#FFE58A"` (불투명 노란색) — 투명 의도 없음 → icon.png와 동일하게 `-alpha off` 적용하여 RGB 변환.

## 커밋

`3f2ce03` fix(brand): M2-1116-AT — icon.png 알파 채널 제거 (RGBA→RGB, color_type 6→2)
PR #318 `feat/m2-1116-ak` push 완료.
