# CurioCity 열린 요구 원장 (오케 유지 · Kyu 원문 기준)

갱신: 2026-11-07 23:20 WIB · 규칙: 새 요구 = 여기 먼저 등재(Kyu 원문 그대로 · 오케 번역은 괄호) · 소유 허브 필수 · 착지·실기 통과 시 ✅ · 이 파일이 챗보다 우선
**발부 규약(09-16)**: 모든 프롬프트 작성 직전 이 파일을 읽고 `원장 대사:` 한 줄. 재언급 🔴. 주 1회 미발부 요구 표.
**갱신 규약(11-06)**: 결정·착지마다(최소 하루 1회) 이 파일 + `work-queue.md` 갱신. **이 파일이 기억의 정본**.
**상태판**: https://claude.ai/artifact/Fpm1UFYvxX4mzCJYHtnBGE (프롬프트별 상태 · 실기 필요 카드) · 자동 투입: `queue/<hub>/<ID>.md` → Kyu Mac hub-runner v2.

## 🔴 운영 장애 (11-07 22:50~ · 최우선)
- Admin Orders 목록 + 앱 Orders 탭 "An unknown error" · 앱 영수증 화면 "Server Error" — 서버 로그 `logs/railway-api-20261107-1550-1607.log`: `Cannot read properties of undefined (reading 'captured_amount')` 123회(15:50Z~) · `fulfillment polyfill failed: FulfillmentItem.sku is required, 'null' found` · `Order id not found: order_01M6V…` 반복. 유력 뿌리 = #199 tenders "금액 다르면 pending collection 삭제" 경로(PB1 10% 켠 뒤 처음 탐) → 주문이 삭제된 collection 을 가리킴 → 목록 직렬화 500. → **M0-1105-U(진행) → M0-1105-V(긴급 · 삭제 금지 + 끊긴 주문 복구 + sku null + order-id 조회)**.
- 로그에 `[railway-ssh] SSH connected` 16:04Z — Kyu 아님 → 어느 허브가 운영 SSH 한 것. **상시 금지 조항 추가(⑱)** · 아침에 로그로 허브 특정.

