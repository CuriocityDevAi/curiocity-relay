storeport#484: APPROVE · CI 미확인 · 필수 0
명령: `gh pr view 484`, `gh pr checks 484`, `gh pr diff 484`, `gh pr view 482`, `Read pos-r0/lib/printer/receipt-escpos.ts:219-230`

## CI
heavy-mac = pending → CI 미확인. heavy-cloud = skipping. changes-filter/check/markers/route = pass.

## REQ 1 — diff · R1 중복
7 files · +173/-98 = 271줄. 원장 기대치 일치.
파일: receipt-snapshot.unit.spec.ts · mint-sale-receipt.ts · receipt-escpos-sample.txt · receipt-lines/{index,render-text,resolve-receipt-lines,parity.test} — 전부 M2-1127-N/P 순수분. R1(C·D) 중복 없음.

## REQ 2 — 품목 줄 직접 비교
기준: pos-r0 `lib/printer/receipt-escpos.ts:219-230`

fork 로직:
- `title = item.variant_title ? "${title} (${variant})" : title` → centerLinesAsLeft(wrap)
- `b.kv("  qty x IDR unit", IDR total)` — qty 왼쪽·total 오른쪽
- `b.kv("  Discount", "-IDR amount")` — 콜론 없음

#484 render-text.ts 로직:
- `titleFull = line.variantTitle ? "${title} (${variant})" : title` → wrap(titleFull, width) ✓
- `pad("  qty x Rp unit", Rp total, width)` ✓
- `pad("  Discount", "-Rp amount", width)` ✓

sample.txt 실측:
```
Chocolate Croissant (Regular)
  2 x Rp 16.500        Rp 33.000
Americano (Iced)
  1 x Rp 22.000        Rp 22.000
```
fork 구조 동일.

나머지 차이 — 타당:
| 항목 | fork | storeport | 이유 |
|------|------|-----------|------|
| Order | `Order #42` left | `Order  PIM26B1042` kv | custom_display_id + kv 정렬 |
| No./Date/Cashier | left-align | kv right-align | 32칸 kv 정렬 정책 |
| 통화 | IDR 95,000 | Rp 55.000 | 로케일 독립 |

구조 패리티(배너 순서·ITEMS 헤더 없음·CASH 대문자·초 없는 날짜·`-` rule만·합계 뒤 구분선) 모두 fork 일치.

## REQ 3 — #482
state: CLOSED · closedAt: 2026-11-27T14:08:56Z ✓

## 보존 요소
- QRIS tax.show 서버 수정(pos_totals 단일 출처) · mint-sale-receipt.ts pb1FromMeta 경로 유지 ✓
- Rp 16.500 포맷 ✓ · 라벨 영어 ✓

## PR 코멘트
https://github.com/CuriocityDevAi/storeport/pull/484 — COMMENT(자계정 APPROVE 제약) 1개 제출.
