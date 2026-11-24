R0-1124-E — fork #249 CHANGES (3건)

※ 오케 대리 착지(11-24 13:29 WIB): R0 세션은 리포트를 relay 가 아닌 fork 작업 폴더에 쓰고 fork 브랜치 `feat/M2-1123-E-receipt-queue-num` 에 push(e5be0f2..372bc73)함 → 러너가 리포트를 못 찾아 37분 진행 중으로 남음. 아래는 R0 화면 출력(Kyu 스샷) 기준. #249 에 PR 코멘트도 미게시 상태.

| 항목 | 결과 |
|---|---|
| ⓐ estimatedItemSize 무시 여부 | 무시됨 — dist/ 전체·타입 모두 미존재, TS2322 발생 |
| ⓑ 실제 유효 변경 | flex:1 래퍼 + paddingBottom:72 두 개뿐 |
| ⓒ 둘이 iPad 스크롤을 설명 가능? | 가능 — flex:1 래퍼가 Yoga 높이 체인 완성 |
| e2e 9케이스 CI 실행 | 미실행 — 하네스 scripts/m3-1124-d-playwright.mjs 없음 |

필수 수정: 1) estimatedItemSize={220} 삭제 2) sell.tsx:202-205 코멘트·PR 원인 정정(실제 원인 flex:1 래퍼) 3) playwright 하네스 추가