## 🔴 Kyu 실기 피드백 누적 (11-07 · iPad · 1~7차)
- ✅ 카트 비움·Orders 표시(#196·#52) · 영수증 WIB·번호/날짜·여백(#52) · 시재 0 Open(#48) · 썸네일(#57) · Pay 연타 가드(#57·#58) · 캐셔 줄(#55 · 이름 비면 이메일 앞 — Admin Users 에서 First name 입력하면 이름) · Checkout 세금 줄·영수증 PB1 줄(#58) · 로고 URL(#197 · Cloudflare R2 Public URL 로 표시 확인).
- **[버그] Close shift → Z Report 가 Open shift 시트에 덮임** — #60(M1-U) 머지 뒤에도 **동일**(6차) → M3-1105-Q(iOS 시뮬레이터 재현 · M1 파일 이번 한정).
- **[버그] Payment Captured ✓ 이지만 Not fulfilled · Completed 안 됨 · 재고 In stock 불변 + Reserved 누적(Whole 8 · Tea 4)** — Hand over 가 예약만 남김 → #200(M0-T) + 멱등 가드(M0-U) + 운영 로그 반영(M0-V).
- **[요구] 영수증 로고 1.8배(위아래)** — 화면(M3 다음) + 프린터(M2-1105-R).
- **[요구] Pickup date/time 은 키보드 입력 말고 달력/피커** — 키보드가 입력칸을 가림 · M3 다음(iOS 피커 · 빠른 칩 Today 17:00/Tomorrow 10:00).
- **[규칙] 검정 버튼 = 다른 화면으로 넘어가는 결정 버튼만(Pay · Open shift · Hand over)**. 옵션 선택(Takeaway/Pre-order/Delivery · Cash/Card/QRIS 탭)은 **선택됨 = 연회색(#EDEDEB)+진한 테두리+굵은 글씨+체크 · 미선택 = 흰 배경+옅은 테두리** — M3 다음 · R0 체크 항목.
- **[문구] Hand over 토스트 → `Product handed over to the customer.`** — #62(M3-P) 포함.
- **[취소] POS Inventory 페이지** — Kyu "유사 화면 추가는 헛갈림 · 하지 말자". Available 은 기존 Inventory 상세로.
- **[설정] 영수증 주소 "Indar"→"Indah" 오타** — Kyu 가 Admin 에서 수정 완료.

## Kyu 결정 정본 (11-04~07)
- 반올림: 현금 Pembulatan 없음 · % round. 승인번호 6+4. WA 공유 먼저. 분할 P6. PG Xendit. Pre-order 기본 100% · DP% Admin(`preorder_deposit_pct` · #199).
- **세금(11-07)**: ⓐ 가산 ⓑ 매장별 PB1(조리시설 10% · 없으면 0%) ⓒ SC=Subtotal×SC% · PB1=(Subtotal+SC)×PB1% · Admin POS Settings 매장별 · 로고 = URL.
- **전달(Fulfillment) 교통정리(11-07 21:50·21:54)**: Takeaway = **Hand over 즉시 Fulfilled + 재고 차감 + Completed**. Pre-order = 계약금 → (잔금) → **앱 Orders 에서 Fulfill 시트**(Pickup 기본 / Delivery: 택배사·기사·연락처·운송장·메모) 시점에 차감. Delivery = 결제(전액/계약금) → `awaiting_dispatch` 로 Orders 에 남김 → Fulfill 시트(배송 정보) → 그때 차감·Completed. Admin 수동 전달 = 강제 보정용만. 서버 계약 `fulfill {stage:'hand_over', method, courier, driver, contact, tracking_ref, note}`(#200).
- **MEROS 앱 UI 전부 영어**. **팔레트 D1**(적용 #47 · accent 정리 #52). **P5 교대** ①~⑤(①②④ #48 #53 · ③ #46 · ⑤ #55).
- 외부 신청: Apple Pending · Xendit·은행 미착수. Admin 비번 유지.

## 방법론 (요지 · ⑯~⑱ 신설 11-07)
①~⑮ 유지(R0 리뷰 · 파일 주인 · 계획 게이트 · 감시 10분/30분 · 목적 2~3줄+작업 큐 · chore 직접 머지 · 진단은 타 허브 · 상시 [REPORT] · 쌓인 PR 합쳐 · mock=fixture · Node 22).
⑯ **프롬프트 상태판 + claims 신호**: 모든 프롬프트는 상태판 DB(issued) + `queue/<hub>/<ID>.md` 커밋 → 러너 자동 투입 → claims started/done/blocked → 오케 tick(10분)이 상태판 반영(페이지 자체 fetch 는 브라우저 정책으로 불가). 머지 뒤 **실기 필요 → 완료**(Kyu 실기 후). 러너 수정 라운드는 **수동 투입 + 새 파일(v2)로 검증 후 교체**(W 가 깨진 코드 커밋해 러너 전멸 · X 로 복구).
⑰ **R0 체크 ⑦ RN 번들 안전**: app PR 은 `node:`/fs/path/zlib import 0 + Metro 해석 1회(#59 node:zlib 크래시 재발 방지 · CI 번들 가드 #61).
⑱ **허브 상시 금지**: 운영 서버 SSH · railway CLI · 운영 DB 직접 접근 · macOS 키체인/`security` · 허브 폴더 밖 접근. 토큰 필요하면 blocked_by kyu.

## StorePort / Meros

### 착지 ✅ (11-07 · 오늘 머지)
- storeport main **4f3cd43**: #196 자동 전환 · **#197 매장별 SC/PB1+로고 URL+quote** · **#199(#198 승계) collection 재사용·hand_over completed·polyfill·M3-M 계약**. 열린 PR **#200**(M0-T 예약 소진·전달·maintenance·fulfill method · R0-AE CHANGES 경미 → M0-U 반영 중).
- fork master **a0bfcd6**: #48 #50 #51 #52 #53 #54 · **#55 캐셔 · #56 P3 선주문 · #57 썸네일+가드 · #58 영수증 v2 앱 · #59 프린터 로고(→#61 핫픽스) · #60 Z Report 게이트(실기 실패) · #61 node:zlib 제거+번들 가드**. 열린 PR **#62 P4 Cash/Card(EDC)/QRIS + 토스트**(R0-AD).
- relay: hub-runner v2(M1-S/T/X) · claim.mjs issued/blocked · r0/README ⑦.

### 진행 중 (11-07 23:20 · 러너 자동)
- M0-1105-U(#200 멱등 가드 + 500 진단) → M0-V 예정 · M2-1105-R(프린터 로고 비율) · M3-1105-Q(Z Report 실기기) · R0-1105-AD(#62) · 야간 자율 운영 16:12Z~20:15Z.

### 다음 (우선순위)
- [ ] 운영 복구 머지·배포 → Kyu 재실기(Orders 목록 · 새 주문 Captured/Completed/Fulfilled · In stock −qty · Reserved 0 · 찌꺼기 예약 정리 curl)
- [ ] #62 머지 → M3 화면 라운드: 날짜·시간 피커 · 선택 버튼 색 규칙 · 로고 높이 110 · Fulfill 시트(Pickup/Delivery · fixture) · Delivery 칩 활성(서버 awaiting_dispatch 뒤)
- [ ] M2: 프린터 로고 비율 · Reprint · BLE 실기(프린터 도착 시)
- [ ] 아침 실기 순서: ① Orders 목록 복구 ② 새 주문 상태 3종+재고 ③ Z Report 가림 ④ 선주문 날짜 피커 ⑤ 결제 탭 Cash/Card ⑥ 로고 크기
- [ ] J-c Xendit(key) · EAS/프린터(Apple) · Sentry pos-app(Kyu) · 다중 매장 RBAC(요구 시)

### 로드맵 (10-12 · 유지) · 전 제품 공통(Sentry 확장 · 이름 원칙) · 머지 규칙(R0 APPROVE → squash · chore 직접 · ⑬ ⑭) · K0/T0/N0 변동 없음.
