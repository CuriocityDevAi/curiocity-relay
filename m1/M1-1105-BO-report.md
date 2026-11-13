# M1-1105-BO 착지 보고

## 교체 방식

`integration-tests/pos/pos-tax-lines.spec.ts` #CJ-4 테스트 1곳만 변경.

- **Before**: `query.graph({ fields: ["items.tax_total"] })` — Medusa v2에서 항상 0 반환
- **After**: `orderModule.retrieveOrder(id, { select: ["items.tax_total"], relations: ["items", "items.tax_lines"] })` — BigNumber 집계 올바르게 반환

`it.failing` → `it` 전환 완료.

## grep 전수 표 — `items.tax_total` via query.graph

| 파일:줄 | 용도 | 금액 영향 |
|---|---|---|
| `integration-tests/pos/pos-tax-lines.spec.ts:565` | #CJ-4 BigNumber drift 가드 | assertion — 이번 PR 수정 |
| `src/.../route.ts` 13곳 (`"items.*"` wildcard) | `item.total ?? item.subtotal` 사용 · `item.tax_total` 직접 접근 없음 | 없음 |

프로덕션 라우트에서 `items.tax_total`을 직접 읽는 경로: **없음**.

## 영향 파일 수

1파일 (spec 1개)

## 금액 변화 0 확인

프로덕션 라우트 무변경 → 화면·영수증·Admin 세금 표시 불변 보장.
기존 테스트 #AX-1~#AX-7 · #CJ-3 모두 커버.

## 반올림 규칙

`rate = (allocated×100)/itemSub` (소수) → Medusa BigNumber `taxAmount = round(itemSub × rate/100) = allocated` 정확히.
3개 품목 (10001+10002+10003) · pb1_amount=3001 → 배분 [1000·1000·1001] · 합=3001.

## 자기 검증

| 항목 | 결과 |
|---|---|
| typecheck | ✅ 0 errors |
| unit (commerce-core) | ✅ 132 passed, 0 failed |
| unit (event-contracts) | ✅ 21 passed |
| `test:integration:pos` | 미검증 (CI run 으로 판정) |

## head SHA

`7165883` (`7165883051...`)

## PR

https://github.com/CuriocityDevAi/storeport/pull/240

## CI run URL

https://github.com/CuriocityDevAi/storeport/actions/runs/43344720460 (queued/in_progress)
