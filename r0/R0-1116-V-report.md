#308 CHANGES_REQUESTED · splash 살아있음

## REQ 1 — splash 살아있음 (SDK 58 정석) ✅

- top-level `splash` 블록 제거 → `expo-splash-screen` 플러그인 대체 (SDK 58 정석)
- 플러그인에 `image: "./assets/splash.png"`, `imageWidth: 600`, `resizeMode: contain`, `backgroundColor: #ffffff` 명시
- `splash.png` binary 신규 추가 확인 → 시작 화면 유지됨, 없어지지 않음

## REQ 2 — naming-check 예외 범위 ❌ BLOCKER

현재 예외:
```bash
| grep -v -E '/apps/customer-display/app\.config\.ts:' \
```
이 패턴은 `app.config.ts` **파일 전체**를 grep 제외 → `name:` 필드 1곳만 허용이 아님. 나중에 해당 파일 어느 줄에 "meros"가 추가되어도 전부 통과하는 구멍이 있음.

수정안:
```bash
| grep -v -E '/apps/customer-display/app\.config\.ts:[0-9]+:[[:space:]]*name:' \
```

## REQ 3 — 나머지 ✅

| 항목 | 결과 |
|------|------|
| 아이콘 황금 amber 띠 (#C47D0A) | PR description 명시, `icon.png` binary 신규 추가 ✅ |
| top-level + ios 양쪽 `icon` 경로 명시 | ✅ |
| 웹 `<title>` / favicon 영향 | `web.favicon` 미변경, Expo Router 메타 제어 → 영향 없음 ✅ |
| pos-integration | ✅ (M2 report + CI 기록) |
| TS clean | `tsc --noEmit` clean ✅ |

## 판정

**CHANGES_REQUESTED** — `naming-check.sh` 예외를 파일 전체 제외에서 `name:` 줄 한정으로 좁혀야 머지 가능.
