PASS c47738b — assertions/lint/flow-tests/unit-tests/playwright all pass

## 작업 요약

- **대상**: `CuriocityDevAi/agilo-medusa-pos-fork` PR #271 브랜치 `feat/M1-1126-I-login-logo`
- **문제**: `assets/images/favicon.png` 가 32×32 이어서 `m0-1103-c-assertions` CI 실패
- **수정**: `favicon-mark.svg` 원본에서 ImageMagick(`magick convert`)으로 48×48 PNG 재생성
- **커밋**: `c47738b fix(login): M1-1126-L — favicon.png 48×48 재생성 (CI assertion 수정)`

## 로컬 assertions 결과

```
node scripts/m0-1103-c-assertions.mjs
...
  ✓ assets/images/favicon.png is 48x48
...
71/71 passed · 0 failed
```

## gh pr checks 271 결과

```
assertions    pass   1m8s
flow-tests    pass   1m8s
lint          pass   53s
playwright    pass   5m26s
unit-tests    pass   45s
heavy-cloud   skipping
route         pass   7s  (×2)
```

## 실행 로그

```bash
# favicon 크기 확인 (수정 전)
$ file assets/images/favicon.png
assets/images/favicon.png: PNG image data, 32 x 32, 16-bit/color RGBA, non-interlaced

# 48×48 재생성
$ convert -background none -size 48x48 assets/images/favicon-mark.svg assets/images/favicon.png
# → Size: (48, 48)

# assertions 로컬 통과
$ node scripts/m0-1103-c-assertions.mjs
71/71 passed · 0 failed

# 커밋 & push (rebase 후)
$ git add assets/images/favicon.png
$ git commit -m "fix(login): M1-1126-L — favicon.png 48×48 재생성 (CI assertion 수정)"
$ git rebase origin/feat/M1-1126-I-login-logo
$ git push origin HEAD:feat/M1-1126-I-login-logo
  8e55cd7..c47738b  HEAD -> feat/M1-1126-I-login-logo
```
