AUDIT — 손님 화면(MEROS Customer) + POS↔손님 화면 연동 요구 감사 (M2-1125-B · 2026-11-25)

원장 대사: decision-cd-defer-20261124 (Kyu 11-24 18:29 "이미 말한 요구 전부 반영 후 테스트")

## 판정 기준
- **구현**: 코드에서 직접 확인
- **부분**: 서버/Admin 측 구현, 앱(CD) 미완 — 또는 구현됐으나 Kyu 스펙과 미세 불일치
- **미착수**: 결정됐으나 코드 없음
- **진행 중(M3-1125-B)**: 해당 PR/세션이 현재 진행 중
- **문서만**: Kyu 원문 기준 정책 결정만, 구현 대상 아님 (또는 시안 반영만)
- 실기: 원장·handoff 기록 기준. 기록 없으면 "기록 없음"

---

## 감사 결과 — 미착수·부분·진행 중 먼저

| # | Kyu 원문 요지 | 출처 | 문서화 | 구현(파일:줄/PR) | 실기 | 판정 |
|---|---|---|---|---|---|---|
| 1 | 결제 후 "+Points earned Rp 150" 인데 "Current balance Rp 0" (적립 타이밍 버그) | decision-cd-defer-20261124 §CD1 | ○ | ✗ 미착수 | Kyu 11-24 18:24 스샷 Order #185 | **미착수** |
| 2 | QRIS: CD 화면이 막혀도 POS 화면의 QR 로 결제 가능하게 (§8-①) | decision-cd-parallel-20261123 §8 | ○ | ✗ — POS(fork) 쪽 fallback 로직 없음 | — | **미착수** |
| 3 | 매니저 PIN 사용 기록 → Admin "Manager PIN" 화면 날짜별·기능·주문번호 조회 | decision-cd-ask-phone-20261118 | ○ (M2-1118-N 발부) | ✗ Admin 화면 없음 | — | **미착수** |
| 4 | CD 앱 아이콘 M = POS M 의 **75%** (iOS) | handoff-20261119 Kyu 18:15 | ○ (M3-1119-N) | 부분 — `assets/brand/icon-hp.svg` 주석에 "POS M × **65%**"; Kyu 선택 75% 미반영 | 11-19 iOS 아이콘 크기 미반영 | **부분** |
| 5 | 대기 화면 왼쪽 매장 이미지/로고 Admin 업로드 → CD 앱에 렌더링 (CD-3) | decision-customer-display-20261115 CD-3 | ○ | 부분 — Admin API(store_image_url) · LiveDisplayConfigSource(storeConfig.hasStoreImage) 구현, 그러나 `src/screens/MainScreen.tsx:302-313` VariantB 에 `<Image>` 없이 placeholder 텍스트만 | — | **부분** |
| 6 | 이슬람력 Ramadan·Lebaran·Maulid 이벤트 **자동 날짜 채움** (CD-10) | decision-customer-display-20261115 CD-10 | ○ | 부분 — `IslamicDateTable` 인터페이스·`resolveActiveEvent` 로직 구현; 그러나 `useActiveEvent.ts:7` TODO(A2) "populate islamicDates from server calendar API" 미완 — 모든 화면에서 `islamicDates: {}` (빈 테이블) 전달, Islamic 이벤트 자동 발동 불가 | — | **부분** |
| 7 | 손님 화면 영수증 = POS 영수증 (같은 내용 · tender 세부 포함) | decision-pos-phone-status-20261124 §9 · decision-customer-display-flow-20261115 CD-12 | ○ | 부분 — `src/screens/ReceiptScreen.tsx`에 items/subtotal/tax/total·payment_method 표시; 그러나 `src/types/order-snapshot.ts:53-59` snapshot.receipt 에 tender 세부(금액별 분할 내역)/store header/WA 번호 없음 → 나눠 결제 시 POS 슬립과 CD 영수증 내용 불일치 | Kyu 11-24 "완전히 다른 영수증" | **부분** |
| 8 | POS 우상단 손님 번호 상태 칸 6상태 (① Ask phone · ② Waiting · ③ 입력 중 블루+점 · ④ Done 초록+Re-enter · ⑤ Skipped+Ask again · ⑥ 잠금 노랑) | decision-pos-phone-status-20261124 §3 · decision-pos-ui-approval-20261124 | ○ (서버: phone_entry_state/phone_partial `Migration20261124000001.ts`) | 진행 중(M3-1125-B) — 서버 `phone_entry_state` 열 · `phone_partial` 열 구현됨; POS UI 6상태 칸 미구현 | — | **진행 중(M3-1125-B)** |
| 9 | POS 결제 완료 영수증 아래 "Ask phone on display" 버튼 **삭제** | decision-pos-ui-approval-20261124 | ○ | 진행 중(M3-1125-B) | — | **진행 중(M3-1125-B)** |
| 10 | POS 결제 완료 화면 "번호 없음" 칩 상태 신설 · 2분 뒤 Orders로 이동 (§8-③) | decision-cd-parallel-20261123 §8 | ○ | 진행 중(M3-1125-B) — `phone_entry_state=skipped` 서버 구현; POS 칩 UI·2분 타이머 미구현 | — | **진행 중(M3-1125-B)** |
| 11 | Ask phone 누를 때 "Customer display is busy" 오류 (CD 가 번호 미입력 완료 화면인데도 busy) | decision-pos-phone-status-20261124 §9 | ○ | 진행 중(M3-1125-B) | Kyu 11-24 "잘못된 메시지" | **진행 중(M3-1125-B)** |

