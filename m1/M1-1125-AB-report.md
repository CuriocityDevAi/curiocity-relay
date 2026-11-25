PASS · window.location.replace("/pair") → router.replace("/pair") · PR #448

## 원인

`LiveIndexRoute` 미페어링 시 `window.location.replace("/pair")` 호출.
`window.location` 은 expo-router 의 `experiments.baseUrl: "/customer-display-web"` 을 모르고
절대 경로 `/pair` 로 hard-navigate → Express 에 `/pair` 라우트 없음 → "Cannot GET /pair".

## 깨진 시점

`window.location.replace("/pair")` 코드 자체는 M3-1116-S/B (11/16) 에 작성됐으나,
CD web 이 Docker 에서 처음 정상 빌드·서빙된 것은 오늘 M0-1125-N/Q (#442/#443).
그 이전엔 CD web 자체가 배포되지 않아 노출 안 됨.
→ **#444·#446 직접 원인 아님. #442/#443 cd-builder 수정으로 CD web 첫 배포부터 발생.**

## 수정 내용

`apps/customer-display/app/index.tsx` LiveIndexRoute:

```ts
// 전
window.location.replace("/pair");   // baseUrl 무시, /pair 절대경로

// 후
router.replace("/pair");            // expo-router가 /customer-display-web/pair 로 resolve
```

`bootCheck()` 비동기 → `deviceToken === null` 되는 시점엔 navigation 이미 ready.
`router.replace` 가 baseUrl 을 고려해 `/customer-display-web/pair` 로 올바르게 이동.

## PR

#448 · https://github.com/CuriocityDevAi/storeport/pull/448

## Playwright 검증

`e2e/base-url-fix.spec.ts` 2 PASS (expo export → dev-server 로컬 서빙)

| 케이스 | 결과 |
|--------|------|
| ① `/customer-display-web/` 진입 → pair 화면 | PASS |
| ② `/customer-display-web/pair` 새로고침 → pair 화면 (SPA fallback) | PASS |

## 스크린샷

- `apps/customer-display/screenshots/base-url-fix/01-entry-shows-pair.png`
- `apps/customer-display/screenshots/base-url-fix/02-refresh-pair-shows-pair.png`

(두 케이스 모두 "Hubungkan Perangkat" pair 화면 정상 출력. 절대로 "Cannot GET /pair" 없음)
