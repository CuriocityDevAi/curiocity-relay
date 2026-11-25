PASS · PR #268 · ![login-screen](e2e/screenshots/M3-1125-W-login-screen.png)

## M3-1125-W — NativeWind darkMode 에러 수정

### 변경 내용
- **`tailwind.config.js`**: `darkMode: 'class'` 추가 (NativeWind v4 권장)
- **원인**: `darkMode` 미설정 → 기본값 `'media'` → `css-interop` `MutationObserver`가 dev 번들 주입 시 `colorScheme.set()` 호출 → `color-scheme.js:46` throw
- **수정**: `'class'` 설정 시 `darkMode` 변수가 `'media'`가 아니므로 throw 없음
- **네이티브 영향 없음**: `hooks/useColorScheme.ts` 는 항상 `'light'` 반환

### 검증
| 항목 | 결과 |
|------|------|
| lint | ✅ 0 errors (71 warnings 기존 동일) |
| unit tests | ✅ 88 files · 1125 tests 전부 통과 |
| Playwright | ✅ 로그인 화면 렌더 · 콘솔 에러 0 |
| expo export -p web | ✅ 빌드 성공 |

### PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/268

### 스크린샷
`e2e/screenshots/M3-1125-W-login-screen.png` — 로그인 화면(스플래시) 렌더 · 콘솔 에러 없음
