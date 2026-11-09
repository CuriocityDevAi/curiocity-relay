# CurioCity 열린 요구 원장 (오케 유지 · Kyu 원문 기준)

갱신: 2026-11-09 10:25 WIB · 규칙: 새 요구 = 여기 먼저 등재(Kyu 원문 그대로 · 오케 번역은 괄호) · 소유 허브 필수 · 착지·실기 통과 시 ✅ · 이 파일이 챗보다 우선
**발부 규약(09-16)**: 모든 프롬프트 작성 직전 이 파일을 읽고 `원장 대사:` 한 줄. 재언급 🔴. 주 1회 미발부 요구 표.
**갱신 규약(11-06)**: 결정·착지마다(최소 하루 1회) 이 파일 + `work-queue.md` 갱신. **이 파일이 기억의 정본**.
**세션 교체 규약(11-09)**: 오케 세션·클로드코드 허브 세션은 **매일 새로**. 마감 시 `ledger/handoff-<날짜>.md`(당일 스냅샷) 작성. 새 세션 첫 줄: `CurioCity 오케. relay ledger/open-requirements.md · work-queue.md · 최신 handoff 읽고 현황판부터.` 최신: `ledger/handoff-20261109.md`.
**상태판**: https://claude.ai/artifact/Fpm1UFYvxX4mzCJYHtnBGE · 자동 투입: `queue/<hub>/<ID>.md` → Kyu Mac hub-runner v2(→ v3 M1-Y).