---

## 구현됨

| # | Kyu 원문 요지 | 출처 | 문서화 | 구현(파일:줄/PR) | 실기 | 판정 |
|---|---|---|---|---|---|---|
| 12 | 화면 구성 — 대기·결제중·번호입력·첫방문동의·적립완료·영수증·QRIS (CD-1 + 6번) | decision-customer-display-20261115 CD-1 | ○ | `src/screens/{MainScreen,CartScreen,KeypadScreen,ConsentScreen,DoneScreen,ReceiptScreen,KeypadAfterScreen,QrisScreen}.tsx` | 11-19 실기 | 구현 |
| 13 | 컬러 테마 20종 Admin 선택 · Butter Cream 기본 (CD-2) | decision-customer-display-20261115 CD-2 | ○ | `src/theme/tokens.ts:63` (20종) · admin `customer-display/page.tsx` | — | 구현 |
| 14 | 언어 5종(EN/ID/KO/JA/ZH) · 우상단 지구본 메뉴 (CD-4) | decision-customer-display-20261115 CD-4 | ○ | `src/components/GlobeMenu.tsx` · `i18n/strings.ts` · `i18n/context.tsx` | — | 구현 |
| 15 | 매장별 설정(매장명·PB1 세율·적립률) 서버에서 로드 (CD-5) | decision-customer-display-20261115 CD-5 | ○ | `src/lib/display-config-source.ts` · `app/index.tsx:206-222` | — | 구현 |
| 16 | 이벤트 테마 7종(Christmas·Imlek·Valentine·Ramadan·Lebaran·Maulid·17 Agustus) + 큰 애니메이션 장식 (CD-6) | decision-customer-display-20261115 CD-6 | ○ | `src/decor/events.ts` · `src/decor/EventDecor.tsx` | Kyu 07:52 "완벽" | 구현 |
| 17 | Admin: 이벤트별 From~To 달력 선택 · 달력 보기 (CD-7) | decision-customer-display-20261115 CD-7 | ○ | `admin/components/customer-display/EventCalendar.tsx` · `EventForm.tsx` | — | 구현 |
| 18 | Admin: 컬러/이벤트 테마 Simulate 팝업 (CD-8) | decision-customer-display-20261115 CD-8 | ○ | `admin/components/customer-display/PreviewPanel.tsx` | — | 구현 |
| 19 | 손님 iPad에 테마/이벤트 버튼 없음 — Admin 전용 (CD-9) | decision-customer-display-20261115 CD-9 | ○ | admin에만 PreviewPanel, CD 앱에 테마 선택 버튼 없음 | — | 구현 |
| 20 | POS 결제 완료 → 영수증 애니메이션(6번) 표시 (CD-12) | decision-customer-display-flow-20261115 CD-12 | ○ | `src/screens/ReceiptScreen.tsx:76-108` (slide+pop Animated) | 11-19 실기 | 구현 |
| 21 | 번호 미리 입력 → 6→5 / 미입력 → 6→3' (CD-13 규칙 A/B) | decision-customer-display-flow-20261115 CD-13 | ○ | `src/lib/display-machine.ts:200-209` (RECEIPT_DONE 분기) | — | 구현 |
| 22 | 3번 입력 중 결제 → 흐름 끊지 않음 · 10초 이상이면 6 생략 (CD-14 규칙 C) | decision-customer-display-flow-20261115 CD-14 | ○ | `src/lib/display-machine.ts:229-237` (payAfterKeypadMaxMs) | — | 구현 |
| 23 | 결제 후 번호 입력: "Skip" 버튼 + 30초 무입력 idle (P-1) | decision-customer-display-flow-20261115 P-1 | ○ | `src/screens/KeypadAfterScreen.tsx` · `app/index.tsx:362-374` (keypadTimeoutSec=30) | 11-19 실기 | 구현 |
| 24 | 다음 주문 시작해도 손님 흐름 끝날 때까지 화면 점유 (P-2) | decision-customer-display-flow-20261115 P-2 | ○ | `src/lib/display-machine.ts:270-297` (rule E · terminal flow guard) | — | 구현 |
| 25 | 결제 후 번호 → 직전 주문 적립 · 그날 영업 마감까지 소급 연결 (P-3 + §1) | decision-customer-display-flow-20261115 P-3 · decision-cd-parallel-20261123 §1 | ○ | `src/lib/snapshot-api.ts:6` (link_open_until EOB 주석) · `lifecycle.ts:248` | — | 구현 |
| 26 | 적립 완료 → 3~5초 뒤 대기 화면 (P-4) | decision-customer-display-flow-20261115 P-4 | ○ | `src/screens/DoneScreen.tsx` · `app/index.tsx:385-394` (doneAutoReturnMs=4000) | — | 구현 |
| 27 | 장바구니 담는 대로 손님 화면 실시간 목록+합계 표시 (CD-15) | decision-customer-display-flow-20261115 CD-15 | ○ | `src/screens/CartScreen.tsx` · `display-machine.ts:374` (CD-15 주석) | 11-17 실기 | 구현 |
| 28 | 입구 A: 결제 완료 화면 "Ask phone on display" 버튼 (PIN 없음) | decision-cd-ask-phone-20261118 | ○ (M0-1118-N) | storeport #414 머지 · `apps/commerce-core/src/api/admin/pos/customer-display/` | handoff-20261124 "머지됨" | 구현 |
| 29 | 번호 요청 시 손님 화면 주문 요약 카드 고정 | decision-cd-ask-phone-20261118 | ○ (M0-1118-M) | `src/screens/KeypadScreen.tsx:38-43` (summary prop) | — | 구현 |
| 30 | 페어링 후 어느 앱 재시작해도 자동 재연결 | handoff-20261118 · 11-19 실기 | ○ | `src/lib/pairing.ts:153-176` (bootCheck) | 11-19 실기 "자동 재연결 정상" | 구현 |
| 31 | POS 화면 상태 추종 — idle→대기·cart→카트·payment_qris→QR·paid→영수증·loyalty_entry→키패드 | decision-customer-display-flow-20261115 · handoff-20261118 | ○ | `src/lib/display-machine.ts:29-57` (posScreenToDisplay) | — | 구현 |
| 32 | QRIS 결제 화면 QR 표시 · 금액 Rp NaN 없음 · 주문번호 #숫자 | handoff-20261119 실기 | ○ | `src/screens/QrisScreen.tsx` · `snapshot.qr_string/amount/display_id` | 11-19 실기 (11-20 00:40 머지 후 정상) | 구현 |
| 33 | 번호 입력 실시간 중계 (150ms debounce → 서버 → POS 폴링) | decision-cd-parallel-20261123 §8 · decision-pos-phone-status-20261124 §3 | ○ (M2-1124-B) | `app/index.tsx:273-287` (handleDigitsChange) · `snapshot-api.ts:31` · `service.ts:468-473` | — | 구현 |
| 34 | POS Pay/결제 화면으로 이동해도 번호 입력 화면 없애지 않음 (keypad lock) | decision-cd-parallel-20261123 §5 · decision-pos-phone-status-20261124 §8 | ○ (M2-1124-B) | `src/lib/display-machine.ts:302-328` (keypad lock, snapshot.id 변경 시만 해제) | — | 구현 |
| 35 | 번호 입력 중 손님이 화면 점유 · POS 카트 잠금 없음 (충돌 규칙 B 서버 · C안) | decision-cd-parallel-20261123 §5·§7 | ○ (M0-1123-F) | `service.ts:527-559` (phone_deferred=true) · `Migration20261123000001.ts` | — | 구현 |
| 36 | 1번 종료 시 2번 결제 화면 CD 자동 복귀 (§8-②) | decision-cd-parallel-20261123 §8 | ○ | `service.ts:638` (phone_deferred=false) · display-machine pos_screen 라우팅 | — | 구현 |
| 37 | 손님 화면 구석 칩 번호 #N (pos_order_num) | decision-pos-phone-status-20261124 · decision-pos-ui-approval-20261124 | ○ | `src/components/PosChipBadge.tsx` · CartScreen:71 · QrisScreen:147 · KeypadScreen:135/320 · ReceiptScreen:138 | — | 구현 |
| 38 | 주문번호 채번 체계 (매장 닉네임 기반 · PIM26B…) | decision-pos-ui-approval-20261124 | ○ | storeport #421 `order_custom_display_id` · `apps/commerce-core/src/modules/register_session/migrations/Migration20261124000001.ts` | 11-25 실기 예정 | 구현 |
| 39 | Cart 버튼 Pay → "Checkout" · tender 화면 제목 Cash/Card/QRIS payment · X 버튼 44pt | decision-pos-ui-approval-20261124 | ○ | fork #254 머지 (924cf7d) · `KeypadAfterScreen.tsx` | handoff-20261125-am 머지 확인 | 구현 |
| 40 | 종이 영수증 포인트 미표시 유지 (§8-④, WA 영수증 때 처리) | decision-cd-parallel-20261123 §8 | ○ (정책) | 프린터 영수증에 적립 미인쇄가 현재 상태 · WA 영수증 단계에서 별도 처리 예정 | — | 문서만 |
| 41 | CD-11: 2번 화면 "Enter phone number" 글자 가운데 정렬 | decision-customer-display-flow-20261115 CD-11 | ○ (시안 v7 반영) | 시안에만 반영 · 코드 직접 확인 불가 | — | 문서만 |

