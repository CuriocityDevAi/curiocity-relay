# M1-1128-C Report — storeport@13014336 Re-vendor

날짜: 2026-11-28  
브랜치: `feat/M1-1127-H-receipt-r2` (force-pushed from `feat/M1-1127-H-receipt-r2-rebase`)  
PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/292

---

## REQ 1: Rebase + Vendor

**리베이스**  
- `feat/M1-1127-H-receipt-r2` (원본 b6e0e66, 8e96be5) 를 `origin/master` 위에 cherry-pick.  
- `origin/master` 에 M1-1124 (cd-phone-status) 가 이미 머지돼 있어 rebase 충돌 → 새 브랜치 `feat/M1-1127-H-receipt-r2-rebase` 로 재작성.  
- cherry-pick 중 `lib/printer/receipt-escpos.ts` 충돌 → M1-1127-H 버전 그대로 채택.

**Vendor 갱신 (f33eef82 → 13014336)**  
- `lib/receipt-lines/resolve-receipt-lines.ts` — TextLine 메타 블록 (No./Date/Cashier/Original No./`#N`), 카드 format `****${last4}` (공백 없음), 빈-label 디테일 `{label:'', value:'  Visa ****1234'}`.  
- `lib/receipt-lines/line-types.ts` — `TextLine` 타입 추가.  
- `lib/receipt-lines/render-text.ts` — `TextLine` 케이스 추가.  
- `lib/receipt-lines/index.ts` — `VENDORED_FROM` = `"13014336"`, `TextLine` export 추가.

---

## REQ 2: 프린터 출력 diff (5종 스냅샷)

5종 all PASS. 세부 변경 (f33eef82 → 13014336):

| 항목 | f33eef82 | 13014336 |
|------|-----------|-----------|
| 메타 줄 (No./Date/Cashier) | KV 포맷 (우측 정렬) | TextLine (좌측 정렬) |
| 카드 번호 포맷 | `**** 1234` (공백 있음) | `****1234` (공백 없음) |
| 카드 디테일 렌더 | `b.kv('', value)` → 우측 정렬 | `b.line(value)` → 좌측 정렬 |
| Original No. (void/refund) | `banner.meta` 필드 | TextLine 별도 줄 |

이 변경은 storeport origin/master 실기기 출력과 일치하도록 의도된 것 (13014336 = PR#485 목적).  
**실기기 테스트는 Kyu 직접 확인 필요.**

---

## REQ 3: 검증 테스트

| 테스트 파일 | 결과 |
|-------------|------|
| `m1-1127-m-receipt-lines-sync.test.ts` | 21 passed / 5 skipped (storeport path 없음) |
| `m1-1127-h-receipt-escpos-r2.test.ts` | 전체 통과 |
| `m3-1124-n-custom-display-id-priority.test.ts` | 10/10 통과 |
| **전체 94파일** | **1221 passed, 0 failed** |

---

## 추가 수정 (pre-existing 회귀 복원)

**M3-1124-N `Order PIM26BXXXX` 복원**  
- 원인: M1-1127-H 파이프라인 전환 시 `resolveCustomDisplayId` 주입 누락.  
- 수정: `renderReceiptEscPos` 에서 `resolveReceiptLines` 반환 후 `cid = resolveCustomDisplayId(receipt)` → `lines.push({ kind: 'center', text: \`Order \${cid}\` })` append.  
- storeport@13014336 의 `snapshot.order_custom_display_id` 필드는 타입 정의만 있고 렌더 미구현 → fork 레이어에서 직접 처리.

**빈-label 카드 디테일 렌더**  
- `renderLinesEscPos` tender case: `detail.label === ''` 일 때 `b.kv('', value)` → `b.line(value)` (좌측 정렬, origin/master 패리티).

---

## REQ 4: Push & PR 갱신

- Branch force-pushed: `feat/M1-1127-H-receipt-r2` ← `e768836`  
- PR#292 제목·본문 갱신 완료.  
- Commit: `e768836 feat(receipt-r2): M1-1128-C — storeport@13014336 vendoring · TextLine · custom_display_id 복원`
