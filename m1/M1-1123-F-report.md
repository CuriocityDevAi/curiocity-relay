PASS · PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/230 · 원인: `/mirror.html` URL로 WebView를 열면 expo-router hydration 시 `/mirror.html` 라우트를 탐색해 매칭 실패 → "Route Page" 표시; storeport M0-1123-C 서버 fix(cdwResolveFile) 배포 후 `/mirror`(extensionless)도 `mirror-*.js`를 올바르게 반환하므로 URL을 `/mirror`로 복귀.

## 두 주소 응답 비교

| 경로 | HTTP | bundle | expo-router 매칭 | 결과 |
|------|------|--------|-----------------|------|
| `/customer-display-web/mirror` | 200 | `mirror-*.js` ✓ | `/mirror` → `app/mirror.tsx` ✓ | 카트 화면 렌더 |
| `/customer-display-web/mirror.html` | 200 | `mirror-*.js` ✓ | `/mirror.html` → no route ✗ | "Route Page" |

## 자기 검증

`e2e/flows/M1-1123-F-mirror.spec.ts`: 운영 URL `https://admin.meros.id/customer-display-web/mirror?mock=1`에 `pos-mirror` CustomEvent 주입 → "Nasi Goreng Test" 카트 항목 텍스트 어설션 → **2 tests passed (7.7s)**

스샷: `e2e/screenshots/M1-1123-F-mirror-cart.png` (카트 항목 렌더 확인)

## Kyu 실기 항목

- POS 미리보기 버튼 클릭 → floating 창에 카트 상품 목록·금액·전화번호 입력 단계가 보이면 정상
- 수정 전: "Route Page" 텍스트만 표시
