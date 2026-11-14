# 작업 큐 (Kyu 의뢰 → 허브 할당 · 우선순위 · 상태 · 이유)

갱신 2026-11-13 06:40 WIB (Kyu 06:35 회신 반영 · 오케 작업자) · 그 전 2026-11-13 WIB (handoff-20261113 병합) · **최신 handoff = `ledger/handoff-20261113.md`** · 직전 = `ledger/handoff-20261112.md` · 직전 갱신 2026-11-11 16:20 WIB · 규칙(Kyu 11-05): 오케는 매 응답 현황판 아래에 이 표를 붙이고(바뀐 줄 굵게), 우선순위 변경 시 "↑/↓ 이유". 정본 = 이 파일 · **오케가 갱신** · 최소 하루 1회. 프롬프트별 실시간 상태 = 상태판 https://claude.ai/artifact/Fpm1UFYvxX4mzCJYHtnBGE

결정 정본 파일(원문 보존 · 유지): [decision-next-big-20261113](decision-next-big-20261113.md) · [decision-payment-icons-qris-sim-20261113](decision-payment-icons-qris-sim-20261113.md) · [decision-qris-20261112](decision-qris-20261112.md) · [decision-refund-nav-20261112](decision-refund-nav-20261112.md) · [decision-split-delivery-test-20261112](decision-split-delivery-test-20261112.md) · [decision-delivery-ui-20261110](decision-delivery-ui-20261110.md) · [decision-p6-20261110](decision-p6-20261110.md) · [decision-p6-split-20261111](decision-p6-split-20261111.md) · [decision-checkout-ui-20261111](decision-checkout-ui-20261111.md) · [decision-p6-test-20261111](decision-p6-test-20261111.md) · 장치 사건 [device-incidents](device-incidents.md) · 지표 [metrics](metrics.md)

## 11-13 06:35 Kyu 회신 반영 (이 절이 최신)

