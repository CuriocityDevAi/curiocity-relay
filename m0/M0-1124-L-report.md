AUDIT M0-1124-L — 손님 화면(customer-display) + POS↔CD 연동 Kyu 요구 반영 감사 (2026-11-24)
작성: M0 · storeport main + agilo-medusa-pos-fork master 기준 읽기전용 · 초안 (25분 중간 저장)

---

## 판정 표 (미착수/부분 먼저)

| # | Kyu 원문 요지 | 출처(파일§·날짜) | 문서화 | 구현(파일:줄 또는 PR) | 실기 | 판정 |
|---|---|---|---|---|---|---|
| §8-③ | "번호 없음" 칩 상태 신설 · 2분 뒤 Orders로 이동 | decision-cd-parallel-20261123 §8 | ✓ 설계서 | ✗ 미구현 (CD 앱 어디에도 "no-phone chip + 2분 타이머" 없음) | 기록 없음 | **미착수** |
| SSE | SSE 실시간 연결 (스냅샷 push) | decision-pos-phone-status-20261124 §원문 | ✓ 언급 | ✗ 미구현 (CD polling 전용 · `text/event-stream` / `EventSource` 코드 0건) | 기록 없음 | **미착수** |
| CD1 | 적립 Rp150인데 잔액 Rp0 (DoneScreen 현재잔액 버그) | decision-cd-defer-20261124 CD1 | ✓ 버그 기록 | 조사 중 — `DoneScreen.tsx:95` `receipt?.new_balance ?? loyalty?.balance` 경로는 있으나 서버가 `receipt.new_balance=0` 반환 | 11-24 Kyu 스샷 Order #185 실패 | **미착수(서버버그)** |
| CD-3 | 대기화면 왼쪽 매장 이미지/로고 Admin 업로드 반영 | decision-customer-display-20261115 CD-3 | ✓ | 레이아웃(VariantB) 분기만 존재 · `MainScreen.tsx:299` `<Text>Store image / logo</Text>` 플레이스홀더 — 실제 `<Image uri=…>` 없음 | 기록 없음 | **부분** |
| 원문7 | 손님 화면 구석 칩 #N (pos_order_num 표시) | decision-pos-phone-status-20261124 원문7 | ✓ | `PosChipBadge.tsx` · Cart/Keypad/QRIS/Receipt ✓ · **DoneScreen(5번) · ConsentScreen(4번) 미삽입** | 기록 없음 | **부분** |
| 원문9-영수증 | 손님 화면 영수증 = POS 영수증 동일 | decision-pos-phone-status-20261124 원문9 | ✓ 승인 | `ReceiptScreen.tsx` items/금액 일치 · 그러나 POS 영수증의 approval_code·qris_receipt_id·Ref 항목은 현재 CD `receipt` 필드에 없음(OrderSnapshot.receipt에 미포함) | 11-24 Kyu "완전히 다른 영수증" 실패 | **부분** |
| §8-① | QRIS = CD 막혀도 POS QR로 결제 (CD 우회) | decision-cd-parallel-20261123 §8 | ✓ | `QrisScreen.tsx` 렌더 있음 · 그러나 "CD 완전 오프라인 시 POS 결제 화면 QR fallback" 동작 명시적 처리 미확인 | 기록 없음 | **부분** |
| §8-② | 1번 종료 시 2번 결제 중이면 결제화면(금액·QR) CD 자동 복귀 | decision-cd-parallel-20261123 §8 | ✓ | terminal-flow 해제 후 pos_screen 추종으로 자동 라우팅 가능 · 단 "번호 입력 수동만" 규칙과 혼재 — 경계 로직 미검증 | 기록 없음 | **부분** |
| §8-④ | 종이 영수증 포인트 미표시 유지 | decision-cd-parallel-20261123 §8 | ✓ ("유지") | POS fork 영수증 출력코드에서 loyalty 포인트 출력 미구현 = 현재 그대로 유지 | 기록 없음 | **문서만(현상유지)** |
| CD-1 | 화면 구성 5개 (대기·결제중·번호입력·첫방문동의·적립완료) | decision-customer-display-20261115 CD-1 | ✓ | main/cart/keypad/consent/done + qris/receipt/keypad-after(추가) `app/*.tsx` 각 화면 존재 | 11-19 Kyu 실기 대부분 정상 | **구현** |
| CD-2 | 컬러 테마 20종 Admin 선택 | decision-customer-display-20261115 CD-2 | ✓ | `admin/components/customer-display/ThemeGrid.tsx` · `admin/routes/pos-settings/customer-display/page.tsx` | 기록 없음 | **구현** |
| CD-4 | 언어 5개 EN/ID/KO/JA/ZH 손님 선택 (지구본) | decision-customer-display-20261115 CD-4 | ✓ | `src/components/GlobeMenu.tsx` · `src/i18n/strings.ts` | 기록 없음 | **구현** |
| CD-5 | 매장별 설정(매장명·세금·적립률) 라이브 로드 | decision-customer-display-20261115 CD-5 | ✓ | `app/index.tsx:206` liveConfig → storeConfig 변환 | 기록 없음 | **구현** |
| CD-6 | 이벤트 테마 7종 (Christmas·Imlek·Valentine·Ramadan·Lebaran·Maulid·17Agustus) | decision-customer-display-20261115 CD-6 | ✓ | `src/decor/events.ts` · `src/decor/EventDecor.tsx` 7종 구현 | 기록 없음 | **구현** |
| CD-7 | Admin 이벤트 From~To 달력 선택 | decision-customer-display-20261115 CD-7 | ✓ | `admin/components/customer-display/EventCalendar.tsx` · `EventForm.tsx` | 기록 없음 | **구현** |
| CD-8 | Admin Simulate 팝업 | decision-customer-display-20261115 CD-8 | ✓ | `admin/components/customer-display/PreviewPanel.tsx` | 기록 없음 | **구현** |
| CD-9 | 손님 iPad에는 테마/이벤트 버튼 없음 | decision-customer-display-20261115 CD-9 | ✓ | customer-display 화면에 테마/이벤트 버튼 0건 | 기록 없음 | **구현** |
| CD-10 | 이슬람력 이벤트 예상날짜 자동 채움 | decision-customer-display-20261115 CD-10 | ✓ | `admin/components/customer-display/EventForm.tsx` (이슬람력 auto-fill 로직 포함) | 기록 없음 | **구현** |
| CD-11 | "Enter phone number" 버튼 가운데 정렬 | decision-customer-display-flow-20261115 CD-11 | ✓ | `KeypadScreen.tsx` 버튼 중앙 정렬 | 기록 없음 | **구현** |
| CD-12 | POS 결제 완료 → 영수증 애니메이션(6번) | decision-customer-display-flow-20261115 CD-12 | ✓ | `ReceiptScreen.tsx:76` slide/pop/fade 애니메이션 · 3초 후 onDone | 기록 없음 | **구현** |
| CD-13 | 번호 미리 입력→6→5 / 미입력→6→3' | decision-customer-display-flow-20261115 CD-13 | ✓ | `lib/display-machine.ts:201` RECEIPT_DONE → pre_entry A규칙 / keypad-after B규칙 | 기록 없음 | **구현** |
| CD-14 | 번호 입력 중 결제 → 흐름 끊지 않음 · 10초 넘으면 6생략 | decision-customer-display-flow-20261115 CD-14 | ✓ | `lib/display-machine.ts:231` C규칙 payAfterKeypadMaxMs=10000ms | 기록 없음 | **구현** |
| CD-15 | 카트 담는 대로 손님화면 상품목록 실시간 표시 | decision-customer-display-flow-20261115 CD-15 | ✓ | `lib/display-machine.ts:375` CD-15 cart stage → cart 화면 · `screens/CartScreen.tsx` | 기록 없음 | **구현** |
| P-1 | 건너뛰기 + 30초 무입력 idle | decision-customer-display-flow-20261115 P-1 | ✓ | `screens/KeypadAfterScreen.tsx:17` timeoutSec · `app/index.tsx:219` keypadTimeoutSec=30 | 기록 없음 | **구현** |
| P-2 | 점원이 다음 주문 시작해도 손님흐름 완료까지 대기 | decision-customer-display-flow-20261115 P-2 | ✓ | `lib/display-machine.ts:271` isTerminalFlow → 새 checkout 차단 | 기록 없음 | **구현** |
| P-3 | 결제 후 번호 → 직전 주문 적립 | decision-customer-display-flow-20261115 P-3 | ✓ | `app/index.tsx:238` handleKeypadOk → link-phone on snapshot.id | 기록 없음 | **구현** |
| P-4 | 적립완료(5번) → 3~5초 → 대기화면 | decision-customer-display-flow-20261115 P-4 | ✓ | `screens/DoneScreen.tsx` doneAutoReturnMs=4000ms | 기록 없음 | **구현** |
| 11-18 자동재연결 | 어느 앱 재시작해도 자동 재연결 | handoff-20261118 · R2/R3 싱크 | ✓ | `lib/pairing.ts:153` bootCheck + polling loop 재기동 | 11-19 자동 재연결 정상 | **구현** |
| 11-18 POS상태추종 | 빈카트→idle · 체크아웃→cart 반영 | handoff-20261118 · M0-1118-K | ✓ | `lib/display-machine.ts:29` posScreenToDisplay | 11-19 POS 실기 정상 | **구현** |
| 11-19 M 아이콘 75% | 손님 화면 iOS M 아이콘 75% 축소 | handoff-20261119 | ✓ | storeport PR #399 머지(e0630517 빌드) | 기록 없음 | **구현** |
| 11-23 C안 | 번호 입력 중 POS 카트 잠금 없음 (C안) | decision-cd-parallel-20261123 §5 | ✓ | `lib/display-machine.ts:302` M2-1124-B keypad lock — POS 카트 사용은 POS 측 잠금 없음 | 기록 없음 | **구현** |
| 11-23 §7충돌B | 번호입력 중 손님 화면 점유 · 2번 영수증 표시 안 함 | decision-cd-parallel-20261123 §7 | ✓ | `lib/display-machine.ts:270` isTerminalFlow → new checkout/receipt 차단 | 기록 없음 | **구현** |
| 11-23 §7수동 | 1번 종료 후 2번 번호 입력은 캐셔 수동 버튼만 | decision-cd-parallel-20261123 §7 | ✓ | fork 'Ask phone on display' 버튼 (#236/#247) | 기록 없음 | **구현** |
| 11-23 소급=EOB | 소급 적립 창 = 영업 마감 | decision-cd-parallel-20261123 §1 | ✓ | `src/api/customer-display/…` M0-1123-B EOB link_open_until 로직 storeport | 기록 없음 | **구현** |
| 원문3 | Checkout 우상단 번호 실시간 중계(입력중 ... · Done초록) | decision-pos-phone-status-20261124 원문3 | ✓ | fork #247 M1-1124-B POS 손님번호 상태 6상태 컴포넌트 · M2-1124-B phone_partial sendPhonePartial 150ms debounce `app/index.tsx:277` | 기록 없음 | **구현** |
| 원문8 | POS Pay 눌러도 번호 입력 화면 사라지지 않음 | decision-pos-phone-status-20261124 원문8 · decision-pos-ui-approval-20261124 | ✓ 승인 | `lib/display-machine.ts:324` M2-1124-B keypad lock — snap.id 같으면 POS hint 무시 | 기록 없음 | **구현** |
| 원문9-ASK | Ask phone on display 오류 제거 · 새 우상단 패널로 대체 | decision-pos-phone-status-20261124 원문9 · decision-pos-ui-approval-20261124 | ✓ 승인 | fork #247 merged (6상태 패널) · 영수증 하단 Ask phone 버튼 삭제 decision-pos-ui-approval 승인 — POS 측 버튼 삭제 코드 미확인(#252 리뷰 중) | 기록 없음 | **진행 중(fork #252)** |
| fork#252 | 성공화면 주문번호 (custom_display_id) | M3-1124-L/N | ✓ | fork master `a72d2e0` M3-1124-L + `db3da9a` M3-1124-N 머지 · PR #252 리뷰 중(이미 master에 커밋 포함) | 기록 없음 | **진행 중(fork #252)** |
| fork#253 | draft 생성 시 매장 stamp (stock_location_id) | M3-1124-M | ✓ | fork PR #253 closed(merged) · `598d55a` master 반영 | 기록 없음 | **구현** |

---

## 미반영 묶음 제안

### Round A — 버그 수정 (고우선, 각 30~45분)

**A1: CD1 잔액 Rp0 버그** (~30분)
- 원인 조사: 서버 `mint-receipt` 핸들러가 `receipt.new_balance` 를 0 으로 반환하는 경로 확인
- 건드릴 파일: `apps/commerce-core/src/lib/loyalty/earn.ts` · `recover.ts` · `snapshot-earn.ts`
- 겹치는 파일: `apps/commerce-core/src/api/customer-display/snapshots/active/route.ts` (earn attach)

**A2: 손님 화면 구석 #N 칩 누락 화면** (~30분)
- DoneScreen(5번) + ConsentScreen(4번) 에 `<PosChipBadge orderNum={snapshot?.pos_order_num} />` 삽입
- 건드릴 파일: `apps/customer-display/src/screens/DoneScreen.tsx` · `ConsentScreen.tsx`
- 겹치는 파일: `src/components/PosChipBadge.tsx` (공용, 변경 없음)

---

### Round B — 영수증 동일화 (~45분)

**B1: CD 영수증 ↔ POS 영수증 동일화**
- `OrderSnapshot.receipt` 에 `approval_code` · `qris_receipt_id` · `reference_no` 필드 추가
- `ReceiptScreen.tsx` 에 Ref/approval 항목 렌더 추가
- 건드릴 파일:
  - `apps/customer-display/src/types/order-snapshot.ts` (receipt 타입 확장)
  - `apps/customer-display/src/screens/ReceiptScreen.tsx`
  - `apps/commerce-core/src/modules/register_session/service.ts` (snapshotToDTO receipt 필드 추가)
- 겹치는 파일: `src/api/customer-display/snapshots/active/route.ts` (공통 DTO 경로)

---

### Round C — 미착수 항목 (~45분)

**C1: "번호 없음" 칩 2분 타이머 → Orders 이동**
- 발동 조건: snapshot이 paid 상태이고 phone_entry_state=skipped/null 이면서 pos_order_num 있는 주문이 2분 경과
- 건드릴 파일: (POS fork 측) 칩 컴포넌트 → 타이머 2분 후 Orders 탭 이동
  - `agilo-medusa-pos-fork/src/…/OrderChips.tsx` 혹은 칩 렌더 컴포넌트
  - `apps/commerce-core/src/api/customer-display/snapshots/[id]/route.ts` (phone_no_entry 상태 추가 가능성)

**C2: SSE 실시간 연결**
- 현재 polling(1초 간격) → SSE push로 교체 시 지연 개선
- 건드릴 파일:
  - `apps/commerce-core/src/api/customer-display/snapshots/active/route.ts` (GET → SSE endpoint 신설)
  - `apps/customer-display/src/mocks/snapshot-source.ts` (LiveSnapshotSource → EventSource)
  - `apps/customer-display/src/hooks/useDisplayMachine.ts`
- 겹치는 파일: `src/lib/api-base.ts` · `src/types/customer-display.ts`
- 주의: Medusa v2 HTTP 계층에서 SSE 지원 여부 확인 필요 (MedusaRequest/Response streaming 가능성)

---

### 겹치는 파일 요약

| 파일 | Round |
|---|---|
| `apps/commerce-core/src/lib/loyalty/earn.ts` | A1 |
| `apps/commerce-core/src/lib/loyalty/snapshot-earn.ts` | A1 |
| `apps/commerce-core/src/api/customer-display/snapshots/active/route.ts` | A1, B1 |
| `apps/customer-display/src/types/order-snapshot.ts` | B1, C2 |
| `apps/customer-display/src/screens/ReceiptScreen.tsx` | B1 |
| `apps/commerce-core/src/modules/register_session/service.ts` | B1 |
| `apps/customer-display/src/hooks/useDisplayMachine.ts` | C2 |

Round B1(영수증) 과 Round A1(잔액) 은 `active/route.ts` 를 공유 — **같은 세션**에서 처리 권장.
Round B1 과 C2(SSE) 는 `order-snapshot.ts` 공유 — 순서대로 B1 → C2 처리 권장.

---

## 메모

- fork #252(성공화면 주문번호): master 에 `a72d2e0`(M3-1124-L) · `db3da9a`(M3-1124-N) 이미 포함 · PR #252는 리뷰용 오픈 상태
- fork #253(draft 매장 stamp): `598d55a` master 반영 · PR #253 closed(merged)
- 11-23 §8 ④ "종이 영수증 포인트 미표시 유지" = Kyu 현상유지 결정 → 구현 불필요
- MainScreen.tsx VariantB 이미지 플레이스홀더: `liveConfig.store_image_url` 이 있어도 실제 `<Image>` 렌더 없음 — Round D(다음 라운드) 후보
