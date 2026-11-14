# CurioCity 열린 요구 원장 (오케 유지 · Kyu 원문 기준)

갱신: 2026-11-13 06:40 WIB (Kyu 06:35 회신 7항 반영 · decision-next-big-20261113 · 오케 작업자) · 그 전 2026-11-13 WIB (handoff-20261113 §2~§9 병합) · 직전 갱신 2026-11-11 17:55 WIB (11-09 11:05 판 + 11-10~11 결정·착지 통합) · 규칙: 새 요구 = 여기 먼저 등재(Kyu 원문 그대로 · 오케 번역은 괄호) · 소유 허브 필수 · 착지·실기 통과 시 ✅ · 이 파일이 챗보다 우선
**발부 규약(09-16)**: 모든 프롬프트 작성 직전 이 파일을 읽고 `원장 대사:` 한 줄. 재언급 🔴. 주 1회 미발부 요구 표.
**갱신 규약(11-06)**: 결정·착지마다(최소 하루 1회) 이 파일 + `work-queue.md` 갱신. **이 파일이 기억의 정본**.
**세션 교체 규약(11-09)**: 오케 세션·클로드코드 허브 세션은 **매일 새로**. 마감 시 `ledger/handoff-<날짜>.md`(당일 스냅샷) 작성. 새 세션 첫 줄: `CurioCity 오케. relay ledger/open-requirements.md · work-queue.md · 최신 handoff 읽고 현황판부터.` **최신 handoff: `ledger/handoff-20261114.md`** (11-13 05:40 WIB 정본 · 세부 = handoff-20261112.md · handoff-20261113-night.md)
**상태판**: https://claude.ai/artifact/Fpm1UFYvxX4mzCJYHtnBGE · 자동 투입: `queue/<hub>/<ID>.md` → Kyu Mac hub-runner(v6.5 가동 · v6.6 = M2-1105-AC).

## 11-14 09:23 Kyu K1 실기 반영 (원문 = [decision-k1-qris-20261114](decision-k1-qris-20261114.md))

