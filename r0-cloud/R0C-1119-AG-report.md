fork #207 CHANGES

# R0C-1119-AG — fork #207 3차 리뷰 (2026-11-19)

- head fe1cea9 (M2-1119-Y)
- 코멘트: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/207#issuecomment-7011512736
- push·머지 없음

## ② 주문 상세 버튼 — 충족 (expo export -p web + Playwright · /orders/:id · 버튼 7개)

| 폭 | 줄 배치 | 잘림 | 글자 두 줄 | Done |
|---|---|---|---|---|
| 360 (줄 폭 328) | Reprint·Share·Hand over / Void·Refund / Link customer·Done | 0 | 0 | 3번째 줄 남은 폭 164px |
| 600 | 5개 / Link customer·Done | 0 | 0 | 404px |
| 1024 | 7개 한 줄 | 0 | 0 | 320px (오른쪽 끝) |

스크린샷: `R0C-1119-AG-orders-{360,600,1024}.png`

## ① 슬립 동일성 — 미충족

- 방법: split Cash→QRIS 흐름을 실제 서버 응답 모양으로 mock 해서 진행
  - quote = #401 모양 (store {id,name,logo_url} + **최상위** header/footer/logo_mode/tenders)
  - tenders POST 응답에는 `at` 없음 (실제 route 와 같음)
  - snapshot.tenders[].at = tender 를 만든 시각
  - QRIS snapshot = qris_receipt_id·xendit_payment_id·reference_no(=reference_id)
- 결과 (#401 모양 / #401 없음 둘 다 같음)
  - Slip 1 Cash: 결제 중 화면에 머리글 3줄 없음 (완료 화면에는 있음). 나머지 줄은 같음
  - Slip 2 QRIS: 머리글 없음 + Ref 다름 (결제 중 `pr_split_qris_e_02` / 완료 `QR-2611120002`)
  - 로고는 두 화면 모두 표시
  - Time: 같은 분으로 일치. 단, 결제 중 화면은 tender.at 이 없어서 기기 시계를 씀 (nit)
- 원인
  - 클라이언트는 `quote.data.store.header` 를 읽음 (split-tender :471)
  - #401 은 quote 응답 최상위 `header` 로 보냄 → 필드 위치가 달라서 두 PR 이 맞물리지 않음
  - Ref: 결제 중은 payment_request_id 를, 완료는 qris_receipt_id 를 먼저 씀
  - #401 quote.tenders 의 qris 항목에도 qris_receipt_id 가 빠져 있음
- PR 의 e2e fixture 가 실제 서버 모양과 다름
  - quote 에 store.header 를 추가
  - receipt 에서 qris_receipt_id 를 지우고 reference_no 를 pr_… 로 바꿈
  - 그래서 M2-1119-Y-slip-identity spec 이 통과하는 것. 주문 상세 spec 은 화면이 없으면 skip 되는 구조
- #401 미배포 폴백: 화면이 깨지지 않음 · 머리글만 없음 (현재 운영 상태 = Kyu 지적 그대로)
- 스크린샷: `R0C-1119-AG-slip2-inprogress.png` / `R0C-1119-AG-slip2-complete.png`

## 검증

| 항목 | 결과 |
|---|---|
| vitest | 800 pass · splitview-capture 1 file 실패 (원래 있던 것) |
| tsc | 14 = master (신규 0) |
| lint | 0 error |
| CI lint | O |
| CI flow-tests | O |
| CI assertions | X — `m3-1105-aa` "SuccessReceiptAnim 보조 버튼 flex-row" 검사. className→style 변경 때문 (master 는 통과) |
| CI playwright | skip |

## 고칠 것

1. header 를 한 곳으로 맞추기 (클라이언트가 `quote.data.header` 를 읽거나, #401 이 `store.header` 로 보내기)
2. QRIS Ref 를 완료 화면과 같은 값으로 (paid 이후 qris_receipt_id 를 받아 쓰기 · 두 화면이 같은 우선순위 쓰기)
3. fixture 를 실제 서버 모양으로 되돌리기
4. aa assertion 갱신
