storeport#482: CHANGES · 필수 2 · 권고 0 · CI 미확인

직접 돌린 명령:
- `gh pr view 482 --json number,title,state,headRefName,commits`
- `gh pr checks 482` → no checks reported
- `git log --oneline origin/feat/M2-1127-J-receipt-lines`
- `git log --oneline origin/main | head -10`
- `gh pr list --state merged --limit 10`
- `git diff --stat origin/main...origin/feat/M2-1127-J-receipt-lines`
- `git diff --name-only origin/main origin/feat/M2-1127-J-receipt-lines`
- `git show origin/feat/M2-1127-J-receipt-lines:docs/testing/receipt-escpos-sample.txt`
- `cat agilo-fork-test/docs/testing/receipt-escpos-sample.txt`
- `Read agilo-fork-test/lib/printer/receipt-escpos.ts` (lines 160-310)
- `git show .../parity.test.ts`, `render-text.ts`, `resolve-receipt-lines.ts`
- `git show .../mint-sale-receipt.ts` (branch + main 비교)
- `grep pos_totals/pb1/sc_pct tenders/route.ts`
- `grep tax/pb1 receipt/service.ts`
- `sed -n 700,740p xendit/route.ts`

---

## CI
no checks reported — CI 미확인.

---

## 필수 1 · 브랜치 재사용 오염

`feat/M2-1127-J-receipt-lines`가 #475 squash-merge 후 재사용됨.
3-dot diff 2330줄 중 실제 M2-1127-N 신규 코드는 ~170줄.
나머지 ~2160줄은 이미 main에 있는 M2-1127-C(#470), M2-1127-D, M2-1127-J R1(#475) 중복분.

| 출처 | 대표 파일 | 규모 |
|---|---|---|
| M2-1127-C (#470 이미 main) | `scripts/spec-guard-cd-audit.mjs` 등 | ~500줄 |
| M2-1127-D (이미 main) | `OrderListScreen.tsx`, `cd-sync-flow.spec.ts` 등 | ~40줄 |
| M2-1127-J R1 (#475 이미 main) | `packages/receipt-lines/` 전체, `pnpm-lock.yaml` | ~1700줄 |

→ 필수: main 위 새 브랜치에 M2-1127-N 2커밋만 담아 PR 재작성.

---

## 필수 2 · 품목 줄 형식이 fork renderer와 다름

fork `receipt-escpos.ts:224`:
```
ItemName (Variant)
  qty x IDR unit      IDR total   ← kv: total 우측 정렬
```

storeport 황금 샘플:
```
ItemName               Rp total   ← kv: total이 품목명 줄에
  (Variant)
  qty x Rp unit                   ← total 없음
```

`render-text.ts:renderItem`이 `pad(title,total)` → variant 별도 줄 → qty 줄 순서.
fork는 `title+variant 통합` → `  qty×unit   total(kv)` 순서.

`parity.test.ts`는 황금 샘플과의 일치만 검증 — 황금 샘플 자체가 fork 출력과 다름.
`resolve-receipt-lines.ts` 주석 "분기·순서·문구를 그대로 옮긴다"가 품목 형식에선 성립 안 함.

→ 의도적 차이면 preserved differences 표에 추가 + 주석 수정 필요.
  아니면 `renderItem` 수정 후 황금 샘플 갱신 필요.

---

## 확인 OK · QRIS tax.show / Cash·split·void 부작용

- `tax.show` 판단 경로(`pb1_pct>0` or `show_tax_label&&tax_label`)는 미수정 → 무영향.
- PB1 금액 출처: `settings.pb1_amount → pos_totals.pb1`(tenders route 계산값). Cash·QRIS·split 모두 tenders route가 `pos_totals.pb1`을 설정하므로 단일 출처 전환 정상.
- SC 추가 표시(Cash 포함): 의도된 Cash↔QRIS 동기화. 회귀 아님.
- void: `mint-sale-receipt.ts`(kind=sale) 외부 경로 → 무영향.
- 세전 품목 금액(`it.subtotal` 우선·`unit_price×qty` 폴백): 미변경.
