# M0-1123-A · 병렬 결제 흐름(P안) 실현성 진단 리포트

**판정**: **원안 권장(잠금+건너뛰기)** · 단 [건너뛰기] 모달에 "주문 조회에서 나중에 적립 가능" 1줄 안내 추가(절충).

**근거 3줄**:

1. P안은 `startSnapshotForRegister`/`upsertSnapshotForRegister`/`pickBestSnapshot` 를 "활성 N개" 모델로 전환해야 하는데, 현 서비스 코드 주석(M3-1119-R/S)이 이미 "paid·active 혼재 타이밍" 분기를 4번 재리팩터한 이력을 자체 기록 — 또 한 번 뒤흔들면 분할결제/consent/Next customer 분기 회귀 위험이 크다.
2. fork 쪽 POS에 "손님 화면 미니 뷰(WebView/iframe)"가 **존재하지 않는다**(`grep -rn 'WebView\|iframe'` in fork = 0). Kyu의 "POS 화면 안 손님 화면 작게 표시"는 완전 신규 구현이고, RN 앱이라 iOS WebView + CSP + 토큰 전달까지 라운드 1개가 추가된다.
3. "희생"의 복구 경로가 **이미 존재**: `linkCustomerToOrder()` 의 late-link(소급 적립) + §5-A "주문 목록 → 주문 상세 → [Link Customer]" 경로. 1번 손님은 "희생"이 아니라 "뒤늦게 캐시어 조작으로 적립 회수" 가능 — 건너뛰기 모달 안내문 한 줄로 UX 보정 가능.

---

## Q1. Medusa 코어가 2 draft order(또는 cart) 동시 보유를 막는가?

**결론: 코어는 안 막는다.** 제약은 MEROS 레이어에만 있다.

- Medusa v2 `draft_order` 는 `is_draft_order=true` 플래그를 가진 Order. 같은 `sales_channel_id` + `stock_location_id` 조합으로 N개 생성 가능(스키마·서비스 모두 UNIQUE 제약 없음).
- 코어 `convertToOrder(draftOrderId)` 는 id 단건 작업 — "하나만 열려 있어야 한다" 는 전제가 없다.
- fork 로그 확인: `useResetAndCreateDraftOrderId` → `sdk.admin.draftOrder.create({region_id, sales_channel_id, customer_id})` 호출 그대로. 코어 쪽 거부 없음.

→ Kyu 가정(코어는 안 막음)이 맞다. 1번 손님은 이미 결제 완료된 Order이고, 남은 건 그 order 에 customer 연결 + 적립이라는 **별도 사후 작업**이라는 전제도 맞다(`linkCustomerToOrder` 는 `order_id` 키로 동작, `link_open_until` 도 해당 snapshot 단위).

---

## Q2. 순차 제약이 실제로 어디 있나?

**(a) fork 앱 상태 — YES(치명적이지 않음)**
- `agilo-medusa-pos-fork/api/hooks/draft-orders.tsx:25` — `DRAFT_ORDER_ID_STORAGE_KEY='draft_order_id'` 단일 SecureStore 슬롯.
- 단, `draft-orders.tsx:1050` 에서 `convertToOrder` 직후 즉시 `deleteItemAsync` → **결제 완료 즉시 슬롯은 비워진다.** 다음 Add to cart 는 새 draft 를 자유롭게 만든다.
- 즉 fork의 "단일 슬롯"은 "결제 전 카트 1개"에만 적용되는 제약 — P안의 "1번 결제 완료 후 2번 카트 담기"는 fork 수준에서는 **이미 가능**.

**(b) 서버 order_snapshot — YES(핵심 블로커)**
- `apps/commerce-core/src/modules/register_session/order_snapshot/model.ts:3-13` 주석: "register_session_id 당 여러 스냅샷이 존재할 수 있다(주문별)" — 모델 자체는 복수 허용.
- 그러나 **서비스가 복수를 허용하지 않는다**:
  - `service.ts:150-186` `startSnapshotForRegister` → 해당 register 의 **모든 non-expired(=active+paid)** 스냅샷을 expire 처리하고 신규 생성.
  - `service.ts:217-244` `upsertSnapshotForRegister` → paid snapshot 발견 시 no-op OR `pos_screen='cart_building'` + 더 큰 seq 이벤트가 오면 **paid 를 expire**.
  - `service.ts:360-387` `getActiveSnapshotForRegister` → `pickBestSnapshot(alive)` 로 **1건만** 반환.
  - `lifecycle.ts:41-55` `pickBestSnapshot` → `active` 가 `paid` 보다 우선. 복수 alive 가 있어도 1 건만 고름.