| # | Kyu 원문 요지 | 소유 | 상태 |
|---|---|---|---|
| K1 | QRIS 기본 결제 재실기 (storeport #247) | M0 | ✅ 실기 통과 11-14 |
| N1 | "성공하고나서 영수증화면으로 (즉,Payment successful) 가는게 아니라, Orders 화면으로 가" | M3 | 발부 M3-1105-BZ |
| N2 | "Paid 가 아니라 Captured 라고 표기됨. Paid 로 고치는게 좋을듯" | M0/M2(Admin) | 등재 · Admin 리브랜딩과 묶음(후순위) |
| R1 | 나눠결제 QRIS R1 (서버 split 가드 해제) | M0 | 발부 M0-1105-BS |
| K2 | #131 실기: View order "성공" (Kyu 09:55) | M3 | ✅ #131 머지 c8ed669 (오케 · Kyu 09:55 "4시간동안 머지는 … 너 마음대로") |
| N3 | (K2 실기 09:35) "Process payment 버튼이 있는 화면에 상단이 뒤로가기 버튼이 그냥 <  라고만 되어있어 … < Checkout  이런식으로 버튼명이 되어있길 기대했었어. 근데 그게 없어짐." | M3 | 발부 M3-1105-BZ |
| N4 | (오케) dev-refresh.sh 가 master 전용이라 PR 실기 때 우회 필요 → PR 실기 옵션 | M3 | 발부 M3-1105-BZ |

## 11-13 06:35 Kyu 회신 반영 (이 절이 최신 · 원문 = [decision-next-big-20261113](decision-next-big-20261113.md))

| # | 항목 | 상태 |
|---|---|---|
| K1 | storeport #233 머지 | ✅ Kyu "머지 결정" → 오케 squash 머지 **#233 = 03226a1 · #236 = 19f38d5** |
| K3 | 실기: QRIS 테스트 결제 | **Kyu 실기 대기(지금 가능)** — Railway 배포 2~3분 뒤 iPad QRIS → QR 화면 하단 "Simulate payment (test)" → 수 초 내 영수증 · Admin 주문 Paid · Xendit Webhook Logs 200 |
| K2 | 실기: fork #118 결제수단 아이콘 | **부분 통과** — 아이콘 있음 ✓ · 크기 불변 ✓ · 나눠결제 화면 동일 ✓ · 남은 1개 = 선택된 버튼(배경 옅은 검정)에서 아이콘이 흰색으로 보이는지 Kyu 재확인 |
| K8 | 러너 재설치 | ✅ Kyu 완료 |
| K4 | 다음 큰 덩어리 | ✅ 결정 = **EAS 새 앱 빌드만** · 현금 서랍 = 당분간 불필요(범위 밖) · BT-58D 프린터 = 이연 → **M2-1105-BE EAS 계획서(코드 없음) 발부** |
| K7 | CI 비용 절감 | ✅ 종결 = 안 함 |
| K5 | 외부 신청 3건 | Kyu 나중에 |
| K6 | 11-12 실기 잔여 | Kyu 나중에(다음에 몰아서) |
| — | M2-1105-BD(vitest 2 fail) | 착지 · fork #122(clean · CI 4종 pass · 원인 = #114 `action`→`sameShift`) → **R0-1105-DH 리뷰 발부** |

이연 갱신: R0-CJ-3/4 · #236 실제 DB 케이스 · fork lint warnings 46 = 이연 → 발부(위) · BLE 프린터(BT-58D) = Kyu 11-13 "나중으로" · 현금 서랍 = Kyu 11-13 "당분간 필요없을듯"(범위 밖) · EAS 재빌드는 이연 → 진행(계획서 단계).
Kyu 06:38 원문: "모든 허브들이 놀고있는데, 테스트없이는 투입할 프롬프트가 없어?" → 품질 일(제품 동작 변경 0 · Kyu 실기 불필요) 발부: **M0-1105-BM**(#236 실제 DB 통합 테스트) · **M1-1105-BN**(R0-CJ-3/4 · 보이는 금액 변경 시 계획서만) · **M3-1105-BP**(fork lint warnings 46) · **R0-1105-DI**(#232 판정).
**다음 ID**(쓰기 전 queue 폴더 확인): M0-1105-BN · M1-1105-BO · M2-1105-BF · M3-1105-BQ · R0-1105-DJ

## 11-13 현재 상태 (05:40 판 · 위 06:35 절이 최신 · 출처 = handoff-20261113.md 05:40 WIB · 아래 11-11 절 이하는 이력)

**한 줄**: 모든 허브 idle(진행 프롬프트 0) · 남은 것 = Kyu 결정·실기 + fork vitest 2 fail 수정(M2-1105-BD 발부).

### Kyu 할 일 (우선순 · 상태판 kyu_tasks 와 같은 내용)
| # | 항목 | 내용 |
|---|---|---|
| K1 | **storeport #233 머지 결정** | Admin POS Settings "Payment integrations" Xendit 키 저장 화면. R0-1105-DE APPROVE(AES-256-GCM · 끝 4자리만 표시 · 해석기 단일). 돈/설정이라 Kyu "머지해" 필요 → 오케가 #233 → **#236**(R0-1105-DG APPROVE · #233 의존) 순서 머지 |
| K2 | 실기: 결제수단 버튼 아이콘 (지금 가능) | `cd ~/projects/agilo-fork-test && git pull && bash scripts/dev-refresh.sh` → iPad 결제 화면 Cash/Card/QRIS 글자 오른쪽 아이콘 · 선택=흰색 · 크기 불변 · 나눠결제 화면도 (fork #118) |
| K3 | 실기: QRIS 테스트 결제 (K1 후) | Railway 배포 후 2~3분 → iPad QRIS → QR 화면 하단 "Simulate payment (test)" → 수 초 내 영수증 · Admin 주문 Paid · Payments QRIS 1줄 · Xendit Webhook Logs 200. 실패 시 웹훅 코드(401 토큰 · 400 금액 · 503 env) |
| K4 | 결정: 다음 큰 덩어리 | 오케 추천 = EAS 새 앱 빌드 + BT-58D 프린터·현금 서랍(옛 dev client 때문에 새 네이티브 기능마다 우회 중 · Apple Individual 승인 완료) |
| K5 | 외부 신청 3건(리드타임 김) | Xendit "Verify Your Business"(CV 서류) · Meta WhatsApp Business API 번호(CareAgent) · MTI(Mandiri) EDC 연동 API·테스트 환경 문의 |
| K6 | 실기 잔여(11-12) | #224 세금(Admin Tax 줄 · Outstanding 0 · 환불에 세금 포함) · 앱 #111~#114 확인 · Stock cleanup: 11-13 저녁 #82~#85 가 Open orders 에 나오는지 · #81 Stale 칸 Release |
| K7 | 미답 질문 | CI 비용 절감(Playwright 조건 실행·캐시·취소) "줄여"/"아니" |
| K8 | 러너 재설치(허브 전부 idle 일 때 — 지금 가능) | `cd ~/projects/curiocity-relay && git pull && bash scripts/hub-runner-install.sh` (all.json last_error "runner-folder change pending Kyu install") |

### 11-12 밤 ~ 11-13 새벽 프롬프트 결과
| ID | 내용 | 결과 |
|---|---|---|
| M0-1105-BJ | QRIS 시뮬레이션 런북 | storeport #235 머지(docs) · 단 "대시보드에서 pr_id 복사"는 실제 불가였음 |
| M0-1105-BK | QR 화면 Simulate 버튼(서버+앱) | fork #119 머지 · storeport #236 K1 대기 |
| M0-1105-BL | #236 세션 조회 키 버그(항상 404) 수정 | #236 에 포함 · 단위 10/10 |
| M1-1105-BL | #233 리베이스 | CI 초록 · K1 대기 |
| M1-1105-BM | fork master lint | #121 머지(errors 0 · warnings 46 유지) · vitest `void-refund-nav-bc` 2 fail 보고 → M2-1105-BD |
| M2-1105-BC | 환불·반품·내비 자동 테스트 | storeport #237 · fork #120 머지 |
| M3-1105-BM | fork assertions | #117 (허브가 직접 머지 — 규칙 위반 · device-incidents 기록) |
| M3-1105-BN | 결제수단 버튼 아이콘(Kyu 23:55) | fork #118 머지 → **실기 필요 K2** |
| M3-1105-BO | #118 playwright 타임아웃 | #118 에 포함 |
| R0-1105-DE · DF · DG | #233 · #118/#119/#236 · #236 수정분 리뷰 | 전부 APPROVE 상당 |
| **M2-1105-BD** | fork master vitest `void-refund-nav-bc` 2 fail 수정(테스트만) | **발부 11-13**(queue/m2/M2-1105-BD.md) |

### 판정 필요(오케)
- **storeport #232** `test(pos): 건네기 전 전액 환불 → reservation ghost 재현 (M2-1105-BB)` — **OPEN · handoff 에 언급 없음 · 판정 필요(오케)**. 내용: `/refund` 전액이 order.cancel + reservation 정리를 안 해 pending + 예약 잔류(#81 모양) 재현 · `it.failing` 2건(#BB-refund · #BB-stale). 수정 제안 = refund/route.ts 에 void R3 패턴(cancel + deleteReservationItems) 또는 stale 조건에 `payment_status==='refunded'`. 테스트 PR 머지 여부 + 서버 수정 발부(M0) 결정 필요. (M2-1105-BC #237 의 "BC-1 stale 보존"과 겹치는지 확인)

### 제품 결정 정본 (11-12~13)
- [decision-qris-20261112](decision-qris-20261112.md): QR 15분 · 자동 재발행 OFF · Admin POS Settings "Payment integrations" · 테스트 env fallback
- [decision-refund-nav-20261112](decision-refund-nav-20261112.md): 결제 주문 항상 Void+Refund · 미출고 환불 = 예약 해제 · 뒤로가기 모양 불변 · 제목 안 겹침 · View order → Orders 탭+상세
- [decision-split-delivery-test-20261112](decision-split-delivery-test-20261112.md): F1 결제수단 아이콘 · F2 Done 토스트 · F3 상세 Done
- **[decision-payment-icons-qris-sim-20261113](decision-payment-icons-qris-sim-20261113.md)** (신규):
  - Kyu 11-12 23:55 원문: "Payment 할때 Cash Card QRIS 옵션 고르는 버튼에도 Text 오른쪽에 아이콘을 넣어주었으면해." → fork #118
  - Kyu 11-13 00:09 원문: "xendit 에서는, Payment Requests 된 레코드가 없어" → 테스트 결제 버튼(fork #119 · storeport #236)
- Xendit: CurioCity 명의 테스트 계정(MEROS · CV · Test Mode) · 라이브/법인 구조는 첫 외부 고객 때 · 웹훅 = `https://api.meros.id/hooks/payment/xendit`(전부 200) · Railway `XENDIT_SECRET_KEY`·`XENDIT_WEBHOOK_TOKEN` 설정됨
- Stock cleanup 기준시간 선택 = 불필요

### 마일스톤 (Kyu 11-13 00:18 질문에 답한 것)
Xendit 끝 = Anchor 결제의 "테스트 모드" 완성까지. 남은 큰 것:
- Anchor: QRIS live(Xendit KYC · xenPlatform 구조) · 카드 EDC(MTI) · 프린터·서랍(EAS) · 고객·포인트·WA 영수증(라운드 C · 적립률/동의 문구 Kyu 결정) · 매장 투입 준비(상품·재고·직원 계정·Admin 리브랜딩 잔여)
- Wing(경량 온라인 주문 · 픽업 예약) 미착수 · CareAgent(WA) 미착수(Meta 번호 승인 외부 대기)

### 이연 (문서화 ○ · 구현 ✗ · 실기 ✗)
R0-CJ-3/4(세금 fallback 마커·다품목 정밀도) · split+QRIS 환불 · /refund-retry QRIS A안 · #236 pos-integration 실제 DB 케이스 · fork lint warnings 46 · BLE 프린터 · EAS 재빌드(Share PNG)

### 운영 규칙 신규(11-12~13 · 상세 handoff §5)
머지는 오케 몸 — 허브 PR 머지 금지 · 리뷰어 커밋·머지 금지 · ID 발급 전 `queue/<hub>/` 기존 파일 확인 · 리뷰 "주의/필수 아님"도 오케 판독 · fork 체크 API 403 → mergeable_state + 허브 리포트로 판정 · 머지 승인: 돈·재고·설정 = Kyu "머지해" / 그 외 R0 APPROVE + 새 CI 초록이면 오케 / docs-only 오케 바로.

**다음 ID**(쓰기 전 queue 폴더 확인): M0-1105-BM · M1-1105-BN · M2-1105-BE · M3-1105-BP · R0-1105-DH

## 11-11 통합 — P6·배달·결제 화면 (결정 파일 6개 · 원문은 각 파일 유지)

결정 정본(링크): [decision-p6-20261110](decision-p6-20261110.md)(환불·보이드·분할 Q1~Q5 · CARD 단말기 VOID/REFUND = PIN 없음 · 실패/CASH/QRIS = 현금 + 매니저 PIN · PIN 4자리 하루 1회 · Admin 표시) · [decision-p6-split-20261111](decision-p6-split-20261111.md)(S1~S4 "전부 권장." · 최대 2 tender · CASH 포함 시 PIN · 환불 현금부터 · 선주문과 상호 배타) · [decision-delivery-ui-20261110](decision-delivery-ui-20261110.md)(배달·선주문 결제 완료 화면 Hand over 제거 · courier 없는 fulfill 서버 거절 · 상태 표시 이름) · [decision-checkout-ui-20261111](decision-checkout-ui-20261111.md)(실기 A 원문 · 영수증 폭 🔴 2회째 · 경로 제목 · 현금 버튼 확정 규칙) · [decision-p6-test-20261111](decision-p6-test-20261111.md)(P6 실기 B 절차 · PIN 위치 변경 16:28) · [decision-refund-failure-20261111](decision-refund-failure-20261111.md)(환불 중간 실패 = A안 "남은 금액 다시 환불" · 17:53).

### ✅ 완료 (머지 · 실기 통과)
- ✅ 배달 결제 완료 화면 Done · Orders 목록 Awaiting dispatch · 주문 상세 상태 이름 — fork **#79 #83** 머지 · 실기(주문 상세) 통과 11-11.
- ✅ P6 서버 void/refund/반품 — storeport **#207 #208** 머지 · 앱 fork **#77 #80 #84** 머지(11-11). 401/423 키 정합(#77 · remaining_attempts/locked_until) 포함.
- ✅ 결제 화면 3건(영수증 폭 · 머리줄 Order #N · 현금 빠른 버튼) — fork **#85** 머지 · 실기 통과 11-11. (영수증 폭 🔴 2회 요구 해소)
- ✅ storeport **#209** 머지.
- ✅ 실기 A(11-10~11) 통과. (머지 sha 는 각 PR 페이지 참조 — 이 원장에는 미기재)

### 🔄 진행 중
- **P6 실기 B**(Void·환불·매니저 PIN · 상태판 K-1111-p6-test · 보류) — **Void 버튼 무반응(fork #86 · M3-1105-AJ · 원인 = 열린 시트 위에 PIN 시트(RN Modal) 중첩) 머지 뒤 오케가 "시작" 안내**. → R0-1105-BH 리뷰 대기.
- **[M3] P6 실기 B — PIN 숫자 키패드·칸 건너뜀 (decision-p6-test-20261111 17:12)** — 상태: 발부 **M3-1105-AL** · Kyu 원문: "void 시험에서 Manger PIN 을 입력하는 부분이 있는데, 비번 4자리를 입력하는 박스가 나오고 입력할수 있는 키보드가 나오는데, 문제는 키보드가 너무 큰게 나와. 즉, 숫자 키패드만 나오면 되는데, 알파벳까지 입력할수 있는 전체 키보드가 나오면서 화면을 다 잡아먹어. > 그냥 숫자 키패드만 나오도록변경. 그리고 숫자를 입력해보니, 숫자를 입력하는 칸이 4개가 있는데, 첫째 칸에 숫자를 입력하니 2번째 칸으로 커서가 넘어가는게 아니라 3번째 칸으로 넘어감. 내가 다시 포커스를 2번째 칸으로 옮겨서 숫자를 입력하니 4번째 칸으로 커서가 움직임. 이거 문제야. 원인파악해서 고쳐줘."
- **[M3] 키패드 재활용 (decision-p6-test-20261111 17:15)** — 소유 M3 · 상태: M3-1105-AL 진행 중 — 답 받은 뒤 기존 키패드 재활용 반영 · Kyu 원문: "앱 안에서 숫자 키패드가 따로 있었어. 같은 키패드를 쓰면될듯. 재활용필요!"
- **[M1] Void 실패 (decision-p6-test-20261111 17:15)** — 소유 M1 · 상태: **M1-1105-AS 발부**(11-11 17:22 WIB · #212 머지 c1148df 이후 main 기준) · Kyu 원문: "Void 도 실패야. order has active fulfillment ... 라는 검은 알약 toast 메세지가 나옴."
- **[M0] 환불 중간 실패 = "남은 금액 다시 환불" (decision-refund-failure-20261111 · Kyu 17:53 WIB)** — 소유: 서버 M0 · 앱 버튼 M3(서버 계약 착지 후 나중) · 상태: **M0-1105-AM 발부**(storeport #214 이어서 · R0-1105-BK CHANGES 반영 · AL 은 changes) · Kyu 원문: "A (권장): 지금 방식에 "남은 금액 다시 환불" 버튼을 더해" · 카드 환불은 비가역이라 진짜 롤백 불가 → 부분 환불은 기록·재시도 가능하면 허용 · S3(CASH 먼저) 유지.
- **Admin PIN = 왼쪽 메뉴**(Kyu 11-11 16:28 원문 "왼쪽 메뉴 방식으로 변경." · 11-11 15:17 의 "오른쪽 위 4자리 버튼" 요구를 대체 · 하단 카드 제거 · 페이지에 오늘 PIN 크게 + 다음 변경 시각 + 매장 + 날짜 · WIB 자정 자동 갱신) — storeport #211(M1-1105-AQ · DOM 주입)은 **머지 없이 닫음** → **M1-1105-AR**(공식 Admin UI route · 사이드바) 발부. 원장 대사 = "Admin PIN 위치 = 왼쪽 메뉴 (decision-p6-test-20261111 16:28)". ✅ 실기 통과 11/11 17:06 (#213 e5e2449)
- **나눠 결제**(P6 3차 · S1~S4 서버) — storeport **#212**(M0-1105-AJ) → R0-1105-BI 버그 2건 지적 → M0-1105-AK 수정 → R0-1105-BJ 재리뷰 APPROVE → **#212 머지 c1148df**(11-11). 앱 fork **#87**(M3-1105-AK · 나눠 결제 UI)은 R0-BJ CHANGES(split-tender/[draftOrderId].tsx:66 prettier lint 오류) — 수정 후 머지(#212 머지로 조건 충족). 후속: 영수증 renderer(M0-AK) · 앱 Pay in parts UI(M0-AL) · 추가 통합 시나리오(M0-AM).
  - **이연(M0-1105-AK · 11-11) — M0-1105-AL 진행**: 환불 때 나눠 결제 품목 몫이 원 결제 한도보다 크면 환불액이 먼저 잘리고 다른 결제 수단으로 재분배가 안 됨(`return/route.ts:262` refundableCap · test #68 skip) — M0-1105-AL 진행.
  - **이연(R0-1105-BI) — M0-1105-AL 진행**: 환불이 여러 결제에 걸쳐 일부만 실패하면 롤백이 없음(multi refundPaymentWorkflow 부분 실패 무롤백) — M0-1105-AL 진행 → R0-1105-BK 가 롤백 불가(비가역)로 CHANGES → 결정 A 로 **M0-1105-AM** 이 이어받음.
- **방법론 리포**(Kyu: 일하는 방식을 유실되지 않는 문서로) — `CuriocityDevAi/curiocity-devai-method`(private · 29파일 1,645줄 · v1.0 · 4567df4 · M2-1105-AG 착지). 남은 일: **Kyu 가 Claude GitHub 연결에 리포 추가(K-1111-method-access)** → 오케 검토 · MP-006 후보 2건(metrics 주간 집계 절차 · R0 APPROVE 후 오케 squash 머지에 대한 Kyu 명시 승인) 결정.

### ⏳ 외부 대기
- **Xendit key**(QRIS · EDC 자동) · **BLE 프린터 기기**(BT-58D 도착 시 실기) · **Sentry `pos-app`**(Kyu 프로젝트 생성) · Apple(EAS) 잔여.

### 대기 (발부 안 함)
- 서버: delivery 주문 courier 없는 fulfill(hand_over 포함) 400(#208 뒤 · 해소 여부 확인).
- 앱: 반품 품목 선택 화면 · Fulfill 시트(M3).
- 러너: 11-10 장치 사건 #6 #8 필수 · #10~#17 은 `ledger/device-incidents.md`.

## 🔴 운영 장애 (11-07 22:50~ · 11-09 판 기록 · 후속 확인 필요)
- Admin Orders 목록 + 앱 Orders 탭 "An unknown error" · 앱 영수증 화면 "Server Error" — 서버 로그 `logs/railway-api-20261107-1550-1607.log`: `captured_amount` undefined 123회 · `fulfillment polyfill failed: FulfillmentItem.sku null` · `Order id not found` 반복. 유력 뿌리 = #199 tenders "금액 다르면 pending collection 삭제" → dangling link → 목록 직렬화 500.
- M0-1105-V: 실제 작업 25분 뒤 **사용량 한도로 끊김 · push 0**(M1-Y 진단 · 6시간은 CLI 대기). → **M0-1105-W 재발부(11-09 11:05 · 같은 PR #200 · 항목별 push)**. (이후 #205 Fulfill 버그 · 주문 7개 복구 = 11-10 실기 통과. 목록 500 완전 해소 여부는 11-11 재확인 필요.)
- `[railway-ssh] SSH connected` 16:04Z — Kyu 아님. 금지 조항 ⑱ 전 프롬프트 전파 완료 · 허브 특정은 후순위. (11-11: Railway 멤버·감사 로그 확인 카드 K-1111-railway-check 완료.)

## 🔴 Kyu 실기 피드백 (11-07 · iPad · 1~7차) — 이력 (11-10 실기 통과 항목 반영)
- ✅ 카트 비움·Orders 표시 · 영수증 WIB·여백 · 시재 0 Open · 썸네일 · Pay 가드 · 캐셔 줄 · 세금 줄 · 로고 URL(Cloudflare R2).
- **[버그] Z Report 가 Open shift 시트에 덮임** — #60 뒤에도 동일 → M3-Q 진짜 뿌리(Modal race) · fork #64 착지 → R0-1105-AG 리뷰 (이후 상태 확인 필요 — 11-10 이후 머지 이력 기준).
- **[버그] Captured ✓ 이지만 Not fulfilled · Completed 안 됨 · Reserved 누적** → storeport #200 · #205 Fulfill 버그(주문 7개 복구) ✅ 실기 통과(11-10).
- **[요구] 영수증 로고 1.8배** — 프린터 60→110(M2-R · #63) + 화면 110(M3-1105-S · #62).
- **[요구] Pickup date/time 피커(iOS · 15분 · 빠른 칩)** — M3-1105-S/V ✅ #70 #72 #73 #76 #78 실기 통과(11-10).
- **[규칙] 검정 = 화면 넘어가는 결정 버튼만 · 옵션 선택 = 차콜(11-09 개정)** — ✅ #72 실기 통과.
- **[문구] `Product handed over to the customer.`** — #62.
- **[취소] POS Inventory 페이지**. **[완료] "Indar"→"Indah"** Kyu 수정.

## 🔴 Kyu 실기 피드백 (11-09 17:17 · iPad · #62) — M3-1105-V (이후 #70~#78 실기 통과로 대부분 해소)
- [버그] Pre-order 피커에서 날짜·시간 고르고 Confirm → 칸에 `Fri 13 Nov · :` (시간 비어 있음).
- [요구] 피커 안 시간 표시가 너무 작아 잘 안 눌림 — 시간과 "November 2026" 헤더 사이 간격·터치 영역 키우기.
- [버그/요구] 영수증 로고 커진 뒤 Hand over 버튼이 화면 밖으로 밀려 안 보임 — 2열/하단 고정 바 중 오케 판단.
- ✅ 옵션 칩 연회색 규칙 · 키보드 대신 달력 시트 · 빠른 칩 3개.

## Kyu 결정 정본 (11-04~09)
- **선택 표시 규칙 변경(11-09 22:00 · Kyu · 11-07 규칙 대체)**: "회색 박스+검은 테두리 선택 모양이 검은 Pay 버튼과 같이 보이면 디자인이 다운그레이드된 느낌 · 통일성 부족 · 다른 화면 선택 표시도 동일 → **검은 버튼에 흰 글자인 Pay 계열이되 무게가 좀 떨어지는 느낌으로 통일**". 오케 해석: 선택 = 진회색(차콜) 채움+흰 글자(무게 낮춤) · 결정 버튼(Pay·Confirm·Hand over) = 검정 그대로 · 미선택 = 흰+옅은 테두리. 피커 머리줄: "November 2026 영역을 시간(10:00)과 같은 폰트 크기로". → M1-1105-AC. ✅ 실기 통과 #72(11-10).
- **Fulfill 시트(11-09 17:17 · PR #65 Q1~Q3 전부 A)**: Q1 배송지·받는 사람 연락처 = **결제할 때**(Checkout 주소 단계) · Q2 Delivery Fulfill 필수 = **택배사만**(기사·연락처·운송장·메모 선택) · Q3 Delivery = **1단계**(Fulfill = 재고 차감 + Completed). ✅ #206+#75 배달 배송지 실기 통과(11-10).
- 반올림: 현금 Pembulatan 없음 · % round. 승인번호 6+4. WA 공유 먼저. 분할 P6. PG Xendit. Pre-order 기본 100% · DP% Admin(`preorder_deposit_pct`).
- **세금(11-07)**: ⓐ 가산 ⓑ 매장별 PB1 ⓒ SC=Subtotal×SC% · PB1=(Subtotal+SC)×PB1% · 로고 = URL.
- **전달 교통정리(11-07)**: Takeaway = Hand over 즉시 Fulfilled+차감+Completed. Pre-order = 계약금→(잔금)→앱 Orders Fulfill 시트(Pickup 기본 / Delivery: 택배사·기사·연락처·운송장·메모) 시점 차감. Delivery = 결제 → `awaiting_dispatch` → Fulfill 시트 → 차감·Completed. Admin 수동 전달 = 보정용만. 서버 계약 `fulfill {stage:'hand_over', method, courier, driver, contact, tracking_ref, note}`(#200).
- **토큰 비용(11-09)**: 토요일 한도 소진 주원인 = 허브 세션(전부 Opus · 상한 없음) + 오케 거대 컨텍스트 × 10분 tick + GitHub MCP 이중 반환. 결정: **R0·M2 = Sonnet · 허브 1회 실행 60분 상한 · heartbeat 30분 · 5허브 병렬 유지(상한 없음) · 감시 10분 유지(Kyu 작업 중만) · 오케·허브 세션 매일 새로 · 밤샘 자율 운영 당분간 없음**. → M1-Y 로 러너 반영 완료. (11-10: 감시 20분 · M1·M3 도 Sonnet 기본 — 프로필 메모리 참조)
- "백그라운드에서 무엇이 도는지 cmux 에서 보게"(11-09) — launchd 아래 cmux 탭 미표시 → M1-1105-Z.
- **MEROS 앱 UI 전부 영어 · 팔레트 D1 · P5 교대 ①~⑤**. 외부 신청: Apple Pending · Xendit·은행 미착수. Admin 비번 유지.

## 방법론 (요지 · ⑯~⑱ 11-07 · ⑲~㉑ 11-09)
①~⑮ 유지(R0 리뷰 · 파일 주인 · 계획 게이트 · 감시 10분/30분 · 목적 2~3줄+작업 큐 · chore 직접 머지 · 진단은 타 허브 · 상시 [REPORT] · 쌓인 PR 합쳐 · mock=fixture · Node 22).
⑯ 프롬프트 상태판 + claims 신호 · 러너 자동 투입 · 오케 tick 이 상태판 반영 · 머지 뒤 실기 필요→완료 · 러너 수정 = 수동 투입 + 새 파일 검증 후 교체(W 사고).
⑰ R0 체크 ⑦ RN 번들 안전(`node:` import 0 · 번들 가드 #61).
⑱ 허브 상시 금지: 운영 SSH · railway CLI · 운영 DB · 키체인/`security` · 허브 폴더 밖.
⑲ **세션 교체·인수인계**: 마감 = handoff 파일 + 두 원장 갱신 + 상태판 정합. 새 세션은 원장 3개로 시작 · 챗 기억에 의존 금지.
⑳ **비용 가드**: 모델 분리(R0·M2 Sonnet) · 60분 상한(초과 = blocked "timeout 60m") · heartbeat 30분 · 오케는 리포트 전문 대신 claim+요약 우선 읽기.
㉑ **(11-09) claim done ≠ 완료**: M3-R 이 코드 0인데 exit 0 → done 으로 표시됨. 오케는 착지 판정 시 PR 커밋 시각/리포트 파일로 확인 · 허브 프롬프트는 항목마다 commit+push · 45분 시점 미완 명시 후 종료 · 러너 검증은 M1-Z.

## StorePort / Meros (11-09 판 스냅샷 — 이력 · 최신 = 위 "11-11 통합")

### 착지 ✅ (11-09 기준)
- storeport main **4f3cd43**(#196 #197 #199). 열린 PR **#200**(M0-T/U · R0-AE 경미 반영 · M0-W 가 같은 PR 에 이어서). (이후 #200 · #205 · #207 · #208 · #209 머지)
- fork master **a0bfcd6**(#48~#61). 열린 PR **#62**(P4 탭) · **#63**(M2-R 프린터 로고) · **#64**(M3-Q Z Report 뿌리). (이후 #70~#85 머지)
- relay: hub-runner **v3**(M1-Y · pid 80967) · claim.mjs · r0/README ⑦ · handoff-20261109.

### 로드맵 (10-12 · 유지) · 전 제품 공통 · 머지 규칙(R0 APPROVE → squash · chore 직접) · K0/T0/N0 변동 없음.
