# 작업 큐 (Kyu 의뢰 → 허브 할당 · 우선순위 · 상태 · 이유)

갱신 2026-11-11 18:20 WIB · 당일 스냅샷 = `ledger/handoff-20261111.md`(오늘 마감 때 작성 예정) · 직전 = `ledger/handoff-20261110-evening.md` · 규칙(Kyu 11-05): 오케는 매 응답 현황판 아래에 이 표를 붙이고(바뀐 줄 굵게), 우선순위 변경 시 "↑/↓ 이유". 정본 = 이 파일 · **오케가 갱신** · 최소 하루 1회. 프롬프트별 실시간 상태 = 상태판 https://claude.ai/artifact/Fpm1UFYvxX4mzCJYHtnBGE

결정 정본 파일(원문 보존 · 유지): [decision-delivery-ui-20261110](decision-delivery-ui-20261110.md) · [decision-p6-20261110](decision-p6-20261110.md) · [decision-p6-split-20261111](decision-p6-split-20261111.md) · [decision-checkout-ui-20261111](decision-checkout-ui-20261111.md) · [decision-p6-test-20261111](decision-p6-test-20261111.md) · 장치 사건 [device-incidents](device-incidents.md) · 지표 [metrics](metrics.md)

## 11-11 현재 상태 (이 절이 최신 · 아래 11-09 표는 이력)

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
