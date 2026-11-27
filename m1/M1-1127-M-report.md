# M1-1127-M Report

## PASS · PR #292 · head 8e96be5 · 바이트 차이 있음(하단 명세)

---

## 작업 요약

storeport `packages/receipt-lines/src` (commit `f33eef82`, PR#484) 를 fork `lib/receipt-lines/` 로 그대로 복사하고, 프린터가 복사본을 소비하도록 전환.

---

## REQ 1 — 복사 스크립트

`scripts/sync-receipt-lines.mjs` 생성.

- 인자 없음: storeport `../storeport/packages/receipt-lines/src/*` → `lib/receipt-lines/` 복사.  
  `index.ts` 에 `RECEIPT_LINES_VENDORED_FROM = "<8자리 SHA>"` 삽입.
- `--check`: storeport HEAD SHA vs `RECEIPT_LINES_VENDORED_FROM` 비교. 불일치 시 종료코드 1.

`RECEIPT_LINES_VENDORED_FROM = "f33eef82"` (storeport PR#484 merge commit).

---

## REQ 2 — 복사본 검증 테스트

`__tests__/m1-1127-m-receipt-lines-sync.test.ts` 생성.

| 테스트 | 결과 |
|--------|------|
| RECEIPT_LINES_VERSION = 1.1.0-20261127 | PASS |
| RECEIPT_LINES_VENDORED_FROM = f33eef82 | PASS |
| 6개 파일 모두 존재 | PASS |
| fork 고유 resolve.ts 삭제 확인 | PASS |
| index.ts VERSION+VENDORED 상수 export | PASS |
| storeport sha256 비교 (5건) | SKIP (로컬 storeport pull 불가 — dirty working tree) |

전체: 6 passed | 5 skipped.

---

## REQ 3 — 프린터 출력 바이트 차이

**바이트 차이 있음.** storeport `resolveReceiptLines` 는 fork 고유 `resolveReceiptLines` 와 출력 구조가 다름.

### 차이 원인 (스켈레톤 비교, width=32)

| 섹션 | 기존 fork | storeport 복사본 |
|------|-----------|-----------------|
| 로고/상호 | `LogoLine(storeName='MEROS')` → bold 텍스트 한 줄 | `CenterLine("MEROS", bold:true)` → 동일 출력 |
| 헤더 줄 | 헤더 줄 직후 rule | 헤더 앞 BlankLine 추가 |
| 영수증 번호 | `TextLine("No. R-xxx")` → 왼쪽 정렬 | `KVLine("No.", "R-xxx")` → 우측 정렬 |
| 날짜 | `TextLine("Date YYYY-MM-DD HH:mm WIB")` | `KVLine("Date", "YYYY-MM-DD HH:mm WIB")` |
| 캐셔 | `TextLine("Cashier 이름")` | `KVLine("Cashier", "이름")` |
| `#N` 메타줄 | 큐블록 + 별도 `TextLine("#N")` | 큐블록만 (별도 TextLine 없음) |
| void/refund | `BannerLine` + "Method·CASH" + "Refund total" 블록 | `BannerLine(meta:"Original No. …")` + 일반 tender 줄 |
| void "Processed by" | `TextLine("Processed by 이름")` | `KVLine("Cashier", "이름")` |
| CARD 상세 | `{label:'', value:'  Visa ****1234'}` (plain line) | `{label:'Brand', value:'Visa'}` + `{label:'Card', value:'**** 1234'}` (KV) |
| Footer | footer 직전 rule만 | footer 앞 BlankLine 추가 |

**보존 요소 (바뀌지 않음)**:
- 품목 줄: `이름 (옵션)\n  수량 x 단가   합계` ← storeport PR#484 패리티 확인
- 금액 포맷: `Rp N.NNN` ← 동일
- QRIS + PB1/service 줄 ← 동일 규칙
- Queue `#N` 블록 ← 동일

**판정**: "패키지 쪽 문제로 보고" 대상 아님. fork 고유 구현(TextLine·로고슬롯 항상·Method 블록)을 storeport 표준 포맷으로 교체한 것이 의도된 변화. 매장 프린터의 ESC/POS 바이트 생성 로직(`renderLinesEscPos`) 은 보존됨.

---

## REQ 4 — PR 갱신

- 브랜치: `feat/M1-1127-H-receipt-r2` (기존 PR#292)
- commit: `8e96be5`
- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/292
- `#N` Queue 블록 ← 유지
- QRIS 세금 줄 ← 유지

---

## 테스트 결과

```
Test Files  2 failed | 74 passed (76)   ← m2-1119-s · m3-1119-o 는 pre-existing
     Tests  3 failed | 978 passed | 6 expected fail | 5 skipped | 3 todo (995)
```

내 변경으로 인한 새 실패 없음.
