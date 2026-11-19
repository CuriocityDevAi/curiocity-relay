storeport #400 CHANGES · fork #208 CHANGES

# R0C-1119-W — 손님 화면 동기화 버그 2 PR 리뷰 (2026-11-19)

대상: storeport PR #400 (HEAD f05495d · base e6a31fc = main) · agilo-medusa-pos-fork PR #208 (HEAD ef43598 · base 2649e09)
허브 리포트: m3/M3-1119-O-report.md · PR 코멘트: storeport#400 issuecomment-7008000620 · fork#208 issuecomment-7008003929

## 실행 결과
| 대상 | 결과 |
|---|---|
| customer-display tsc / vitest | 0 / 201/201 |
| commerce-core unit | 539/539 |
| commerce-core tsc | **10 errors (base 0)** — Migration20261119000002 의 `@mikro-orm/migrations` import(resolve 불가) · OrderSnapshot DTO 에 qr_string/amount/display_id 없음 |
| IT cd-pos-screen-sync / checkout-snapshot | 3/3 · 7/7 (Migration20261119000002 적용됨) |
| fork tsc / vitest / lint | 14 = base 14 / 769 pass(기존 실패 1 파일 동일) / 0 errors |
| fork master+#207+#208 머지 | 충돌 없음 |
| CI #400 | core 잡 skipped (changes-filter queued) — core typecheck CI 미검증 |

## 스키마 대조
POS body `{register_session_id, pos_screen, seq, stage?, qr_string?: string, amount?: number}` ↔ 서버 route 파싱 일치. pos_screen enum(`paid`,`loyalty_entry`) 양쪽 존재. 한쪽만 배포 시 깨짐 없음(하위 호환 OK). fork 는 base 부터 qr_string 을 보내고 있었으므로 #400 단독으로도 QR 표시.

## 증상별
| # | 증상 | 판정 |
|---|---|---|
| 1 | 결제 진입 시 번호 입력 자동 | #208 로 해결 |
| 2 | Skip 없음 | 라벨 해결(#400). 단 결제 전 Skip = active snapshot expire → 결제 중 대기화면 / 반영 전 keypad 되튐(probe 재현) |
| 3 | QR 미표시 | #400 서버 저장으로 해결 |
| 4 | 완료/Products 후 QR 갇힘 | **미해결/회귀**: (a) `pos_screen=paid` 새 receipt 분기가 terminal 무시 → receipt↔keypad-after 무한 루프(probe 재현) (b) #208 paid emit 이 tender-qris cleanup 의 `checkout_review` hint(더 큰 seq)에 덮일 가능성 높음 (c) 웹훅 paid 경로는 서버 ③ guard 가 Products idle 을 버려 Next customer 전까지 갇힘 그대로 |
| 5 | Rp NaN | 해결 (line_total→total) |
| 6 | 내부 주문 ID | 해결 (display_id) |
| 7 | 제목·언어칩 겹침 | 부분 — storeName/orderNo 끼리만. GlobeMenu(absolute top-right) 여백 없음 (코드 판독) |

## 고칠 것
storeport #400: ① migration import → `@medusajs/framework/mikro-orm/migrations` · DTO 필드 추가(core tsc 0) ② receipt 분기는 non-terminal 일 때만 ③ paid 있어도 idle/cart_building(더 큰 seq) 수신 시 paid expire → 대기 + IT ④ 결제 전 Skip 은 expire 대신 skipped_at, 같은 snapshot loyalty_entry 재수신 시 cart 유지 ⑤ QRIS header GlobeMenu 여백 + responsive e2e
fork #208: ① success 마운트 paid 를 `setPosScreenHint({pos_screen:'paid', freezeCart:true})` 로 단일 채널화, 해제는 Next customer/언마운트 ② #400 Skip 수정과 함께 실기

## M2 충돌
#207 과 success/[orderId].tsx 공동 수정이나 hunk 분리 · 3-way 머지 clean. 다만 위 fork 수정 ①은 #207 의 onNextCustomer 와 같은 파일이라 #207 먼저 착지 후 rebase 권장.

금지 준수: PR push·머지 없음 (코멘트만).
