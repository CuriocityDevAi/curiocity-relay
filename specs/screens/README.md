# 화면 명세서 (screen spec) — 정본

작성: M1-1126-P (2026-11-26) · 규약 근거 = `ledger/decision-spec-guard-20261126.md` (Kyu 동의 2026-11-26 17:17 WIB)

## 왜 이 폴더가 있나

Kyu 17:14 원문:
> "내가 이미 잘 쓰고 있는 버튼도 혹은 어떠한 기능도, 하루아침에 없어져 버릴수도 있거든. 내가 명시적으로 요청하지 않았어도 말이야 … 특정 아이템에 대해서 무엇인가 새로운 요구사항이 있을 경우, 너가 기존 요구사항과 부딪힌다는점을 명확히 해줘야해 … 화면명세서 같은게 있어서, 그것을 너가 구현된 화면과 비교"

요구 원장(`open-requirements`)은 "무엇을 원하나"(변해감). 명세서는 "지금 승인된 모습"(지금 이 순간의 정본). 둘은 분리.

재발 뿌리(M2-1126-J 감사 결론): **"새 계약서가 옛 Kyu 승인을 축약 반영" → 프롬프트가 축약본을 참조 → early-return 리팩터로 옛 분기 dead code → CI 두 분기 상호 배타 입력으로 둘 다 통과 → 실기까지 못 잡힘.** 이 폴더는 그 전염 사슬의 1번 고리(= 계약서가 승인을 축약함) 를 차단한다.

## 파일 구성

| 파일 | 범위 |
|---|---|
| [pos-payment-flow.md](./pos-payment-flow.md) | POS 로그인(LG) · Sell · Cart · Checkout · Cash/Card/QRIS · 나눠결제 · Payment successful + 공용 `POS-HDR-PHONE` 6상태 |
| [pos-order-detail.md](./pos-order-detail.md) | POS Orders → 주문 상세(결제 완료 뒤 Link customer · V4-7 Phone entry) |
| [customer-display.md](./customer-display.md) | 손님 화면(CD) 대기 · Order list · QRIS QR · 키패드 · First visit · Confirm · Earned · Failed · Skipped · Payment complete · 영수증 full/mini · 좌측 패널 |

## ID 체계

- 접두 = 화면군 · 꼬리 = 요소 성격. 예:
  - `POS-HDR-PHONE` — POS 공용 우측 상단 손님 번호 상태 칸
  - `POS-SUCC-PHONEENTRY` — Payment successful 상단 Phone entry 칩(V4-7)
  - `CD-QRIS-QR` — 손님화면 QRIS 큰 QR 패널
  - `LG-1`·`LG-2`·`LG-3` — 로그인 화면(원장에 이미 번호 매김 유지)
  - `CART-CHECKOUT-BTN` — Cart 시트의 [Checkout] 버튼
- 같은 요소가 여러 화면에서 **동일 규칙**으로 반복되면 **한 ID + 노출 화면 열** 로 적고 상태별 표만 한 번 적는다(= `POS-HDR-PHONE` 7화면 공용).
- 요소마다 1줄 요약 행 + 필요 시 상태/변형 표(세부). 세부 표가 없으면 요약 행 1줄로 충분.

## 각 행에 들어가는 것

| 열 | 내용 |
|---|---|
| ID | 위 체계 |
| 화면 | 어느 화면(들)에 뜸 — "Cart 시트 · Checkout · Cash/Card/QRIS · 나눠결제 · Payment successful" 같이 |
| 위치 | headerRight · 영수증 아래 · 합계 아래 등 |
| 상태/변형 | 상태 머신이 있으면 전부 나열. 상태별 색/배지/문구/활성 조건까지 |
| 버튼과 동작 | 한 요소가 트리거하는 액션(예: Ask phone → `start_entry`) |
| Kyu 원문 + 승인일 + 출처 | 가능한 한 **원문 그대로**. 출처 = `ledger/*.md:줄` 또는 `plans/*.md:줄` 또는 `queue/*.md:줄`. 승인 근거가 Kyu 가 아닌 오케/허브 판단이면 `출처=오케` 로 구분 |
| 현재 구현 | `fork/<path>:줄` 또는 `storeport/<path>:줄` + 커밋 SHA |
| 일치 여부 | `일치` · `불일치` · `미구현` · `진행 중 PR#<N>` (하나) |

### 승인 원형이 계약서/오케와 다를 때

M2-1126-J 감사의 경로 1 처리: 계약서(`plans/cd-sync-contract-*.md`)와 Kyu 원문 승인이 다르면 **Kyu 승인을 정본으로 적고** "계약서 축약" 꼬리표를 붙인다. 계약서를 다시 고치는 라운드는 별도. 지금 문서화된 상태 = `POS-HDR-PHONE` 의 계약서 §5 축약(4 상태) ≠ Kyu `decision-pos-ui-approval-20261124` 승인(6 상태) — 명세서는 **6 상태**를 정본으로 기록.

## 갱신 절차 (오케)

프롬프트 발부 전:

1. 건드릴 파일에 승인 요소가 있는지 `grep -l "<ID>"` 로 교차 확인. 있으면 이 명세서 행(Kyu 원문·현재 구현)을 읽는다.
2. 새 요청이 명세와 **부딪히면** 발부 전 Kyu 에게 "기존 `<ID>` 와 충돌 — 바꿀까/유지할까" 를 묻는다. 동의 나면:
   - Kyu 답을 `ledger/decision-*.md` 에 새로 적는다(기존 결정 폐기 금지 · 꼬리표 `supersedes:` 로 체인).
   - 이 폴더의 해당 행을 갱신(원문 · 승인일 교체 · 과거 원문은 "이력" 소절로 이동).
   - 그 다음 프롬프트를 발부.
3. 충돌 없는 소수정(테스트·리팩터·버그)은 묻지 않음.
4. 코딩 프롬프트의 `건드릴 파일:` 밑에 `보존 요소:` 줄 **필수**. 예: `보존 요소: POS-HDR-PHONE(6상태+버튼 3종) · SUCC-ASK-PHONE-DEL`. R0 리뷰는 이 줄을 기준으로 대조한다(프롬프트 대비만으로 판정 금지 — `decision-spec-guard-20261126.md:17`).

## 보존 테스트

각 요소 ID 는 자동 CI 체크 1개 이상을 가져야 한다. 이번 판에서는 **매핑만** 적는다(없는 것도 "없음"으로 표시). 보존 테스트 추가는 다음 라운드(`M1-1126-P` 결과 → 발부).

## 제약(이 판)

- **코드 수정 금지.** 조사·문서 전용. 코드 커밋이나 테스트 추가는 다음 라운드.
- 진행 중 PR(fork #275·#276 · storeport #457·#458) 의 변경 내용은 "진행 중" 으로 두고 **승인 원형만** 적는다(아직 Kyu 눈으로 들어간 화면이 아니기 때문).
- 모든 요소 출처 파일:줄 필수. 못 찾은 경우 `출처 미상` 으로 표시(가짜 줄 금지).

## 범위 (이 판)

POS 결제 흐름 + CD 상태. Admin(백오피스)·Inventory·Sales 리포트·Refund 흐름은 범위 밖 — 뒤 라운드.
