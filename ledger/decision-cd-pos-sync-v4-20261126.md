# CD↔POS — QRIS 실기 (Kyu 11-26 15:40 WIB) · Phone entry 버튼 · 우측 상단 번호 상태 칸

환경: POS web fork master(#270~#273) · CD 운영 admin.meros.id (storeport main #452 · #454 미머지)

## Kyu 원문 (요지 그대로)
- "POS에서 Payment successful 화면이 그대로 남아있었고, Next customer 을 눌렀어. > 고객쪽화면이 초기화면으로 돌아옴. (정상) 그런데, 잠시 시간이 흐르니, 첨부1처럼 기존매출 Order 상세내역이 고객화면에 떴어(불량)"
- "POS 화면 하단에 Sell 이 선택되어있을때, Sell 글자가 까맣게 되어서 전혀 안보여.(불량), 선택되어있을때에도 최소한 Sell 글자는 보여야한다고 봐."
- "Sell 화면에서 물건을 하나 클릭하면 … 아래에서 시트가 올라오는데, 사진이 좀 이상한 부분이 확대되어 보여 … 전체 사진이 sheet 의 상품 사진 영역에 맞게 fit 하게 줄어들어야 한다고 봐. (불량)"
- "첨부 3: POS쪽에서 QRIS 를 선택한 화면이야. 그때에도 오른쪽 고객화면은 그냥 동일해. 첨부 4 : Generate QR 버튼을 누르니까, 차이가 Enter phone number 버튼만 활성화 되었어."
- "첨부 5 : Payment Simulate 버튼을 누르니 첨부 5처럼 되었음. 첨부 6 : 약 20초인가? 아니면 30초인가 후에 첨부 6처럼 되었음."
- "첨부 7 : Hand over 버튼을 눌렀더니, 아직도 고객화면은 phone entry skipped 로 되어있음."
- 제안(15:40): "… Link Customer 오른쪽에 Phone Entry 라는 버튼을 넣는거야. 그러면 아직 새로운 주문이 들어오기전이라면 phone entry 의 버튼이 생기는거고, 새로운 주문이 들어와버리면 phone entry 버튼은 사라저벼리는거지. 그런경우에는 캐시어가 Link Customer 버튼을 눌러서 매니저의 비번을받아서 고객번호를 입력해야해."
- (15:53) "응 그렇게 하자." (= 오케 추천안: Payment successful 상단 칩 + Order 상세 Link customer 오른쪽 · Sell 화면 제외 · 조건 = 가장 최근 결제 주문 + 새 장바구니 시작 전 + 미확인 + 영업 마감 전 · PIN 없음)
- 🔴 (15:53 · 재언급) "고객이 전화번호를 입력하기 시작하거나 멈추거나 혹은입력을 완료하면, 그 실시간 정보가 POS 화면의 우측 상단에 뜨도록 요청했었고, 구현되었었다가, 오류가 계속있어서 그걸 요청하던 와중에 없어져 버렸거든. 그 컨셉은 계속 유지를 하고 싶어. 번호를 고객이 다 입력후 OK 를 누르고나서도, 잘못 입력했다고 할수 있으니, 캐시어가 고객화면에 번호입력 화면(phone entry) 를 보여줄수 있는 버튼도 만들어달라고 했었었어.(고객 번호 입력 완료후에) 그 요구사항과 구현내용이 어떻게 된건지 꼭 찾아주고, 즉, 이렇게 결제진행도중의 고객에게 phone entry 화면을 열어주는것은, 결제도중에 언제든지 캐시어가 할수 있어야 한다고 생각해. 그래서 우측상단에 그 버튼을 상시로 띄워서 보여줘야하는데, … Order 상세는 이미 결제가 완료된 건들은 여기서 고객에게 전화번호 입력기회를 주는거고, 결제가 진행중인것은, 화면 우측상단에 전화번호 입력 상태와 함께 고객화면을 열어주도록 하는 버튼을 만들자는것."
- (15:53) "Preview 가 Loading 으로 만 나오고 동작하지 않아. 둘째로 x 버튼도 표준이 아니고(애플 설정의 x버튼 사이즈와 동작방식을 차용) 셋쨰로 마우스로 드레그 앤 드롭을 하는데, 잘 안움직여져."

## 이력 추적 (오케 · 15:55)
- 11-18 decision-cd-ask-phone-20261118: 입구 A = 결제 완료 화면 [Ask phone on display] (PIN 없음) · 입구 B = 주문 상세 Link customer (PIN).
- 11-24 decision-pos-ui-approval-20261124 (Kyu "다 승인"): **우측 상단 손님 번호 상태 칸 6상태** ① Ask phone ② Waiting ③ 입력 중 실시간(파랑+점) ④ Done(초록+체크+**Re-enter**) ⑤ Skipped(+**Ask again**) ⑥ 다른 손님 사용 중(노랑+자물쇠) — Cart · Checkout · Cash/Card/QRIS · 나눠결제 · Payment successful 공통 · 영수증 아래 Ask phone 버튼 삭제.
- 구현: M1-1124-B → fork `components/customer-display/CustomerPhoneStatus.tsx`(6상태 + Re-enter/Ask again) + `useAskPhoneOnDisplay.ts`(pos_screen=loyalty_entry 전이).
- 회귀: 11-25 M3-1125-R (fork #266) 이 새 계약(customer_flow)용 `CustomerFlowChip` 을 만들며 화면이 그 칩으로 바뀜 → 실시간 숫자 + Ask/Re-enter/Ask again 버튼 사라짐(코드는 남음). 11-26 #270 이 실시간 숫자만 복구 · **버튼 3종은 아직 미복구**(15:28 실기 화면 = "Not confirmed · Link customer" 만).

## 항목
| # | 내용 | 소유 | 상태 |
|---|---|---|---|
| V4-1 | Next customer 후 지난 주문(#202 cart/draft) 스냅샷이 다시 CD 에 뜸 | M0 | M0-1126-G(#454) 결과 후 |
| V4-2 | POS 하단 탭 선택 상태 Sell 글자 안 보임 | M3 | M3-1126-H |
| V4-3 | 상품 시트 사진 contain | M3 | M3-1126-H |
| V4-4 🔴 | QRIS 결제 중 CD 에 QR 미표시 | M2 진단 → 수정 허브 | M2-1126-H 진단 |
| V4-5 | CD 영수증 결제수단 "Cash"(실제 QRIS) · PB1 Rp 0 · 줄 금액 세금 포함 · 머리 "Store" | M0 | #454 결과 후 |
| V4-6 | 무입력 20초 → "Phone entry skipped" 에 머묾 → 처음화면 | M0 | #454 결과 후 |
| V4-7 | **Phone entry 버튼(결제 완료된 주문)** — Payment successful 상단 칩 + Order 상세 Link customer 오른쪽 · 조건 = 가장 최근 결제 주문 · 새 장바구니 전 · 번호 미확인 · 영업 마감 전 · PIN 없음 · 누르면 CD 에 그 주문 영수증(좌) + 키패드(우) | M3 + M0 | ✅ Kyu 확정 15:53 · #454 머지 후 발부 |
| V4-8 🔴 | **우측 상단 번호 상태 칸 = 11-24 승인 6상태 복구(결제 진행 중 상시)** — 실시간 숫자 유지 + 캐셔가 언제든 CD 에 번호 입력 화면 열기(Ask phone · OK 후 Re-enter · Skipped 후 Ask again) · Cart·Checkout·결제수단·나눠결제·Payment successful 공통 · 새 계약(customer_flow) 위에서 | M3 + M0 | 재언급 🔴 · #454 머지 후 V4-7 과 한 라운드 |
| V4-9 | POS CD Preview(미리보기 창) — ① "Loading…" 에서 안 넘어감 ② X 버튼 = iOS 설정식(44pt 원형 · 눌림 피드백) ③ 마우스 드래그가 잘 안 됨 | M3 | M3-1126-I |
