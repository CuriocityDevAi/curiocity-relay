#385 APPROVE · #397 APPROVE · (#385: eslint error 모드 실측 0 error·로직 이동만 / #397: 우회 3곳 제거·직접 단언·느슨해진 곳 없음)

# R0C-1119-S 리뷰 리포트 (2026-11-19 · 클라우드 R0)

## #385 (M2-1118-V R-B3 · HEAD 736ee00) — APPROVE
- 이전 CHANGES(경계 위반 3건) 해소: `eslint .` 실측 **0 error** (9 warning)
- 규칙 작동 확인: src/lib 에 POS 경로 import 임시 파일 → error 나옴
- 로직 변경 0: 이동한 두 파일은 주석만 다름, `_shared` 는 재수출만, 나머지는 import 경로 + 줄바꿈
- typecheck 0 · unit 539/539 · it tenders 96/96 · void-refund-restock 6/6
- 메모: PR 본문 "105 warnings" → 실측 9. 아직 draft.

## #397 (M3-1119-K · HEAD b0ff974) — APPROVE
- 리허설 spec 직접 실행 10/10
- 환불·반품·나중 연결 모두 앞에서 이행된 주문을 그대로 사용. 단언은 유지 또는 강화(나중 연결: 경고 허용 → 200 필수, loyalty-info 200 필수)
- 메모: #384 이전 return route 로 되돌려도 이 spec 은 통과 — #384 실제 수정점(`id` 필드)은 `fulfilled-order-after-sales #S-3` 이 담당. 리허설도 `{id}` 형식으로 보내면 실기와 같아짐(선택).
- 환불 단언이 `ok:true` 뿐인 점은 기존과 동일 — 후속 강화 고려.

CI: 두 PR 모두 리뷰 시점 unit/build 진행 중(실패 없음).
