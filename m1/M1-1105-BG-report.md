# M1-1105-BG 리포트

## 충돌 해소
- `package.json` conflict: HEAD(`test:flows` + `test:watch`) vs master(`test:watch` + `refresh`) → 셋 모두 보존
- `git merge origin/master --no-edit` → 머지 커밋 `f8a2cda` → mergeable ✓

## 이동한 함수

| 함수 | 이전 위치 | 새 위치 |
|------|-----------|---------|
| `buildSplitBody` | `app/checkout/split-tender/[draftOrderId].tsx:119` (클로저 인라인) | `lib/split-tender.ts:1` (export 순수 함수) |
| `deriveGrandTotal` | `tests/flows/screen-calcs.test.ts:83` (로컬 복사본) | `lib/order-totals.ts:1` (export 순수 함수) |
| `deriveOutstanding` | `tests/flows/screen-calcs.test.ts:91` (로컬 복사본) | `lib/order-totals.ts:10` (export 순수 함수) |

앱·테스트 모두 같은 함수를 import — 로컬 복사본 삭제 완료.

## 뮤테이션 로그

### 뮤테이션 1 — `split:true` 제거
```
lib/split-tender.ts: split: true as const 제거
→ Test Files  1 failed | 3 passed (4)
→ Tests  5 failed (split tender body 4조합 + it.fails 1개 반전)
✓ 감지됨
```

### 뮤테이션 2 — `grandTotal = orderTotal` (pos_totals 무시)
```
lib/order-totals.ts: posTotals?.grand_total ?? orderTotal → orderTotal
→ Test Files  1 failed | 3 passed (4)
→ Tests  1 failed (pos_totals.grand_total 있으면 그것 사용)
✓ 감지됨
```

## 테스트 결과

### npm run test:flows (복원 후)
```
Test Files  4 passed (4)
Tests  46 passed | 6 expected fail (52)
```

### node scripts/run-all.mjs assertions
```
총 46 개 · 46 PASS · 0 FAIL
(m2-1105-ar-assertions.mjs: lib/split-tender.ts 허용하도록 assertion 갱신)
```

## Mergeable
- BE 브랜치(`test/m1-1105-be-flow-e2e` = #105): origin/master 머지 완료 → 충돌 없음 → mergeable ✓
- BF 브랜치: 새 BE 위로 rebase 완료 → push ✓

## 이연 항목
없음. `app/orders/[orderId].tsx` M3 작업(PR #106 `chore/m3-1105-az-cleanup`)은 line 870(handedOver 조건)만 수정 — `grandTotal/outstanding` 구간(line 221-229)과 비충돌 → 추출 완료.

## 착지 명령
```
cp /tmp/M1-1105-BG-report.md ~/projects/curiocity-relay/m1/ && cd ~/projects/curiocity-relay && git add m1/M1-1105-BG-report.md && git commit -m "m1: M1-1105-BG" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M1-1105-BG done "충돌 해소 · buildSplitBody/deriveGrandTotal·Outstanding lib 추출 · 뮤테이션 2종 감지 · 46/46 assertions · BF rebase"
```
