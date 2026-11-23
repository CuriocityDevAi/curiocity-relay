#230: APPROVE

## 판정 근거

fix 자체: `MIRROR_URL` `/mirror.html` → `/mirror` 복귀. expo-router가 브라우저 URL을 라우트 키로 사용하므로 `.html` suffix → no route match → "Route Page" 발생, extensionless `/mirror` → `app/mirror.tsx` 올바른 매칭. M0-1123-C 서버 fix(cdwResolveFile) 전제 충족 확인.

## 4개 확인 항목

| # | 항목 | 결과 |
|---|------|------|
| ① | 운영 URL `https://admin.meros.id/customer-display-web/mirror` 카트 렌더 | Playwright spec 로컬 재실행 2 passed (5.0s) ✅ |
| ② | pos-mirror 이벤트 주입 시 카트·합계 표시 | Test 1: cart_building + Nasi Goreng Test 텍스트 가시성 어설션 통과 ✅ |
| ③ | POS WebView 미러 URL 외 동작 영향 없음 | MIRROR_URL 상수 1줄 변경만, 마운트·드래그·오프라인 로직 무변경 ✅ |
| ④ | spec이 의미 있는 어설션인가 (mock=1 빈 테스트 아님) | mock=1은 boot-check bypass 전용, 렌더 로직 실행됨; "Nasi Goreng Test" 텍스트 + "Route Page" 미노출 어설션 유효 ✅ |

## 인라인 코멘트 (nit, blocker 아님)

- `CdPreviewWindow.tsx:52–55`: 주석 언어 일본어 → 한국어/영어 통일 권장
- `CdPreviewOverlay.tsx`: M1-1123-C 번들 변경 (`usePosScreenHint`) — `hint?.extras` spread 키 범위 문서화 권장

## CI

gh pr checks 무응답 (CI 미구성 또는 자동 트리거 없음). Playwright spec 로컬 직접 실행으로 대체.
