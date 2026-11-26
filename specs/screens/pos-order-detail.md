# POS Orders → 주문 상세 — 승인된 화면 요소

범위: 결제 완료 후 Orders 탭에서 특정 주문을 연 뒤의 **Orders Detail** 화면.
공용 `POS-HDR-PHONE` 은 이 화면에서 뜨지 않는다(결제 진행 중만) — [pos-payment-flow.md](./pos-payment-flow.md) 참조.

## 요소

| ID | 위치 | Kyu 원문 · 승인일 | 승인된 모습 | 현재 구현 | 일치 여부 |
|---|---|---|---|---|---|
| `ORDER-LINK-CUSTOMER` | 주문 상세 하단 버튼 (Done 과 같은 줄 왼쪽) | 11-18 16:49 "기존에 있었던 order을 찾아서, link customer 라는 버튼은 … 그 버튼 눌르고 들어가면 나오는 화면에서 **고객에게 핸드폰 번호넣는 화면 보여주기 버튼이 있는거지**" + 16:58 "추후에 order을 찾아서 link 를 하는 경우는 **매니저 4자리 비밀번호를 넣게 하자**. 매니저 비밀번호가 쓰인 기능들 … admin 의 매니저 비밀번호 조회하는 화면에서 날자별로 어떤 경우에 어떤 건에 대해서 매니저 비밀번호가 쓰였는지 조회될수있도록 하자" (`decision-cd-ask-phone-20261118.md:4-5`) | 버튼 `Link customer` · canceled/voided 주문은 숨김 · 누르면 `LateLinkCustomerSheet` (매니저 4자리 PIN) · 손님 화면에 번호 입력 열기 또는 캐셔 직접 입력 · **PIN 사용은 서버 기록 → Admin "Manager PIN" 화면에서 날짜·기능·주문번호·금액·시각·캐시어 조회** | `fork/app/orders/[orderId].tsx:947-957` + `fork/app/orders/[orderId].tsx:1013-` `<LateLinkCustomerSheet .../>` (M0-1118-L) | **일치** (POS 측 · PIN 기록 Admin 쪽은 M2-1118-N 로 분리 소유) |
| `ORDER-RECEIPT` | 상세 본문 영수증(또는 영수증 탭) | 11-24 11:03 승인 "POS 영수증 = 손님 화면 영수증 … 모든 POS 화면 · 손님 화면 구석 · 영수증 맨 위 = 칩 번호 #N 하나 · **긴 Order 번호는 영수증 아래·주문 상세에만 작게**" (`decision-pos-ui-approval-20261124.md:10,12`) | 영수증 데이터 = POS/CD 과 동일(품목·옵션·세금·결제·QR·Thank you) · 긴 Order display_id 는 상세 화면 안에 작게 노출 가능 | `fork/app/orders/[orderId].tsx` (lineSummary 등) | **일치** (CD 쪽 "Store" 만 보이는 결함은 `CD-RECEIPT-FORMAT` 별도 · V3-2) |
| `ORDER-PHONE-ENTRY` | **Link customer 오른쪽** · **새 요소 (V4-7)** | 11-26 15:40 "Link Customer 오른쪽에 **Phone Entry** 라는 버튼을 넣는거야. 그러면 아직 새로운 주문이 들어오기전이라면 phone entry 의 버튼이 생기는거고, 새로운 주문이 들어와버리면 phone entry 버튼은 사라저벼리는거지" + 15:53 "응 그렇게 하자" · "결제가 완료된 건들은 여기서 고객에게 전화번호 입력기회를 주는거고" (`decision-cd-pos-sync-v4-20261126.md:12-14`) | 버튼 `Phone entry` · Link customer 바로 **오른쪽** · 조건 = ① 가장 최근 결제 주문 · ② 새 장바구니 시작 전 · ③ 번호 미확인 · ④ 영업 마감 전 (`link_open_until > now`) · **PIN 없음** · 누르면 CD 에 그 주문 영수증(좌 1/3) + 키패드(우 2/3) 열림. 서버 거절: `no_snapshot` · `not_paid` · `phone_already_linked` · `link_window_closed` · `not_latest_paid` · `new_cart_started` · `phone_entry_busy`(다른 snapshot 가 phone_entry_open 중). 엔드포인트 `POST /admin/pos/orders/:id/phone-entry` → `{ eligible, snapshot, reason? }` (storeport v1.4 §4 · `docs/contracts/cd-sync-contract-v1.4.md:89-144`) | **없음** — `fork/app/orders/[orderId].tsx:947-957` 에는 `Link customer` 와 `Done` 만. storeport 서버 측 엔드포인트도 v1.4 로 계약서화만 됨(구현은 `storeport#454` 머지 후 발부) | **미구현** (fork M3 + storeport M0 라운드 대기) |

## 충돌·미결

### 충돌 1 (POS-LINK-CUSTOMER 이중과의 관계)
- `SUCC-LINK-CUSTOMER` 와 같은 뿌리. 자세한 내용 [pos-payment-flow.md](./pos-payment-flow.md) 충돌 1 참조.
- 요지: Order 상세 `Link customer` 는 PIN 필수 · V4-7 `Phone entry` 는 PIN 없음 — 조건이 다름(이미 결제 완료 + 조건 4개 만족 시 PIN 면제).

## 보존 테스트 목록

| 요소 | 자동 검사 1줄 | 기존 테스트 |
|---|---|---|
| `ORDER-LINK-CUSTOMER` | `order-link-customer` testID 존재 · 눌림 → PIN 시트 노출 · canceled 주문에서 숨김 | 없음 |
| `ORDER-RECEIPT` | 영수증 필드 1:1 (POS 영수증과) | 없음 |
| `ORDER-PHONE-ENTRY` | 구현 뒤 작성 (eligible=true 입력 → 버튼 노출 · false 입력 → 숨김 · 눌림 → CD 좌영수증+우키패드) | 없음 (미구현) |