---

## 요약

| 판정 | 건수 |
|---|---|
| 미착수 | 3 |
| 부분 | 4 |
| 진행 중(M3-1125-B) | 4 |
| 구현됨 | 27 |
| 문서만 | 3 |
| **합계** | **41** |

---

## 미반영 묶음 제안 (30~45분 단위 라운드)

### Round CD-A: 대기 화면 매장 이미지 실렌더링 + 이슬람력 자동채움 (약 30분)
**묶음 근거**: 모두 `apps/customer-display` 단독 작업, 서버 API 완비.

| 작업 | 건드릴 파일 |
|---|---|
| VariantB에 `<Image source={{ uri: storeConfig.storeImageUrl }}/>` 추가 (CD-3) | `apps/customer-display/src/screens/MainScreen.tsx` |
| `StoreConfig`에 `storeImageUrl?: string` 필드 추가 | `apps/customer-display/src/mocks/adapter.ts` |
| `app/index.tsx` storeConfig에 `storeImageUrl: liveConfig.store_image_url ?? undefined` 전달 | `apps/customer-display/app/index.tsx` |
| 서버 `display-config` 응답에 islamic_dates 추가 → `useActiveEvent` 에 전달 (CD-10) | `apps/commerce-core/src/api/customer-display/display-config/route.ts` · `app/index.tsx` |
| Admin `EventForm` 이슬람력 사전 채움 (from/to 기본값) | `admin/components/customer-display/EventForm.tsx` |