## 🔴 운영 장애 (11-07 22:50~ · 최우선 · 미해결)
- Admin Orders 목록 + 앱 Orders 탭 "An unknown error" · 앱 영수증 화면 "Server Error" — 서버 로그 `logs/railway-api-20261107-1550-1607.log`: `captured_amount` undefined 123회 · `fulfillment polyfill failed: FulfillmentItem.sku null` · `Order id not found` 반복. 유력 뿌리 = #199 tenders "금액 다르면 pending collection 삭제" → dangling link → 목록 직렬화 500.
- **M0-1105-V**(삭제 경로 제거 + repair 도구 + sku + order-id 조회 · 같은 PR #200) 토요일 16:25Z 시작 → **22:48Z exit 1(6h23m · 한도 소진 추정)**. → M1-Y(러너 60분 상한·Sonnet 분리) 뒤 **재투입**.
- `[railway-ssh] SSH connected` 16:04Z — Kyu 아님. 금지 조항 ⑱ 전 프롬프트 전파 완료 · 허브 특정은 러너 로그로(M1-Y 에 요청 가능).

## 🔴 Kyu 실기 피드백 (11-07 · iPad · 1~7차) — 토요일 밤 허브 반영분은 R0 리뷰 대기
- ✅ 카트 비움·Orders 표시 · 영수증 WIB·여백 · 시재 0 Open · 썸네일 · Pay 가드 · 캐셔 줄 · 세금 줄 · 로고 URL(Cloudflare R2).
- **[버그] Z Report 가 Open shift 시트에 덮임** — #60 뒤에도 동일 → **M3-Q 진짜 뿌리(invalidate 가 router.replace 보다 먼저 → Modal race) · ShiftCloseGate sticky latch · fork #64 착지** → R0 → 머지 → 실기.
- **[버그] Captured ✓ 이지만 Not fulfilled · Completed 안 됨 · Reserved 누적** → storeport #200(M0-T/U · 멱등 가드 반영) + M0-V(운영 로그) → R0 → 머지.
- **[요구] 영수증 로고 1.8배** — 화면 110(M3-R · #62) + 프린터 60→110(M2-R · **#63 착지**).
- **[요구] Pickup date/time 피커(iOS · 15분 · 빠른 칩)** — M3-R · #62 반영(리포트 미push · 로그 확인).
- **[규칙] 검정 = 화면 넘어가는 결정 버튼만(Pay · Open shift · Hand over) · 옵션 선택 = 선택 #EDEDEB+진한 테두리+굵게+체크 / 미선택 흰+옅은 테두리** — OptionChip 공용(M3-R · #62) · R0 체크 항목.
- **[문구] `Product handed over to the customer.`** — #62.
- **[취소] POS Inventory 페이지**(유사 화면 혼란). **[완료] "Indar"→"Indah"** Kyu 수정.

## Kyu 결정 정본 (11-04~09)
- 반올림: 현금 Pembulatan 없음 · % round. 승인번호 6+4. WA 공유 먼저. 분할 P6. PG Xendit. Pre-order 기본 100% · DP% Admin(`preorder_deposit_pct`).
- **세금(11-07)**: ⓐ 가산 ⓑ 매장별 PB1 ⓒ SC=Subtotal×SC% · PB1=(Subtotal+SC)×PB1% · 로고 = URL.
- **전달 교통정리(11-07)**: Takeaway = Hand over 즉시 Fulfilled+차감+Completed. Pre-order = 계약금→(잔금)→앱 Orders Fulfill 시트(Pickup 기본 / Delivery: 택배사·기사·연락처·운송장·메모) 시점 차감. Delivery = 결제 → `awaiting_dispatch` → Fulfill 시트 → 차감·Completed. Admin 수동 전달 = 보정용만. 서버 계약 `fulfill {stage:'hand_over', method, courier, driver, contact, tracking_ref, note}`(#200).
- **토큰 비용(11-09)**: 토요일 한도 소진 주원인 = 허브 세션(전부 Opus · 상한 없음 · M0-V 6h23m) + 오케 거대 컨텍스트 × 10분 tick + GitHub MCP 이중 반환. 결정: **R0·M2 = Sonnet · 허브 1회 실행 60분 상한 · heartbeat 30분 · 5허브 병렬 유지(상한 없음) · 감시 10분 유지(Kyu 작업 중만) · 오케·허브 세션 매일 새로 · 밤샘 자율 운영 당분간 없음**.
- **MEROS 앱 UI 전부 영어 · 팔레트 D1 · P5 교대 ①~⑤**. 외부 신청: Apple Pending · Xendit·은행 미착수. Admin 비번 유지.

## 방법론 (요지 · ⑯~⑱ 11-07 · ⑲⑳ 11-09)
①~⑮ 유지(R0 리뷰 · 파일 주인 · 계획 게이트 · 감시 10분/30분 · 목적 2~3줄+작업 큐 · chore 직접 머지 · 진단은 타 허브 · 상시 [REPORT] · 쌓인 PR 합쳐 · mock=fixture · Node 22).
⑯ 프롬프트 상태판 + claims 신호 · 러너 자동 투입 · 오케 tick 이 상태판 반영 · 머지 뒤 실기 필요→완료 · 러너 수정 = 수동 투입 + 새 파일 검증 후 교체(W 사고).
⑰ R0 체크 ⑦ RN 번들 안전(`node:` import 0 · 번들 가드 #61).
⑱ 허브 상시 금지: 운영 SSH · railway CLI · 운영 DB · 키체인/`security` · 허브 폴더 밖.
⑲ **세션 교체·인수인계**: 마감 = handoff 파일 + 두 원장 갱신 + 상태판 정합. 새 세션은 원장 3개로 시작 · 챗 기억에 의존 금지.
⑳ **비용 가드**: 모델 분리(R0·M2 Sonnet) · 60분 상한(초과 = blocked "timeout 60m") · heartbeat 30분 · 오케는 리포트 전문 대신 claim+요약 우선 읽기.

## StorePort / Meros

### 착지 ✅
- storeport main **4f3cd43**(#196 #197 #199). 열린 PR **#200**(M0-T/U · R0-AE 경미 반영 · M0-V 재투입 뒤 같은 PR).
- fork master **a0bfcd6**(#48~#61). 열린 PR **#62**(P4 탭 + M3-R 칩·피커·로고) · **#63**(M2-R 프린터 로고 · receipt-layout 공용) · **#64**(M3-Q Z Report 뿌리).
- relay: hub-runner v2 가동 · claim.mjs · r0/README ⑦ · handoff-20261109.

### 진행 중 (11-09 10:25)
- M1-1105-Y(수동 · 러너 v3) 투입 대기 → 그 뒤 M0-V 재투입 · R0-AF(#200 #64 #63 #62).

### 다음 (우선순위)
- [ ] M1-Y → M0-V 재투입 → R0-AF → #200 머지·배포 → Kyu 재실기(Orders 목록 · Captured/Completed/Fulfilled · In stock −qty · Reserved 0 · 찌꺼기 예약 curl)
- [ ] R0-AF #64 #63 #62 → 머지 → Kyu 실기(Z Report · 결제 탭 · 칩 색 · 피커 · 로고 크기)
- [ ] M3: Fulfill 시트(Pickup/Delivery · fixture) · Delivery 칩 활성(#200 뒤)
- [ ] M2: Reprint · BLE 실기(프린터 도착 시) · Xendit(key) · EAS(Apple) · Sentry pos-app(Kyu)

### 로드맵 (10-12 · 유지) · 전 제품 공통 · 머지 규칙(R0 APPROVE → squash · chore 직접) · K0/T0/N0 변동 없음.