**(c) 손님 화면(CD) 단일 세션 — YES**
- `apps/commerce-core/src/api/customer-display/snapshots/active/route.ts:36` 는 `getActiveSnapshotByStockLocation` → 단건 반환.
- `service.ts:573` `customer_display_device` upsert 는 `stock_location_id` UNIQUE — 한 매장 = 1 디바이스 = 1 세션.
- `apps/customer-display/` 앱 자체가 "현재 활성 1개의 스냅샷"을 그리는 단일-상태 머신(`display-machine.ts`).

**(d) 적립 link 창(link_open_until) 이 "현재 snapshot"에 묶임 — 부분적 YES**
- `link_open_until` 은 **snapshot 레코드 필드**(order_snapshot/model.ts:27). 따라서 snapshot 별로 독립.
- 그러나 `linkCustomerToOrder()` (`lib/link-customer-order.ts:303-312`) 는 `order_id` 로 snapshot 을 역조회해서 창 체크 → **order_id 기준으로는 유지됨**.
- 함정: Q2(b) 때문에 2번 손님 카트가 `cart_building` 을 올리면 1번 손님의 paid snapshot 이 **server-side 로 expire** 되어 CD의 keypad 창이 끊긴다(`service.ts:237-244`). `linkCustomerToOrder` 는 그래도 order_id 로 작동하지만, **CD 는 1번 keypad 화면을 띄울 수 있는 상태(snapshot_state=paid+link_open)를 잃는다.**

---

## Q3. P안을 하려면 바꿔야 할 것 대사표

| # | 항목 | 코어에 있음 | 우회 | 신규 필요 | 위치·근거 |
| --- | --- | --- | --- | --- | --- |
| ① | 번호 입력 대기를 order_id 기준으로 분리 | 서버 쿼리(`linkCustomerToOrder`) ✓ | — | CD가 order_id 별로 다른 keypad 를 보여주려면 폴링 응답이 배열화 필요 → **신규** | `lib/link-customer-order.ts:303` order_id 키 조회 OK; 그러나 `/customer-display/snapshots/active` 는 단건 응답 (route.ts:36) |
| ② | POS 카트 잠금 제거 | — | hooks/usePosScreenAutoEmit `freezeCart` 플래그 분기만 제거 ✓ | — | fork `components/payment/SuccessReceiptAnim.tsx` + `hooks/usePosScreenAutoEmit.ts` |
| ③ | POS 안 손님 화면 미니 뷰 | — | — | **WebView/iframe 신설 필수** · fork `grep -rn 'WebView\|iframe' = 0` | 없음 |
| ④ | 2번 결제 완료 시 캐셔 화면 직접 입력 | `LinkCustomerSheet`/`linkCustomerToOrder` 재사용 ✓ | — | — | fork `components/loyalty/LinkCustomerSheet.tsx`; `api/admin/pos/orders/[id]/customer/route.ts` |
| ⑤ | 1번 입력 종료 후 CD 다음 상태 전이 규칙 | — | — | `getActiveSnapshotForRegister` 를 "paid-with-open-link + 신규 active" 2건 반환 모델로 재설계 **신규** | `service.ts:360-387`, `lifecycle.ts:41` `pickBestSnapshot` |
| ⑥ | 적립이 엉뚱한 주문에 붙는 경합 방지 | — | — | CD keypad 가 `order_id` 를 명시적으로 들고 전송(`POST /customer-display/snapshots/[id]/link-phone` 를 `.../orders/[id]/link-phone` 로 재설계 또는 req body 에 order_id 포함) **신규** | `apps/commerce-core/src/api/customer-display/snapshots/[id]/link-phone/route.ts` |

**또한 바꿔야 할 보조 항목**:
- `startSnapshotForRegister` (service.ts:150) — "non-expired 전부 expire" 로직을 "active 만 expire, paid 는 보존" 으로.
- `upsertSnapshotForRegister` (service.ts:217) — `cart_building`+bigger seq 일 때 paid expire 하는 M3-1119-R/S 가드를 **제거**.
- `apps/customer-display/src/lib/display-machine.ts` — "현재 1개 스냅샷" 가정을 "cart(신규) + keypad(이전 손님)" 멀티 상태로 완전 재설계.

---

## Q4. 변경 규모 vs #408 원안

