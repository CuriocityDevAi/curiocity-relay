---
round: M0-1105-G
pr:
  storeport: storeport#191
base_pr: null
superseded:
  - storeport#185 (M0-1105-C)
  - storeport#188 (M0-1105-E)
  - storeport#189 (M0-1105-F)
outcome: pos-stack-single-pr-pos-integration-green · main(be68f3c) 위에 C+E+F 세 커밋 clean cherry-pick · 로직 변경 0 · Unit 24/24 · Integration 9/9 · CI pos-integration PASS (1m51s)
kyu_checks: 1 (단일 머지 승인 대기)
ci_links:
  pos-integration: https://github.com/CuriocityDevAi/storeport/actions/runs/42216989322/job/127889563488
---

# M0-1105-G · 결제 스택 단일 머지 PR (C+E+F)

**일자**: 2026-11-06 · **허브**: M0 · **대상**: `apps/commerce-core/src/api/admin/pos/orders/**` + `src/modules/receipt/service.ts` + unit/integration specs + `docs/feature-map.yaml`.

**base**: `origin/main @ be68f3c` (#184 M0-1105-B + #187 M0-1105-D 머지 직후). 3 커밋 전부 **clean cherry-pick** (충돌 없음 — M0-1104-J-b/#183 위의 변경이라 #184 squash 분과 겹치지 않음).

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | main(be68f3c) 위에 C+E+F 하나의 브랜치로 rebase | ✓ (clean cherry-pick · 충돌 0) |
| 2 | 로직 변경 0 (기 승인 shape 유지) | ✓ |
| 3 | 새 PR 1건 (#191) · 제목 "feat(pos): C+E+F — authorize/fulfill fix · settings wiring · round + cleanup" | ✓ |
| 4 | #185·#188·#189 superseded 코멘트 + close | ✓ (3건 모두 close) |
| 5 | 통합 9/9 PASS | ✓ (로컬 + CI) |
| 6 | Unit 24/24 PASS | ✓ |
| 7 | 산출물 기동 BOOT OK + /health 200 | ✓ |
| 8 | CI pos-integration 그린 링크 | ✓ ([1m51s](https://github.com/CuriocityDevAi/storeport/actions/runs/42216989322/job/127889563488)) |

---

## 1. 포함 커밋

| 포함 | 커밋 | 내용 |
|---|---|---|
| **M0-1105-C** (ex #185) | `11d3ff2` | authorize 명시 · fulfill 방어 + helper inventory chain · updateOrders 500 승격 · Math.floor(이후 F에서 round) · pos-complete unused import 삭제. |
| **M0-1105-E** (ex #188) | `ee2672a` | POS Settings → 결제·영수증 wiring. tenders Math.floor 일관성 보강 + receipt header CRLF→LF 정규화. 통합 신규 #7~#9 (dp_percent fallback · tax show=false · receipt_header 3줄). tsconfig exclude 테스트 파일. |
| **M0-1105-F** (ex #189) | `68cd8c1` | Kyu 11-06 재결정 수용: `Math.floor → Math.round` (DP·할인 % 반올림) + authorize 실패 cleanup (`deletePaymentSessions` + `deletePaymentCollections`) + 통합 #2 에 "400 뒤 collection 0건" 어설션 + unit round edge 4건. |
| **chore** | `75b5f19` | feature-map-check 통과 위해 `pos-tenders-fulfill.files` 에 `integration-tests/pos/**` 패턴 추가 (CI `check` job 수정). |

---

## 2. 검증

| 체크 | 결과 |
|---|---|
| ⓐ Build (`pnpm --filter commerce-core build`) | Backend 10.00s · Frontend 21.68s · **PASS** |
| ⓒ 산출물 기동 (dist · `medusa start`) | `BOOT OK unknown :9996` + `Server is ready on port: 9996 – 2492ms` + `/health 200` |
| Unit 테스트 | **24/24 PASS** |
| Integration 테스트 (로컬) | **9/9 PASS** |
| CI `check` (feature-map) | **PASS** (12s · 신규 패턴 포함) |
| CI `pos-integration` | **PASS** (1m51s) ← [job log](https://github.com/CuriocityDevAi/storeport/actions/runs/42216989322/job/127889563488) |
| CI `changes-filter` | PASS |
| CI `markers-and-forbidden` | **fail** · 선행 레거시 (`apps/anchor/**` tauri 잔재 · Kyu Q3 (i) Android 삭제 정리 미완 · 본 PR 변경과 무관 · M3-1105-D 와 별도로 처리) |

### Integration 9/9 (CI + 로컬 동일)
```
✓ #1 cash tender captures a payment_collection
✓ #2 edc tender missing approval_code returns 400 · [M0-1105-F] 400 뒤 collection 0건
✓ #3 preorder with dp_percent=50 computes amount = total * 50/100
✓ #4 takeaway fulfill decrements inventory stocked_quantity
✓ #5 preorder fulfill transitions stage without inventory decrement
✓ #6 two tenders on one order create two payment_collections and aggregate
✓ #7 [M0-1105-E] settings dp_percent=30 + body.amount 없음 → amount = 30%
✓ #8 [M0-1105-E] settings show_tax_label=false → GET snapshot tax.show=false
✓ #9 [M0-1105-E] settings receipt_header 3줄 → GET snapshot header CRLF→LF
Tests: 9 passed, 9 total
```

---

## 3. 포함 파일 (cumulative diff vs main)

- `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` — authorize 명시 + updateOrders 500 승격 + DP Math.round + authorize 실패 cleanup.
- `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts` — inventory link 방어 + 빈 변형 폴백 + `metadata.inventory_item_id` 힌트 bridge.
- `apps/commerce-core/src/api/admin/register-sessions/[id]/pos-complete/route.ts` — unused import 제거.
- `apps/commerce-core/src/modules/receipt/service.ts` — `buildSnapshot` 에 `normalizedHeader` 삽입 + wiring JSDoc.
- `apps/commerce-core/src/modules/pos_settings/__tests__/preorder-dp-math.unit.spec.ts` — Math.round + half-up edge 4건.
- `apps/commerce-core/src/modules/receipt/__tests__/receipt-snapshot.unit.spec.ts` — show_tax_label=false 우선권 + CRLF→LF 정규화 + 빈 header 신규 3건.
- `apps/commerce-core/integration-tests/pos/helpers.ts` — takeaway 자동 inventory seed · preorder/delivery opt-in.
- `apps/commerce-core/integration-tests/pos/tenders.spec.ts` — scenario 9건 (#7~#9 wiring + #2 cleanup 어설션).
- `apps/commerce-core/tsconfig.json` — 테스트 파일 build exclude.
- `docs/feature-map.yaml` — `pos-tenders-fulfill.files` 에 `integration-tests/pos/**` 패턴 추가.

금지 영역 변경 **0** (`src/admin/**` · `medusa-config.ts`).

---

## 4. Supersedes (close 완료)

- #185 (M0-1105-C) → close + 코멘트 "Superseded by #191"
- #188 (M0-1105-E) → close + 코멘트
- #189 (M0-1105-F) → close + 코멘트

---

## 5. 산출물

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/191
- **브랜치**: `feat/m0-1105-g-pos-stack` (base = `main @ be68f3c`)
- **커밋**: `11d3ff2` (C) → `ee2672a` (E) → `68cd8c1` (F) → `75b5f19` (feature-map).
- **CI pos-integration PASS**: [actions/runs/42216989322/job/127889563488](https://github.com/CuriocityDevAi/storeport/actions/runs/42216989322/job/127889563488)

---

## 6. 다음 후보

- #191 머지 후 ADDENDUM-1104.md §1 자구 (현금 Pembulatan 줄 없음 · % 반올림) 확정 커밋 (현재 curiocity-relay 측에 F 리포트 내 포함).
- CI `markers-and-forbidden` 레거시 (`apps/anchor/**` tauri 잔재) 를 별도 라운드에서 정리.
- Admin UI "Receipt configuration" sub-page (tax label PBJT/PPN 선택 · receipt_footer · receipt_logo_mode) — Kyu 결정 대기.
