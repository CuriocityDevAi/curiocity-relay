# CurioCity 열린 요구 원장 (오케 유지 · Kyu 원문 기준)

갱신: 2026-11-11 16:30 WIB (11-09 11:05 판 + 11-10~11 결정·착지 통합) · 규칙: 새 요구 = 여기 먼저 등재(Kyu 원문 그대로 · 오케 번역은 괄호) · 소유 허브 필수 · 착지·실기 통과 시 ✅ · 이 파일이 챗보다 우선
**발부 규약(09-16)**: 모든 프롬프트 작성 직전 이 파일을 읽고 `원장 대사:` 한 줄. 재언급 🔴. 주 1회 미발부 요구 표.
**갱신 규약(11-06)**: 결정·착지마다(최소 하루 1회) 이 파일 + `work-queue.md` 갱신. **이 파일이 기억의 정본**.
**세션 교체 규약(11-09)**: 오케 세션·클로드코드 허브 세션은 **매일 새로**. 마감 시 `ledger/handoff-<날짜>.md`(당일 스냅샷) 작성. 새 세션 첫 줄: `CurioCity 오케. relay ledger/open-requirements.md · work-queue.md · 최신 handoff 읽고 현황판부터.` **최신 handoff: 오늘(11-11) 마감 때 `ledger/handoff-20261111.md` 가 작성될 예정 — 그 파일이 생기기 전까지의 직전 판 = `ledger/handoff-20261110-evening.md`.**
**상태판**: https://claude.ai/artifact/Fpm1UFYvxX4mzCJYHtnBGE · 자동 투입: `queue/<hub>/<ID>.md` → Kyu Mac hub-runner(v6.5 가동 · v6.6 = M2-1105-AC).

## 11-11 통합 — P6·배달·결제 화면 (결정 파일 5개 · 원문은 각 파일 유지)

결정 정본(링크): [decision-p6-20261110](decision-p6-20261110.md)(환불·보이드·분할 Q1~Q5 · CARD 단말기 VOID/REFUND = PIN 없음 · 실패/CASH/QRIS = 현금 + 매니저 PIN · PIN 4자리 하루 1회 · Admin 표시) · [decision-p6-split-20261111](decision-p6-split-20261111.md)(S1~S4 "전부 권장." · 최대 2 tender · CASH 포함 시 PIN · 환불 현금부터 · 선주문과 상호 배타) · [decision-delivery-ui-20261110](decision-delivery-ui-20261110.md)(배달·선주문 결제 완료 화면 Hand over 제거 · courier 없는 fulfill 서버 거절 · 상태 표시 이름) · [decision-checkout-ui-20261111](decision-checkout-ui-20261111.md)(실기 A 원문 · 영수증 폭 🔴 2회째 · 경로 제목 · 현금 버튼 확정 규칙) · [decision-p6-test-20261111](decision-p6-test-20261111.md)(P6 실기 B 절차 · PIN 위치 변경 16:28).

### ✅ 완료 (머지 · 실기 통과)
- ✅ 배달 결제 완료 화면 Done · Orders 목록 Awaiting dispatch · 주문 상세 상태 이름 — fork **#79 #83** 머지 · 실기(주문 상세) 통과 11-11.
- ✅ P6 서버 void/refund/반품 — storeport **#207 #208** 머지 · 앱 fork **#77 #80 #84** 머지(11-11). 401/423 키 정합(#77 · remaining_attempts/locked_until) 포함.
- ✅ 결제 화면 3건(영수증 폭 · 머리줄 Order #N · 현금 빠른 버튼) — fork **#85** 머지 · 실기 통과 11-11. (영수증 폭 🔴 2회 요구 해소)
- ✅ storeport **#209** 머지.
- ✅ 실기 A(11-10~11) 통과. (머지 sha 는 각 PR 페이지 참조 — 이 원장에는 미기재)

### 🔄 진행 중
- **P6 실기 B**(Void·환불·매니저 PIN · 상태판 K-1111-p6-test · 보류) — **Void 버튼 무반응(fork #86 · M3-1105-AJ · 원인 = 열린 시트 위에 PIN 시트(RN Modal) 중첩) 머지 뒤 오케가 "시작" 안내**. → R0-1105-BH 리뷰 대기.
- **Admin PIN = 왼쪽 메뉴**(Kyu 11-11 16:28 원문 "왼쪽 메뉴 방식으로 변경." · 11-11 15:17 의 "오른쪽 위 4자리 버튼" 요구를 대체 · 하단 카드 제거 · 페이지에 오늘 PIN 크게 + 다음 변경 시각 + 매장 + 날짜 · WIB 자정 자동 갱신) — storeport #211(M1-1105-AQ · DOM 주입)은 **머지 없이 닫음** → **M1-1105-AR**(공식 Admin UI route · 사이드바) 발부. 원장 대사 = "Admin PIN 위치 = 왼쪽 메뉴 (decision-p6-test-20261111 16:28)".
- **나눠 결제**(P6 3차 · S1~S4 서버) — storeport **#212**(M0-1105-AJ) 착지 · CI pos-integration 2회 초록 미확인 → R0 리뷰는 BH 다음(한 번에 하나). 후속: 영수증 renderer(M0-AK) · 앱 Pay in parts UI(M0-AL) · 추가 통합 시나리오(M0-AM).
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
