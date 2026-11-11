# M1-1105-AR 완료 리포트

## 대사표

| 항목 | 결과 |
|---|---|
| PR #211 처리 | closed 상태 확인 · 댓글 추가 완료 (머지 없음) |
| 신규 브랜치 | `feat/m1-1105-ar-admin-pin-route` (origin/main 기준) |
| 신규 파일 | `src/admin/routes/manager-pin/page.tsx` — `defineRouteConfig(label "Manager PIN", icon Key)` |
| 유틸 파일 | `src/admin/routes/manager-pin/wib-clock.ts` — `msUntilWibMidnight` + `formatWib` |
| 단위 테스트 | `__tests__/manager-pin.unit.spec.ts` — 자정 타이머 모킹 포함 · 5 tests pass |
| 위젯 삭제 | `src/admin/widgets/manager-pin.tsx` 삭제 완료 |
| DOM 주입 | 없음 (route 방식만 사용) |
| API 변경 | 없음 (GET /admin/pos/manager-pin 그대로 재사용) |
| typecheck | PASS |
| 전체 테스트 (run-all) | 39 tests pass (6 suites) |
| PR | https://github.com/CuriocityDevAi/storeport/pull/213 |

## 스크린샷

Playwright 미검증 — CI 환경(Playwright) 미설정

## #211 닫음 확인

PR #211 이미 closed(merged=false) 상태 · 댓글 추가: "Kyu 결정으로 왼쪽 메뉴(공식 UI route) 방식으로 대체 — M1-1105-AR"

## 이연 순증감

없음 (신규 이연 없음 · 기존 이연 없음)

## 구현 요약

- 왼쪽 사이드바에 Key 아이콘과 함께 "Manager PIN" 메뉴 등록
- 페이지: PIN 크게(xlarge + mono) · 다음 WIB 자정 변경시각 · Store badge · wib_date
- WIB 자정 타이머(`msUntilWibMidnight`)로 새로고침 없이 자동 갱신
- `window.focus` 이벤트로 탭 전환 후 재조회
- 기존 위젯(`order.list.before`) 완전 삭제
