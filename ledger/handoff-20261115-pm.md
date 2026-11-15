# Handoff 2026-11-15 PM (14:00~ 오케 창 · handoff-20261115.md 13:30 절 뒤 이어짐 · 이 파일이 최신)

새 창 첫 줄: `CurioCity 오케. relay ledger/handoff-20261115-pm.md 읽고 현황판부터.`

## Kyu 실기 결과 (나눠결제 QRIS · 계획서 qris-split-refund-plan §6-1)
- 실기 1 (CASH 50,000 → QRIS 54,500 · Order #104 · R-261115-0001) ✅ 통과. 단 Kyu 15:11 원문: "QRIS 밑에 Reforder_... 이라고 아주 긴 텍스트가 영수증 화면을 넘어갔음 . 고쳐야함." → M1-1105-CK fork #144(끝 8자리 `…xxxxxxxx` · 화면+프린터) → R0-FB CHANGES(prettier) → M1-1105-CL 수정 중
- 실기 2 (QRIS 먼저) — 4번(대기 중 2차 진입 → "QRIS 미완료" → QR 화면 복귀) ✅ Kyu 15:30 "내가봤을때에는 정상이야". 6번 ❌ Kyu 15:25 원문: "6번에서 남은금액이 전액이야. 즉, QRIS로 승인난 금액은 차감이 된 상태로 2번째 남은금액이어야하는데, 전액이남아있는게 문제야." (Order #105 · 103,400 · 1차 QRIS 50,000 captured · 2차 미완료로 남아 있음) → M0-1105-CL storeport #273(GET orders/:id paid_so_far = metadata.tenders captured 합 · 운영 DB 보정 불필요) → R0-FC 리뷰 중
- 실기 3·4 미실시 (#273 머지·배포 뒤)
- 앱 시작 오류(Kyu 14:27 로그 `NativeModule.RNCNetInfo is null`) = fork #135 netinfo 가 기존 dev client 에서 죽임 (R0-EH "재빌드 전 머지 안전" 오판) → fork #142 머지 c6f90d7 → Kyu 앱 정상 실행 확인(실기 1 진행됨)

## 머지 (14:00~)
storeport: #261 8b52033(R7 소멸 · 막힘 원인 = 리뷰 대화 아니라 main 충돌) · #256 9f55c28(Admin 로열티 R2) · #270 864f01c(ci-summary PR 코멘트 — 이제 오케가 PR 코멘트로 CI 확인 가능) · #268 17058fc(손님 앱 G2) · #271 1ff9e82(S1b+R4 적립 · 주문별 advisory lock · subscriber payment.captured → order 해석) · #272 34bf98c(이벤트 장식 7종 · decor-preview 운영 Redirect)
fork: #142 c6f90d7(netinfo 가드) · #141 닫힘(오래된 브랜치)

## 열린 PR
| PR | 내용 | 상태 |
|---|---|---|
| storeport #274 | 🔴 마이그레이션 클래스명 충돌(register_session 과 동명) → loyalty_settings·customer_display_settings 4테이블 미생성 · **운영도 없을 가능성 높음**(Dockerfile CMD db:migrate 동일) | R0-FC 리뷰 |
| storeport #273 | 🔴 나눠결제 QRIS 먼저 remaining 돈 버그 | R0-FC 리뷰 |
| storeport #269 | 손님 화면 웹 서빙(A0) · middlewares 핸들러 | M2-1105-BW(console.log · feature-map · matcher) |
| storeport #143? | (주의) M2-1105-BT 계획서 PR 번호 확인 필요 — claim 에 "PR #143" · storeport 인지 fork 인지 | Kyu 질문 정리 필요 |
| fork #144 | 영수증 Ref 말줄임 | M1-1105-CL prettier |
| fork #140 | POS 손님 번호 연결(Link customer) · R0-EZ APPROVE · ready | **QRIS 실기 끝난 뒤 머지**(결제 완료 화면 변경) |

## 진행 중 프롬프트 (16:43 WIB)
R0-1105-FC · M1-1105-CL · M2-1105-BW · M3-1105-CQ(EventDecor 화면 연결) · M0 idle
**다음 ID**: M0-1105-CM · M1-1105-CM · M2-1105-BX · M3-1105-CR · R0-1105-FD

## 다음 할 일 (순서)
1. #274 머지 → 운영 배포 후 Kyu 확인: Admin → Settings → Loyalty 화면이 500 없이 열리는지 · 이어 M0: #271 loyalty spec CI 편입(M0-CK 가 롤백해 둔 것)
2. #273 머지 → Railway 2~3분 → Kyu: Order #105 다시 열어 Remaining 53,400 확인 → 실기 2 재시도 → 3(QRIS+QRIS) → 4(환불 Xendit refund)
3. fork #144 머지 → Kyu 실기(영수증 Ref 한 줄)
4. fork #140 머지 → 포인트 실기(번호 입력 → 결제 → 적립 · Admin 로열티 설정 enabled 필요)
5. M2-BT 계획서(A1 손님 화면 Admin 설정 · A2 이벤트 달력) Kyu 질문 → 승인 뒤 코딩

## 사고·교훈 (오늘 PM)
- R0 가 PR 본문만 믿고 APPROVE(EX) → #269 pos-integration 빨강 놓침. 이후 R0 발부에 "worktree 로 직접 실행 필수" 추가 → EY 부터 실제 버그(이중 적립 틈 · `[...path]` 부팅 실패 · console.log) 잡음
- M3-CN 이 오래된 브랜치 재사용 → "기존 브랜치 재사용 금지 · origin/master 새 워크트리" 조항 추가
- 네이티브 모듈 신규 의존 = 기존 dev client 에서 앱 즉사 → R0 체크항목 "재빌드 없이 도는가" 필수화
- runner all.json last_error "runner-folder change pending Kyu install" 계속 뜨지만 발부·실행은 정상
