fork PR #211 (#210 대체·close O) · M 50% safe zone · 투명 fg O · bg #FFE58A O · diff 파일 4개

---

# M0-1119-Q — Android POS 아이콘 fork #210 R0 CHANGES 완료

**세션**: M0 · 2026-11-19 19:08-19:10 (소요 ~15분 · 상한 35분 내)
**모델**: opus (fast off)
**worktree**: `~/curiocity-live/fork-wts/M0-1119-Q-wt` (origin/master 2649e09 기준)

## 결과

| 항목 | 값 |
|------|-----|
| 새 PR | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/211 |
| 브랜치 | `fix/M0-1119-Q-android-icon` → `master` |
| 커밋 | `5ca3e18` on top of master `2649e09` |
| #210 상태 | closed · "Replaced by #211" 코멘트 등록 (comment id 7008716625) |
| 머지 여부 | **미머지** (지시대로 PR 바로 push 후 정지) |
| EAS 빌드 | **미실행** |

## 측정 (R0 확인값 재현)

- Safe zone: Android adaptive 66dp / 108dp 전체 → 1024px canvas 환산 **625.78 px** 지름
- 현재 master M polygon width (`832 - 192`) = **640 px** = safe zone 의 **102.3 %** (넘침)
- 변경 후 `ADAPTIVE_RATIO = 0.5` → M width ≈ **312.89 px** = safe zone 의 **50.0 %**
- `ADAPTIVE_SCALE = (1024 * 66/108 * 0.5) / 640 ≈ 0.489`

## diff (4 파일 · `git diff --stat origin/master`)

```
 assets/images/adaptive-icon-mono.png | Bin 0 -> 4384 bytes
 assets/images/adaptive-icon.png      | Bin 7446 -> 3864 bytes
 docs/M0-1119-Q-android-compare.png   | Bin 0 -> 145654 bytes
 scripts/gen-icons.mjs                |  41 ++++++++++++++++++++++++++++++-----
 4 files changed, 35 insertions(+), 6 deletions(-)
```

- `scripts/gen-icons.mjs`: ADAPTIVE_* 상수 7종 추가 · `M_POS_ADAPTIVE` 파생 · `adaptive-icon.png` 축소 M 재생성 · `adaptive-icon-mono.png` 신규 생성 · `HP_ROOT` existsSync 가드 (POS-only 워크트리에서도 깨짐 없이 실행).
- `assets/images/adaptive-icon.png` (modified): 투명 배경 + 축소 M (`xc:none` 유지 · `fill=#3B2A1F`). 1024×1024 srgba. 평균 알파 5.6 % (M 커버리지 ≈ 5-6 %).
- `assets/images/adaptive-icon-mono.png` (new): Android 13+ themed icon 레이어. 투명 배경 + 흰색 M (`fill=#FFFFFF`). 1024×1024 graya. 시스템이 wallpaper 톤으로 tint.
- `docs/M0-1119-Q-android-compare.png` (new): PR 본문 비교 이미지 (circle · roundSq × 48 · 96 · 192px · BEFORE/AFTER).

## 범위 밖 (손대지 않음 · 명시적으로 복원)

- `assets/images/icon.png` (iOS 아이콘 겸용) — 스크립트가 재생성해도 바이트 변경 없도록 `git checkout origin/master -- ...` 로 복원
- `assets/images/splash-icon.png` — 동일
- `assets/brand/preview-pos-{60,76}.png` — 동일
- `app.json` — `backgroundColor: "#FFE58A"` 그대로 · `monochromeImage` 참조는 **후속 PR** (범위 밖)
- iOS 아이콘 · bg 색 변경 — 금지 조항 준수

## 비교 이미지

`docs/M0-1119-Q-android-compare.png` (1700×580 · 145654 B) — relay copy `/tmp/M0-1119-Q-android-compare.png` 도 동일 파일.

BEFORE 행 (master 2649e09): 원형·둥근사각 마스크 모두 M 이 가장자리에 밀착 (Oppo 런처에서 꽉 차 보이는 재현).
AFTER 행 (이 PR): M 주위에 iOS 수준 여백 확보 · 두 마스크 공히 안정적 여백.

## PR 본문 확인 사항

- "다음 Android preview 빌드 때 반영" 명시 ✓
- 이 PR 로 #210 대체 · close 안내 ✓
- 측정값·변경 파일 표·범위 밖 명시 ✓

## 검증

- `node --check scripts/gen-icons.mjs` → syntax OK
- `node scripts/gen-icons.mjs` 실제 실행 → POS 아이콘 모두 생성 성공 · HP root 미존재 skip 메시지 정상
- `magick identify` → 생성된 PNG 1024×1024 · alpha 유지 확인
- `git diff --stat origin/master` → 4 파일 (스크립트 상수 추가 + 아이콘 자산 2 + PR body 비교 이미지 1)

## 다음 액션 (사용자/후속 PR)

1. #211 리뷰·머지
2. 후속 PR: `app.json` 의 `android.adaptiveIcon.monochromeImage` 에 `./assets/images/adaptive-icon-mono.png` 참조 추가 (Android 13+ 테마 아이콘 활성화)
3. 다음 Android preview 빌드 시 자동 반영 — 별도 아이콘 교체 작업 불필요