### Round CD-B: CD 아이콘 M 75% 수정 (약 15분)
**묶음 근거**: 아이콘 SVG 1개 수정 + gen-icons 재실행.

| 작업 | 건드릴 파일 |
|---|---|
| `icon-hp.svg` M 높이 65% → 75%로 수정, gen-icons 재실행 | `apps/customer-display/assets/brand/icon-hp.svg` · `scripts/gen-icons.mjs` |
| EAS preview 빌드 발부 → Kyu iPad 설치 | (빌드 명령) |

### Round CD-C: 영수증 tender 세부 동기화 (약 40분)
**묶음 근거**: 서버 snapshot.receipt에 tenders[] 추가 → CD ReceiptScreen 렌더링.

| 작업 | 건드릴 파일 |
|---|---|
| `order-snapshot.ts` receipt 타입에 `tenders?: {method, amount}[]` 추가 | `apps/customer-display/src/types/order-snapshot.ts` |
| `apps/commerce-core/src/types/customer-display.ts` receipt 타입 갱신 | commerce-core |
| `register_session/lifecycle.ts` 영수증 snapshot 에 tenders 포함 | `apps/commerce-core/src/modules/register_session/lifecycle.ts` |
| `ReceiptScreen.tsx` tender 목록 렌더링 (Cash·Card·QRIS 각 금액) | `apps/customer-display/src/screens/ReceiptScreen.tsx` |
| 겹치는 파일: `order-snapshot.ts` (CD-C와 Round CD-A 무관) |  |

