storeport #403 APPROVE (HEAD e5c23f8) · 경쟁 상태 1건 → fork #207 쪽 대응 필요

# R0C-1119-AM — storeport #403 재리뷰 (2026-11-19)

push·머지 없음. PR 코멘트: storeport #403 issuecomment-7014205153

## 실행
| 확인 | 결과 |
|---|---|
| `bash scripts/it.sh tenders` (직접 실행 · Postgres 로컬) | 99/99 pass (#72 · #73 · #74) |
| core tsc (`apps/commerce-core`) | 0 |
| 커밋 (origin/main..HEAD) | 3e250ff · dc8fe8e · e5c23f8 |

## quote.tenders[i] == snapshot.tenders[i] (임시 IT 4건 · 커밋 안 함 · 키·값 깊은 비교)
| 시나리오 | 결과 | 비고 |
|---|---|---|
| Cash→QRIS (webhook · receipt_id=RCPT-R0-A · 1.2s 지연) | 일치 | qris at = captured_at (QR 생성 +1.35s) · Ref = RCPT-R0-A |
| QRIS→Cash | 일치 | Ref = RCPT-R0-B |
| QRIS 단독 (receipt_id 없음) | 일치 | Ref = reference_id · xendit_payment_id 별도 필드 |
| card 단독 | 일치 | brand/rrn/tid/mid null 동일 |

- QRIS POST short-circuit 응답: at · qris_receipt_id(null) · reference_no 있음.
- 하위호환: receipt_id 가 없으면 snapshot.reference_no 가 이전 xendit_payment_id 에서 reference_id 로 바뀜. fork renderer 는 xendit_payment_id 필드를 먼저 쓰므로("Xendit ID") 보이는 값은 그대로. 비차단.

## 경쟁 상태 (#207 M2-1119-AC 에 꼭 반영)
- qris-status 가 `captured` 를 돌려주는 경우는 두 가지:
  1. DB session 이 captured 상태임 (webhook 6단계 authorize/capture 이후)
  2. Xendit 원격 상태가 paid 임 (webhook 이 아직 오기 전에도 가능)
- 둘 다 webhook 7a(metadata.tenders patch)보다 앞설 수 있음. quote 는 order lock 을 걸지 않음.
- 실측: webhook 전에 받은 quote 의 QRIS 항목 = at QR 생성 시각 · Ref order_…:2:… · qris_receipt_id/xendit_payment_id 둘 다 null. 이 값은 snapshot 과 다름.
- quote 항목에 `status` 가 없어서 클라이언트가 pending 인지 구분할 수 없음.
- 대응: 마지막 tender 가 QRIS 이면 Slip 2 는 완료 snapshot(receipt_id) 기준으로 덮어야 함. QRIS 가 먼저인 경우(QRIS→Cash)는 Cash 완결 전에 patch 가 끝나므로 안전.
- 서버에서 막고 싶으면 후속 PR 후보: quote 에 tender status 또는 receipt_id 노출.

## 범위 밖 (기존 동작)
- 만료된 QRIS tender(status=expired) 가 quote 와 snapshot 양쪽에 똑같이 남음. 일치 계약은 깨지지 않음.
- cash split 에서 received 60000 / amount 50000 인데 change=null (양쪽 동일).

## 환경 메모
- Postgres 비밀번호가 기본값이 아니라 it.sh 99건이 전부 실패함 → `ALTER USER postgres PASSWORD 'postgres'` 후 정상 실행.
