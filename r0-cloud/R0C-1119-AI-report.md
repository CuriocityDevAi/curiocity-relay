storeport #403 CHANGES · fork #207 CHANGES · fork #208 CHANGES

# R0C-1119-AI — 분할결제 슬립 3 PR 함께 리뷰 (2026-11-19)

push·머지 없음. PR 코멘트:
- storeport #403 issuecomment-7012703161 (HEAD dc8fe8e)
- fork #207 issuecomment-7012706658 (HEAD 4dae9df)
- fork #208 issuecomment-7012709785 (HEAD 217b695)

## A. storeport #403 — CHANGES

| 확인 | 결과 |
|---|---|
| `bash scripts/it.sh tenders` (직접 실행) | 98/98 pass (#72 · #73 통과) |
| core tsc | 0 |
| 커밋 섞임 (origin/main..HEAD) | 3e250ff · dc8fe8e 2개만 · #400 커밋 0 |
| 최상위 header/footer/logo_mode/tenders | O |

AF 지적 (IT 실패 · 커밋 섞임)은 해소됨.

남은 문제:
- QRIS POST 응답에 `at` 없음. QRIS 는 short-circuit(1077행) 응답으로 먼저 반환되는데, `at` 은 일반 응답(1592행)에만 추가됨.
- Cash→QRIS 처럼 QRIS 로 끝나면 완료 snapshot 은 xendit webhook 의 별도 복사본이 만듦.
  - 그 복사본: `at = captured_at ?? at`, reference_no 는 qris_receipt_id 우선, xendit_payment_id 추가
  - quote: `buildTenderEntry` 사용 → `at` = QR 생성 시각, reference_no = 원값
  - 그래서 quote.tenders ≠ snapshot.tenders. 결제가 1분 넘게 걸리면 Time 이 다르고, sandbox 에서는 Ref 도 다름
- IT #73 은 card 만 검사함

고칠 것:
1. QRIS 응답에 `at` 추가
2. webhook snapshot 도 공통 빌더 사용
3. Cash→QRIS(webhook) 일치 IT 추가

## B. fork #207 — CHANGES

방법 (AG 와 같음):
- `expo export -p web` + Playwright
- Cash→QRIS 흐름을 #403 모양으로 mock: quote 최상위 header·tenders · cash POST at · QRIS POST 는 pending 응답 · 완료 snapshot 은 webhook 모양
- 결제 중 슬립과 완료 슬립의 innerText 비교

| 슬립 | #403 있음 | #403 없음 (폴백) |
|---|---|---|
| Slip 1 Cash | **같음** (머리글 3줄 · Time · Received/Change) | 머리글 없음 · 깨짐 없음 |
| Slip 2 QRIS | 머리글 같음 · **결제 중 화면에 Ref 줄 없음** (완료 화면은 `Ref QR-2611190002`) · Time 은 결제 중 = 기기 시계, 완료 = captured_at | 머리글 없음 + Ref 없음 |

- 원인: 2차 QRIS 를 `qris_receipt_id: null, reference_no: null` 로 고정함. 1차 QRIS 는 pending POST 응답에 qris_receipt_id 가 없어서 Ref 가 항상 생략됨 (코드 판독). Kyu 원문 미충족.
- 스크린샷: `R0C-1119-AI-slip2-inprogress.png` / `R0C-1119-AI-slip2-complete.png`
- 버튼 ② 회귀 없음 · vitest 805 pass (splitview-capture 1 file 은 원래 실패) · CI assertions X (m3-1105-aa · AG ④ 미반영)

고칠 것:
1. paid 이후 Ref 와 Time 을 서버 값으로 다시 읽기 (quote.tenders 또는 qris-status)
2. aa assertion 갱신

## C. fork #208 — CHANGES

`POST checkout-snapshot` 기록 (단일 QRIS → Check payment → success):

| 빌드 | 전송된 emit |
|---|---|
| 741ab8c (직접 emit) | cart_building → **paid** |
| 217b695 (이 PR) | cart_building 만 · **paid 0건** |

- 원인: autoEmit 은 order_id 를 현재 draft 에서 가져옴. tender POST 성공 시 `onSuccess` 가 draft_order_id 를 지움 → success 화면에서는 order_id=null → `postEmit` 이 버림. 결과적으로 손님 화면이 QR 에 남음 (W 증상 4 그대로).
- cleanup 차단과 해제는 코드상 맞음. 하지만 새 테스트 9개는 인라인으로 다시 만든 store 를 검사하므로 이 문제를 못 잡음.
- 충돌: master+#207(4dae9df)+#208 머지 clean · vitest 814 pass. 단 #208 이 반영한 #207 은 fe1cea9 (AA 이전). CI assertions X.

고칠 것:
1. hint 에 order_id 넣기 → autoEmit 이 `hint.order_id` 를 먼저 사용
2. 실제 hook 으로 테스트 추가
3. #207 최신으로 다시 머지

## 환경 메모
- Playwright 1254 브라우저가 없음 → `launchOptions.executablePath` 로 /opt/pw-browsers 의 1243 headless_shell 사용
- e2e draft fixture 는 status=open 이라 앱 기동 시 폐기됨 → probe 에서 status=draft 로 바꿔 사용