| 척도 | P안 | #408 원안(잠금+건너뛰기) |
| --- | --- | --- |
| 건드릴 서버 파일 | `service.ts`·`lifecycle.ts`·`order_snapshot/model.ts`·`api/customer-display/snapshots/active/route.ts`·`api/admin/pos/registers/[id]/snapshot/route.ts`·`api/customer-display/snapshots/[id]/link-phone/route.ts`·subscriber (총 7+) | `service.ts`(setSnapshotPhoneEntry 삭제)·`lifecycle.ts`(phone_entry_open 추가)·`order_snapshot/model.ts`(pre_entry/skipped_at 삭제 + migration)·`api/admin/pos/loyalty/sessions/snapshots/active/route.ts` (총 4) |
| 건드릴 CD 파일 | `display-machine.ts` 멀티상태 전면 재설계 + `useDisplayMachine.ts` + 신규 "concurrent carts" 레이아웃 + 전 screens 재검토 | `display-machine.ts`·`ReceiptScreen.tsx`·`KeypadAfterScreen.tsx`·`types/*`·`app/index.tsx` (설계서 §1-A/C 그대로) |
| 건드릴 fork 파일 | `SuccessReceiptAnim.tsx`·`usePosScreenAutoEmit.ts`·**신규 `CdMirrorWebView.tsx`**·신규 polling hook·`lib/ask-phone-on-display.ts` | `lib/loyalty-snapshot.ts`·`SuccessReceiptAnim.tsx`·`hooks/usePosScreenAutoEmit.ts`·`app/checkout/success/[orderId].tsx`·`app/checkout/[draftOrderId].tsx` |
| 라운드 수 | 5~6 (서버 1 · 서버 2 · CD · POS freeze 제거 · POS mini view · 통합 QA) | 3 (설계서 §9 — 서버 · CD · POS) |
| 위험 3 | ① snapshot "N개 alive" 쿼리 레이스(paid·active 혼재, 이미 M2-1119-G ~ M3-1119-S 로 4회 리팩터 이력); ② CD "두 손님 동시 UI" 신규 디자인 범위(와이어/문구/타이머 전면 재설계); ③ fork RN WebView 토큰 전달·세션 쿠키 공유·크래시 리커버리 | ① 10분 창 내 Skip UX("이 주문 적립을 건너뛸까요?") 사용자 학습 비용; ② 손님 1 keypad 중 손님 2 대기 시간 UX(평균 수 초~수십 초); ③ offline polled_at > 30s 판정 정확성 |
| "희생"의 실 복구 | 설계서에 명시된 §5-A late-link 경로 재사용 가능 | 동일 |

**판정 한 줄**: **원안 권장**. "희생"이 실제로는 "회수 가능"이며(§5-A), P안 추가 비용 대비 효용이 낮음.

**절충안**: 원안 그대로 가되, [건너뛰기] 확인 모달 문구를 "이 주문 적립을 건너뛸까요? (주문 조회 → Link Customer 로 10분 안에 다시 연결 가능)" 로 수정. 1줄 추가. 심리적 "희생감" 해소 + 캐시어 복구 경로 상기. 추가 라운드 無.

---

## Q5. Kyu 가 정할 UX 질문 (권장안 포함)

1. **[건너뛰기] 모달 안내문 추가**: "주문 조회 → Link Customer 로 10분 안에 다시 연결 가능" 1줄. **권장안 = 추가** (추가 비용 0, 희생감 해소, 설계서 §5-A 로 실제 복구 가능하다는 사실 캐시어에 노출).
2. **소급 적립 창(link_open_until)**: 10분 vs 당일 영업 마감 — 설계서 §407 Kyu 승인 대기. **권장안 = 10분 유지**. 당일 마감으로 확장하려면 `computeLinkOpenUntil()` 변경 + 영업일 경계 계산(WIB)이 필요한데, 캐시어가 orders 에서 수동 Link Customer 로 복구 가능하므로(이미 PIN 경로 존재 `lib/link-customer-order.ts:234-294`) 10분이면 충분.
3. **손님 2 "대기" 가시화**: 손님 1 keypad 중 손님 2 가 보는 CD 화면은 1번의 receipt/keypad → 손님 2 는 캐시어 뒤에서 기다리는 상태. **권장안 = 유지**. 평균 keypad 체류 ≤ 30s(설계서 S-03 timeout)인데 이 범위면 UX 수용 가능. 손님 2가 5s 이상 대기할 확률이 운영에서 실측으로 올라오면 그때 P안 재검토.

---

## 미확인(세션 내 실증 못 함)

- fork #218 · #226 R2 "미러 WebView" 는 현 fork(main branch `feat/M0-1120-C-classic-spp`)에서 **grep=0** · 소스 트리에 존재하지 않음. Kyu 가 이 PR을 다른 리포(customer-display 앱 자체 = storeport `apps/customer-display`) 로 가리키신 것으로 추정 — 그 경우 Q3-③ "미니 뷰"는 CD 앱 자체(별도 iPad/디바이스)를 POS 옆에 두는 것으로 해석되고, 그러면 P안의 추가 신규 비용이 더 커진다(두 디바이스 간 상태 동기화 설계 추가).
- `apps/customer-display/e2e/snapshots.spec.ts` 실 동작 변화 여부는 읽지 않음(코드-only 조사 요청이 아니라 진단).

---

_생성 시각: 2026-11-23 · 모델: Opus · 코드 수정 無 · PR/머지 無 · 운영 접근 無._