### Kyu 할 일
| # | 항목 | 상태 |
|---|---|---|
| K3 | **실기: QRIS 테스트 결제**(#233 03226a1 · #236 19f38d5 머지됨) | **지금 가능** — Railway 배포 2~3분 뒤 iPad QRIS → "Simulate payment (test)" → 영수증 · Admin Paid · Webhook Logs 200 |
| K2 | 실기: #118 아이콘 | 부분 통과 · 선택된 버튼에서 아이콘 흰색 여부만 재확인 |
| K5 | 외부 신청 3건 | Kyu 나중에 |
| K6 | 11-12 실기 잔여 | Kyu 나중에(몰아서) |
| ~~K1 · K4 · K7 · K8~~ | #233 머지 · 다음 큰 것 = EAS만 · CI 비용 = 안 함 · 러너 재설치 | ✅ 종결 |

### 진행 / 대기
| 항목 | 허브 | 상태 |
|---|---|---|
| **EAS 새 앱 빌드(옛 dev client 교체) — 계획서만** | M2 | **M2-1105-BE 발부(11-13)** · 계획서 승인 뒤 코딩 라운드 분할 발부 · 서랍 범위 밖 · 프린터 이연 |
| fork #122 vitest 2 fail 수정(M2-1105-BD) | M2 → R0 | 착지(clean · CI pass) → **R0-1105-DH 리뷰** → 오케 머지 |
| **storeport #232** reservation ghost 재현 테스트 | R0 → 오케 | **R0-1105-DI 판정 리뷰 발부**(#237 BC-1 과 대조 · 폐기 / it 전환 / 실제 버그) |
| **QRIS simulate 실제 DB 통합 테스트(#236 이연)** | M0 | **M0-1105-BM 발부**(테스트만 · Kyu 06:38 "허브 놀지 않게" 품질 일) |
| **세금 이연 R0-CJ-3 마커 · R0-CJ-4 다품목 정밀도 가드** | M1 | **M1-1105-BN 발부**(보이는 금액 바뀌면 계획서만 · 멈춤) |
| **fork lint warnings 46 → 0 근처(동작 변경 없음)** | M3 | **M3-1105-BP 발부**(void-refund-nav-bc 테스트 파일 제외) |

### 이연 갱신
BLE 프린터 BT-58D(Kyu 11-13 "나중으로") · 현금 서랍(Kyu 11-13 "당분간 필요없을듯" — 범위 밖) · CI 비용 절감(Kyu "아니" — 종결).

### 07:00 갱신 (오케 작업자)
- ✅ R0-1105-DH APPROVE → **fork #122 머지 5b760c4**(M2-1105-BD · vitest void-refund-nav-bc 2 fail 테스트만 수정) → 둘 다 완료.
- ✅ R0-1105-DI 판정 A(#237 로 충분) → **storeport #232 머지 없이 닫음** → 완료.
- **M2-1105-BE 계획서 머지 fork #124 1a74335** · **Kyu 결정 3건 대기: R2 타이밍 · preview 빌드 · EAS 무료 플랜** → 결정 뒤 코딩 라운드 분할 발부.
- M3-1105-BP 착지 fork #123(head 8f08767 · lint 경고 46→44 · 미사용 변수 2건) → **R0-1105-DJ 리뷰 발부**(최신 master 반영 vitest 0 failed · 이월 44건 표 확인) → 오케 머지.

## 11-13 현재 상태 (05:40 판 · 위 06:35 절이 최신 · 출처 = handoff-20261113.md 05:40 WIB · 아래 11-11 절 이하는 이력)

모든 허브 idle → M2-1105-BD 발부(11-13). 프롬프트별 실시간 상태 = 상태판.

### Kyu 할 일 (우선순)
| # | 항목 | 막힌 것 / 다음 |
|---|---|---|
| K1 | storeport #233 머지 결정(Xendit 키 저장 화면 · R0-DE APPROVE) | Kyu "머지해" → 오케 #233 → #236 머지 |
| K2 | 실기: 결제수단 버튼 아이콘(fork #118) | 지금 가능 — `cd ~/projects/agilo-fork-test && git pull && bash scripts/dev-refresh.sh` |
| K3 | 실기: QRIS 테스트 결제 | K1 + Railway 배포 뒤 |
| K4 | 결정: 다음 큰 덩어리(오케 추천 EAS 새 빌드 + BT-58D 프린터·서랍) | Kyu 결정 |
| K5 | 외부 신청 3건(Xendit KYC · Meta WA 번호 · MTI EDC) | Kyu |
| K6 | 실기 잔여(#224 세금 · 앱 #111~#114 · Stock cleanup #82~#85 · #81 Release) | Kyu |
| K7 | CI 비용 절감 "줄여"/"아니" | Kyu 답 |
| K8 | 러너 재설치(허브 전부 idle — 지금 가능) | `cd ~/projects/curiocity-relay && git pull && bash scripts/hub-runner-install.sh` |

### 진행 / 대기
| 항목 | 허브 | 상태 |
|---|---|---|
| fork master vitest `void-refund-nav-bc` 2 fail(테스트만 수정) | M2 | **M2-1105-BD 발부(11-13)** · 원인 추정 = #120 이 #118/#119 와 겹침 |
| storeport #236 Simulate 버튼 서버(M0-BK·BL) | M0 → 오케 | R0-DG APPROVE · **K1(#233) 대기** |
| storeport #233 Xendit 키 저장 화면(M1-BL 리베이스) | M1 → Kyu | CI 초록 · R0-DE APPROVE · **K1 대기** |
| fork #118 결제수단 아이콘(M3-BN · BO) | M3 | 머지 · **실기 필요 K2** |
| **storeport #232** reservation ghost 재현 테스트(M2-1105-BB) | M2 → 오케 | **OPEN · handoff 미언급 · 판정 필요(오케)** — 머지 여부 + /refund 서버 수정(M0) 발부 결정 |

### ✅ 완료 (11-12 밤 ~ 11-13 새벽)
storeport #235(M0-BJ docs) · #237(M2-BC) · fork #117(M3-BM · 허브 직접 머지) · #119(M0-BK 앱) · #120(M2-BC) · #121(M1-BM lint) · #118(M3-BN·BO) · R0-DE/DF/DG 리뷰.

### 다음 (K4 결정 전이면 품질 일만 쌓기)
- QRIS 매입사 확인: 테스트 qr_string tag 26~51(GUID·NMID) 디코드해 Kyu 에게(오케).
- 품질 후보: #236 pos-integration 실제 DB 케이스 · R0-CJ-3/4.
- 이연: split+QRIS 환불 · /refund-retry QRIS A안 · fork lint warnings 46 · BLE 프린터 · EAS 재빌드(Share PNG).

### 마일스톤
Anchor 테스트 모드 결제 완성 → QRIS live(Xendit KYC · xenPlatform) · EDC(MTI) · 프린터·서랍(EAS) · 고객·포인트·WA 영수증(라운드 C) · 매장 투입 준비. Wing · CareAgent 미착수.

## 11-11 현재 상태 (이력 · 당시 최신)

### ✅ 완료 (머지 · 실기)
| 항목 | PR | 상태 |
|---|---|---|
| 배달·선주문 결제 완료 화면 · 상태 표시 이름 · 서버 courier 가드 | fork #79 · #83 | ✅ 머지 · 실기 통과(주문 상세 상태 이름 · 11-11) |
| P6 void/refund 서버 · 영수증 | storeport #207 · #208 · fork #77 · #80 · #84 | ✅ 머지(11-11) · 실기 B 는 아래 보류 |
| 결제 화면 3건(영수증 폭 · 머리줄 Order #N · 현금 빠른 버튼) | fork #85 | ✅ 머지 · 실기 통과(11-11) |
| 서버 CI/인프라 관련 | storeport #209 | ✅ 머지 |
| 실기 A(11-10~11) · 주문 상세 · 결제 화면 3건 | — | ✅ 통과 |
(머지 sha 는 각 PR 페이지 참조 — 이 표에는 미기재)

### 진행 중
| 항목 | 허브 | 상태 |
|---|---|---|
| **P6 실기 B**(Void·환불·매니저 PIN · 상태판 K-1111-p6-test) | Kyu | **보류 — Void 무반응 수정(fork #86) 머지 뒤 오케가 "시작" 안내** |
| fork #86 Void 무반응(원인 = Modal 위 Modal 중첩) | M3 → R0 | 착지 · **R0-1105-BH 리뷰 대기**(11-11) |
| storeport #211 Admin 상단 4자리 PIN 버튼 | M1 → R0 | 착지 · **R0-1105-BH 리뷰 대기** |
| storeport #212 나눠 결제 서버(split tender S1~S4) | M0 → R0 | 착지(M0-1105-AJ) · CI pos-integration 2회 초록 미확인 · **R0 리뷰는 BH 다음(한 번에 하나)** |
| 방법론 리포 curiocity-devai-method(private · v1.0 · 29파일) | M2 → 오케 | 생성 완료(M2-1105-AG · 4567df4) · **Kyu: Claude GitHub 연결에 리포 추가(K-1111-method-access)** · MP-006 후보 2건 Kyu 결정 대기 |

### 외부 대기
- Xendit key(QRIS · EDC 자동) · BLE 프린터 기기(도착 시 실기) · Sentry `pos-app` 프로젝트(Kyu 생성) · Apple 관련(EAS dev build · 완료분 제외).

### 다음(대기 · 발부 안 함)
- 분할 결제 영수증 renderer(M0-1105-AK) · 앱 "Pay in parts" UI(M0-1105-AL) · 추가 통합 시나리오(M0-1105-AM) — #212 머지 뒤.
- 앱 반품 품목 선택 화면 · 주문 상세 상태 이름 추가분 · Fulfill 시트(M3).
- Void 수정 머지 → P6 실기 B 시작 안내.

## 이력 — 11-09 판 (11-09 11:05 WIB · 아래는 당시 스냅샷 · 삭제하지 않음)

규칙: ⓐ 쌓인 PR 합쳐 머지 ⓑ 앱 mock = 서버 fixture ⓒ chore/docs(src 0) 오케 직접 머지 ⓓ 자동 투입 = `queue/<hub>/<ID>.md` ⓔ 허브 상시 금지(운영 SSH·railway CLI·운영 DB·키체인) ⓕ **R0·M2 = Sonnet · 허브 1회 실행 60분 상한(11-09)** ⓖ 오케 세션·허브 세션 매일 새로 · 인수인계 = handoff 파일 ⓗ **(11-09) 허브 프롬프트 = 항목마다 commit+push · 45분 시점 미완 명시 후 종료**.

| # | Kyu 의뢰 (원문 요지 · 날짜) | 우선 | 허브 | 상태 (11-09 11:05) | 이유 / 막힌 것 |
|---|---|---|---|---|---|
| **0** | **운영 장애: Admin·앱 주문 목록 500 · 영수증 화면 Server Error (11-07 22:50)** | **0** | M0 → R0 | **M0-1105-V = 25분 작업 뒤 한도로 끊김(push 0) → M0-1105-W 재발부(11-09 11:05 · 자동 투입) → R0 → 머지·배포 → Kyu 복구 curl** | #199 collection 삭제 경로 추정 · 로그 relay `logs/railway-api-…log` |
| 1 | 결제 서버 API · 자동 전환 · 세금/로고/quote | 1 | M0 | #193 #196 #197 #199 머지 · 배포 ✓ | — |
| 1d | Hand over = 예약 소진·재고 차감·전달 기록·Completed + 전달 교통정리 + 찌꺼기 예약 정리 도구 | 1 | M0/R0 | **#200 착지 · M0-W 가 같은 PR 에 커밋 → 그 뒤 R0 리뷰 → 머지** | Kyu 5차 실기(Reserved 누적) |
| 2 | 앱 P2 현금 · 주문 목록/상세 · 영수증 v2 | 1 | M3 | 머지 완료 · Kyu 실기 ✓(로고 크기는 #62/#63 뒤 재확인) | — |
| 2b | P3 선주문(보드 7·9·10) | 1 | M3 | #56 머지 · 칩·입력 ✓ · 날짜 피커·버튼 색 → #62 | → #2e |
| 2c | P4 결제 탭 Cash/Card(EDC)/QRIS + Hand over 문구 | 1 | M3/R0 | **#62 = M3-R 미완(코드 0인데 러너가 done 오표기) → M3-1105-S 재발부(자동) → R0 재리뷰** | 머지 뒤 Kyu 실기 |
| 2d | P5 교대(Open shift 강제 · Close shift · 캐셔) | 1 | M3/R0 | **#64(Z Report 가림 뿌리) → R0-1105-AG 리뷰 중** | 머지 뒤 Kyu 실기 |
| 2e | M3 화면 폴리시: 피커 · 선택 칩 연회색 · 로고 110 | 1 | M3 | **M3-1105-S 진행(#62)** · Fulfill 시트는 #200 머지 뒤 별도 | 충돌 방지 순차 |
| 2f | Fulfill 시트(Pickup/Delivery · 택배사·기사·운송장) + Delivery 칩 활성 | 1 | M3 | 대기(#200 머지 + M3-S 뒤 발부) | 서버 계약 #200 |
| 3 | 팔레트 D1 · accent 정리 | 2 | M3 | #47 #52 머지 ✓ | — |
| 5 | 프린터 BT-58D · ESC/POS(로고 비트맵·세금·캐셔) | 2 | M2 | **#63 착지 → R0-1105-AG 리뷰 중** | BLE 실기는 프린터 도착·EAS 뒤 |
| 5b | 앱 번들 안전(node: import 금지 · CI 가드 · R0 ⑦) | 2 | M2/R0 | #61 머지 · r0/README ⑦ | — |
| 6 | 앱 Sentry | 3 | Kyu | `pos-app` 프로젝트 생성 대기 | — |
| 7 | EAS dev build | 3 | M2 | Apple Pending | — |
| 7e | 자동 투입 러너(hub-runner) | 2 | M1 | **v3 가동(M1-Y 완료 10:57 · R0·M2 Sonnet · 60분 상한 · heartbeat 30분) · M1-1105-Z(수동) = 착지 검증(exit 0 ≠ 완료) + cmux 탭 표시** | 러너 수정은 수동 투입만 · 교체는 허브 전부 idle 때 |
| 8 | Admin 리브랜딩·Settings(세금·로고 URL) | 3 | M0 | 배포 ✓ · Kyu 설정 ✓ | — |
| 8e | Admin Inventory Available 열 / POS Inventory 페이지 | — | — | Kyu 취소(11-07) | 유사 화면 혼란 |
| 9 | QRIS(Xendit) · EDC 자동 | 4 | M0 | 대기 | Xendit key |
| 10 | 분할 결제 · 환불/보이드 | 4 | — | 대기 | P6 (→ 11-11 위 절로 이동) |
| 12 | 외부 신청 3건 | 1 (Kyu) | Kyu | Apple 대기 · Xendit·은행 미착수 | — |
| 13 | 운영 SSH 허브 특정 · 금지 조항 ⑱ 전파 | 2 | 오케/M1 | 전파 완료 · 허브 특정 미착수(M1-Z 범위 밖 · 후순위) | 로그 16:04Z |
| 14 | 토큰 비용 절감(11-09 결정) | 1 | 오케/M1 | **R0·M2 Sonnet · 60분 상한 적용 완료(M1-Y)** · 세션 매일 새로 · 감시 10분 · 5허브 병렬 | — |

## 우선순위 변경 이력
- 11-07 11:45: #2c 해소 · #7c 종료 · #1c Delivery 서버 신설 · #8d 신설.
- 11-07 23:25: #0 운영 장애 신설(0순위) · #1d · #2e · #7e · #13 신설 · #8e 취소.
- 11-07 야간 자율 운영: tick 3(16:46Z)에서 한도 소진으로 중단 · 허브는 #63·#64 를 끝냄 · 랩업 미작성.
- 11-09 10:20: #14 신설(1) — 토큰 결정. #2f 신설(Fulfill 시트 분리). #2e 는 #62 에 흡수. #0 은 M1-Y 뒤 M0-V 재투입으로 재개.
- **11-09 11:05: M1-Y 착지 → 진단으로 M3-R "done" 이 가짜(코드 0)였음 확인. M0-V → M0-1105-W · M3-R → M3-1105-S 로 재발부(항목별 push 규칙 ⓗ 추가). #64·#63 은 R0-1105-AG 로 먼저 리뷰(#62·#200 은 재작업 뒤). M1-1105-Z 신설(러너가 리포트 없는 exit 0 을 done 처리하지 않게).**
- **11-11: 원장 통합(11-09 판 이후 누락분 합침). P6 환불·보이드·분할 결정 파일 5개 링크. P6 실기 B 는 Void 수정(#86) 머지 뒤. 분할 결제 서버 #212 착지. 방법론 리포 생성.**
- **11-13: handoff-20261113 병합. 허브 전부 idle → M2-1105-BD(vitest 2 fail · 테스트만) 발부. #232 판정 필요(오케) 추가. K1(#233 머지해)이 #236·K3 을 막고 있음.**
- **11-13 06:40: Kyu 06:35 회신 7항 반영(decision-next-big-20261113). #233·#236 머지. 다음 큰 것 = EAS 만(서랍 제외 · 프린터 이연) → M2-1105-BE 계획서 발부. M2-BD 착지 → R0-1105-DH. Kyu 06:38 "모든 허브들이 놀고있는데, 테스트없이는 투입할 프롬프트가 없어?" → 품질 일 4건 발부: M0-1105-BM · M1-1105-BN · M3-1105-BP · R0-1105-DI.**
- **11-13 07:00: #122(5b760c4)·#124(1a74335) 머지 · #232 닫음(R0-DI 판정 A) · M3-BP #123 → R0-1105-DJ 발부 · EAS Kyu 결정 3건 대기.**
- **11-14 09:15: 창 교체 → handoff-20261114.md. storeport #247(qris-status) 머지 → Kyu QRIS 재실기 대기. fork #131(BV+BW+BX+BY) CI 초록 · R0-1105-DX 진행 → APPROVE 뒤 Kyu 아이패드 실기 → 머지. 나눠결제 QRIS R1~R3 는 QRIS 재실기 통과 뒤. M1-1105-BT(러너 v7.3) Kyu 수동 투입 대기.**