### Round CD-D: CD1 적립 잔액 Rp0 버그 (약 30분)
**묶음 근거**: 로열티 적립 후 new_balance 반영 타이밍 버그.

| 작업 | 건드릴 파일 |
|---|---|
| `link-customer-order.ts`에서 `earn.new_balance` → snapshot.receipt.new_balance 반영 로직 확인 | `apps/commerce-core/src/lib/link-customer-order.ts:427` |
| DoneScreen `snapshot.receipt?.new_balance` 렌더링 경로 추적 | `apps/customer-display/src/screens/DoneScreen.tsx:95` |

### Round CD-E: 매니저 PIN 사용 기록 Admin 조회 (약 45분)
**묶음 근거**: 서버 로그 테이블 + Admin 화면 신설.

| 작업 | 건드릴 파일 |
|---|---|
| `manager_pin_audit` DB 테이블 migration | `apps/commerce-core/src/modules/register_session/migrations/` |
| PIN 사용 시 로그 기록 (`void/refund/link-customer` 경로) | `apps/commerce-core/src/lib/` |
| Admin 화면 `/admin/pos-settings/manager-pin` 신설 | `apps/commerce-core/src/admin/routes/pos-settings/` |
| 겹치는 파일: `migration` 폴더 (CD-C와 겹칠 수 있음 — 순서 주의) | |

### 주의: M3-1125-B 진행 중 항목(#8·9·10·11)은 완료 후 별도 라운드
POS 우상단 6상태 칩·Ask phone 버튼 삭제·"번호 없음" 칩+2분 타이머는 M3-1125-B 착지 후에야 CD-B/C/D 라운드와 겹치지 않음.
