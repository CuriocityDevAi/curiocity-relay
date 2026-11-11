# R0-1105-BP 리포트 — fork PR #93 · 나눠 결제 영수증 (M1-1105-AV)

## 판정: APPROVE

---

## 검증 표

| # | 항목 | 결과 | 비고 |
|---|---|---|---|
| 1 | 나눠 결제 Sale — 수단 두 줄 (화면·ESC/POS) | ✅ | `tenders.map` / `for` loop · CASH + CARD 각 줄 |
| 2 | Sale — 현금 받은돈/거스름돈 | ✅ | Received IDR 50,000 · Change IDR 0 |
| 3 | Sale — 카드 끝4자리/승인번호 | ✅ | `VISA ****5678` · `APPROVAL SPLIT1` |
| 4 | Sale — 합계 = 주문금액 | ✅ | tenderSum 100,000 = grand_total 100,000 |
| 5 | Void/Refund — 메타 블록 현금 먼저 (S3) | ✅ | CASH 50,000 → CARD TERMINAL 50,000 → Refund total -100,000 |
| 6 | Void/Refund — 단일 tender 기존 동작 유지 (회귀 0) | ✅ | REG1~REG3 (11 assertions) 전부 pass |
| 7 | fixture — storeport #212 응답 모양 | ✅ | `_source:"storeport #212"` 명시 · tenders[] 음수 amount · ReceiptTender[] 타입 |
| 8 | ESC/POS 32자 줄바꿈 | ✅ | 모든 줄 max 32자 (W1·W2 assertion + awk 직접 확인) |
| 9 | 스샷·ESC/POS 덤프 PR 브랜치 커밋 여부 | ✅ | 커밋 125aa9f 포함 (#91·#92 /tmp 사례 미반복) |
| 10 | 어설션 실행 | ✅ | 34/34 passed · 0 failed |
| 11 | run-all 신규 실패 0 | ✅ | 36개 중 33 PASS · 3 FAIL (기존 m3-1105-d/ad/ae 동일) |
| 12 | UI 영어 | ✅ | CASH · CARD TERMINAL · Refund total — 한국어 없음 |
| 13 | D1 (debug/TODO/raw hex) | ✅ | console/debug/FIXME/raw hex 없음 |
| 14 | raw hex 0 | ✅ | assertion R4a pass |
| 15 | node: import 0 | ✅ | 6개 import 전부 `node:` prefix 사용 |

---

## 실행 로그

### 어설션 (브랜치 파일 체크아웃 후 실행)

```
=== 나눠 결제 Sale (Cash 50,000 + Card 50,000) ===
  ✓ (W1a) 모든 줄 ≤ 32자 (58mm)
  ✓ (S1a) CASH 줄 존재
  ✓ (S1b) CARD 줄 존재
  ✓ (S1c) tender 2개 모두 렌더 (CASH + CARD)
  ✓ (S2a) CASH IDR 50,000
  ✓ (S2b) Received IDR 50,000
  ✓ (S2c) Change IDR 0
  ✓ (S3a) CARD IDR 50,000
  ✓ (S3b) card_last4 "VISA ****5678"
  ✓ (S3c) approval_code "APPROVAL SPLIT1"
  ✓ (S4a) fixture tenderSum === grand_total
  ✓ (S4b) TOTAL IDR 100,000 렌더
  ✓ (S4c) raw hex "?" 없음

=== 나눠 결제 Refund ===
  ✓ (W2a) 모든 줄 ≤ 32자
  ✓ (R1a) "*** REFUND ***" 배너 노출
  ✓ (R1b) 원 영수증 번호 "Original No. R-261111-0001"
  ✓ (R2a) 메타 블록 CASH IDR 50,000 존재
  ✓ (R2b) 메타 블록 CARD TERMINAL IDR 50,000 존재
  ✓ (R2c) CASH 가 CARD TERMINAL 보다 먼저
  ✓ (R3a) fixture refundTotal === 100,000
  ✓ (R3b) "Refund total -IDR 100,000" 렌더
  ✓ (R4a) raw hex "?" 없음
  ✓ (R4b) ESC/POS cut 명령 포함

=== 단일 tender 회귀 ===
  ✓ (REG1a~REG1d) sale 회귀 없음
  ✓ (REG2a~REG2d) void Method CARD TERMINAL (단일 tender)
  ✓ (REG3a~REG3c) refund Method CASH (단일 tender)

34/34 passed · 0 failed
```

### run-all

```
총 36개 · 33 PASS · 3 FAIL · 34.7s
실패 (기존 미해결):
  - m3-1105-ad-assertions.mjs (exit 1)
  - m3-1105-ae-assertions.mjs (exit 1)
  - m3-1105-d-assertions.mjs (exit 1)
```

신규 실패 0 — M1 보고서 이연 목록과 동일.

---

## 이연 순증감

- 본 PR 추가 이연: **0개**
- 기존 미해결 (변동 없음): m3-1105-d (3개) · m3-1105-ad (2개) · m3-1105-ae (1개)
- 순증감: **±0**

---

## 착지 명령

```
cp /tmp/R0-1105-BP-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-BP-report.md && git commit -m "r0: R0-1105-BP" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-BP done "APPROVE — 나눠 결제 영수증 화면·ESC/POS 수단 두 줄·현금 먼저 · 34/34 · 신규 실패 0"
```
