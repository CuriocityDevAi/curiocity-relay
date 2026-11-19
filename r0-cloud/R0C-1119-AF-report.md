storeport #400 CHANGES · storeport #401 CHANGES · storeport #399 APPROVE

# R0C-1119-AF — 클라우드 리뷰 3건 (2026-11-19)

push·머지 없음. PR 코멘트:
- #400 issuecomment-7011264137
- #401 issuecomment-7011267086
- #399 issuecomment-7011268840

## A. storeport #400 (4차 · HEAD 113c8cf) — CHANGES

| 대상 | 결과 |
|---|---|
| customer-display tsc / vitest | 0 / 213/213 |
| commerce-core tsc | 0 |
| IT cd-pos-screen-sync / checkout-snapshot / cd-snapshot-skip | 5/5 · 7/7 · 7/7 |

AE probe 재실행 (nextScreen 를 이어서 호출):

| 시나리오 | 결과 |
|---|---|
| 번호 없이 결제 → receipt → keypad-after → Skip/timeout → done → DONE_TIMER → main · 같은 paid 5틱 유지 | O |
| pre_entry 결제 → receipt → done → DONE_TIMER → main 유지 (Products 빈 장바구니 → 대기) | O |
| 새 손님 cart_building(새 id) → 1틱 후 cart → 결제 시 receipt | O |
| W/AB 회귀 (Next customer idle · 지연 Skip · LateLink) | O |
| **keypad-after → OK → consent → Agree/Decline → receipt → RECEIPT_DONE** | **X — keypad-after 로 되돌아감** |

원인: 결제 후 link-phone(`linkCustomerToOrder`) 은 snapshot `receipt.phone_masked` 만 갱신하고 `pre_entry`/`customer_phone` 은 그대로. RECEIPT_DONE 규칙 A 가 pre_entry 만 보고 판단하므로 keypad-after 로 보냄 → 번호 등록·동의 후 키패드가 다시 뜸. AE (a) "OK → consent → receipt/done" 미충족.

고칠 것 (CD 만): keypad-after 에서 온 consent(또는 receipt 를 이미 본 paid snapshot)는 Agree/Decline 후 receipt → done. 단위 테스트 1개 추가.

nit (후속): keypad timeout 의 skippedSnapshotId 잔류 · AppState resync loyalty_entry 재전송 (AE 그대로).

## B. storeport #401 (HEAD 253b8ec) — CHANGES

- 코드는 맞음: quote 와 tenders route 가 같은 설정(`getForLocation(md.stock_location_id)`)을 읽음 · header 정규식은 `buildSnapshot` 과 같음 (공용 함수는 아니고 복사본) · 필드 추가만 → 하위 호환 · tenders 는 method 별 화이트리스트 · `/admin/*` (admin 인증) 만 → 새 노출 없음 · core tsc 0.
- **IT #72 실패**: tenders.spec 96/97 · 400 `edc_manual: approval_code must be exactly 6 digits` (fixture "APPR-001"). header 일치 단언이 실행되지 않음. M1 리포트의 "IT 1/1" 은 사실이 아님. 로컬에서 "123456" 으로만 바꾸면 97/97 · `quote.header === snapshot.header` 통과.
- **#400 커밋이 섞임**: base=main 인데 #400 의 f05495d · dfad959 · 45fd216 포함 (113c8cf 없음). 먼저 머지하면 CHANGES 받은 CD 코드가 main 에 들어감.
- 고칠 것: ① #72 approval_code 6자리 숫자 ② 253b8ec 만 main 위로 rebase (또는 base=#400 브랜치).
- nit: header 정규화 공용 함수화 · store.name 미설정 시 quote=null vs snapshot="".

## C. storeport #399 (HEAD 7f06ba9) — APPROVE

| 확인 | 결과 |
|---|---|
| CD icon.png M (CUSTOMER 글자 줄 제외) | 385×481px |
| fork master (fab03c4) POS icon M | 513×641px |
| 비율 | 높이 75.0% · 폭 75.0% |
| pos-icon-ref.png == fork master icon.png | 바이트 동일 |
| splash.png · receipt-anim.png vs origin/main | 동일 |
| gen-icons.mjs 리포 밖 경로 | 없음 (CD_ROOT/assets 만) |
| CI | pos-integration 외 전부 success · pos-integration 코멘트 시점 queued |

후속: 주석 기준 SHA 9216605 → fork master 로 수정 · 안 쓰는 후보 PNG(≈560KB) 정리 여부.

## 환경 메모
- 로컬 Postgres 는 `ALTER USER postgres PASSWORD 'postgres'` 후 it.sh 통과 (기본 상태는 password auth 실패).
