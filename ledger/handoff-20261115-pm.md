# Handoff 2026-11-15 PM (14:00~ 오케 창 · handoff-20261115.md 13:30 절 뒤 이어짐 · 이 파일이 최신 · 갱신 17:45 WIB)

새 창 첫 줄: `CurioCity 오케. relay ledger/handoff-20261115-pm.md 읽고 현황판부터.`
Kyu 15:30~ 외출(~20:30 귀환 예정) · 오케 자율 운영 중.

## Kyu 실기 결과 (나눠결제 QRIS · qris-split-refund-plan §6-1)
- 실기 1 (CASH 50,000 → QRIS 54,500 · Order #104) ✅. Kyu 15:11 원문: "QRIS 밑에 Reforder_... 이라고 아주 긴 텍스트가 영수증 화면을 넘어갔음 . 고쳐야함." → fork #144 머지 f8a9d6a(끝 8자리 `…xxxxxxxx` · 화면+프린터) → **Kyu 실기 필요**
- 실기 2 — 4번 ✅(Kyu 15:30 "내가봤을때에는 정상이야") · 6번 ❌ Kyu 15:25 원문: "6번에서 남은금액이 전액이야. 즉, QRIS로 승인난 금액은 차감이 된 상태로 2번째 남은금액이어야하는데, 전액이남아있는게 문제야." → #273 머지 8f0c901(GET orders/:id paid_so_far = metadata.tenders captured 합 · Order #105 데이터 보정 불필요) → **Kyu 재실기 필요**
- 실기 3·4 미실시
- 앱 시작 오류(14:27 netinfo) → fork #142 머지 c6f90d7 ✅ Kyu 확인

## 머지 (14:00~17:45)
storeport: #261 R7 소멸 · #256 Admin 로열티 R2 · #270 ci-summary · #268 손님앱 G2 · #271 S1b+R4 적립 · #272 장식 7종 · #274 마이그레이션 클래스명 충돌(운영 Loyalty 테이블 미생성 가능성 높았음) · #273 QRIS 먼저 remaining · #269 손님 화면 웹 서빙(A0) · #275 장식 화면 연결 · #276 장식 e2e
fork: #142 netinfo 가드 · #144 영수증 Ref · (#141 닫힘)

## 열린 것
| 항목 | 상태 |
|---|---|
| storeport #277 loyalty spec CI 편입 + 동명 마이그레이션 금지 + prod-migration-check 런북 | pos-integration ❌(실 DB 에서 loyalty spec 첫 실행) → M0-1105-CO 원인 판정 중(제품 버그 여부) |
| fork #140 POS 손님 번호 연결(Link customer) | R0-EZ APPROVE · ready · **QRIS 실기 끝난 뒤 머지**(결제 완료 화면 변경) |
| M2-1105-BT 계획서 PR #143(A1 Admin 손님 화면 설정 · A2 이벤트 달력) | Kyu 질문 정리 필요 · 리포지토리 확인 필요(storeport 열린 PR 목록에 없음 → fork?) |

**다음 ID**: M0-1105-CP · M1-1105-CM · M2-1105-BY · M3-1105-CS · R0-1105-FF

## Kyu 귀환 실기 순서 (self-contained 안내 필요)
1. Admin → Settings → Loyalty 화면 500 없이 열림(#274 배포 확인) · 런북 = #277 의 docs/runbooks/prod-migration-check.md
2. Mac `cd ~/projects/agilo-fork-test && git checkout master && git pull && bash scripts/dev-refresh.sh` → 아이패드 앱 재시작
3. Order #105 다시 열기 → 나눠결제 2차 Remaining 53,400 확인 → Cash 53,400 완료
4. 영수증 QRIS 줄 `Ref …xxxxxxxx` 한 줄
5. 실기 3(QRIS 50k + QRIS 나머지) → 4(전액 환불 → Xendit refund)
6. fork #140 머지 → 포인트 실기(Admin 로열티 enabled + 적립률 설정 → 결제 완료 "Link customer" → 번호 → 잔액/적립)

## 교훈 (오늘 PM)
- R0 가 PR 본문만 믿고 APPROVE → "worktree 로 직접 실행 필수" 추가 후 실버그 다수 적발
- 허브가 오래된 브랜치 재사용 → "origin/master 새 워크트리" 조항
- 네이티브 모듈 신규 의존 = 기존 dev client 즉사 → R0 체크 "재빌드 없이 도는가"
- **리포트 중간 push 금지** — 러너가 리포트 파일 등장 = done 처리해 허브가 일 도중 종료(M0-CM)
- 허브가 draft PR 을 남기면 오케 머지가 405 — 오케가 update_pull_request(draft=false) 로 직접 해제 가능
- 마이그레이션 클래스명은 전 모듈 공유 테이블에 기록 — 동명이면 조용히 건너뜀
