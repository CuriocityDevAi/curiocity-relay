# R0-1105-BZ 리뷰 리포트 — storeport #220 · Admin Stock cleanup 페이지 · M2-1105-AQ

**날짜**: 2026-11-12  
**판정**: **APPROVE** — 안전 조건(REQ 1) 충족, 동작 변경 없음(REQ 2), Admin 패턴 정확(REQ 3), #221 충돌 없음(REQ 4). REQ 5 스샷 미첨부는 최초 운영 클릭 시 Kyu 직접 확인으로 대체.

---

## 검증 표

| REQ | 항목 | 판정 | 증거 file:line |
|---|---|---|---|
| 1 | pending 예약 제외 | ✓ | `route.ts` step 3 — `info.status ∉ {completed,canceled}` ∧ `fulfillment_stage ≠ hand_over` → `stale=false → continue`. 테스트: `stock-cleanup.spec.ts:51` `foundInCandidates === false` |
| 1 | info==null 고아 경로 | ⚠️ | `route.ts` ~line 155: graph query 전체 실패 시 `lineItemToOrder` 비어 → 전 reservation 후보 가능. 단 UI dry_run 검토 단계가 인간 안전망 역할. 운영 절차(아래 3줄) 준수 시 허용 가능 수준. |
| 1 | split-tender 1차만 결제(Order #69 유형) | ✓ | 1차 결제 중 order.status = `pending` → `stale=false`. 2차 결제 완료 → `completed` 이후에만 후보 진입. |
| 1 | 선주문 awaiting_dispatch | ✓ | `fulfillment_stage = awaiting_dispatch` ≠ `hand_over` ∧ order.status = `pending` → 제외. |
| 2 | route 응답 필드 추가 · 동작 무변경 | ✓ | 추가 필드(`sku`, `title`, `order_display_id`, `created_at`)는 순 조회. 필터 step 3 코드 미변경. |
| 2 | dry_run 기본값 | ✓ | `body.dry_run == null ? true : Boolean(body.dry_run)` 유지. |
| 3a | defineRouteConfig 공식 패턴 | ✓ | `page.tsx:443` `defineRouteConfig({ label: "Stock cleanup", icon: Tag })` |
| 3b | 매장 기준 = PIN 페이지와 동일 | ✓ | `GET /admin/stock-locations?limit=100` → 단일 자동선택, 복수 `<select>`. PIN 페이지 선례 동일. |
| 3c | Release 확인 다이얼로그 | ✓ | `confirmOpen` overlay — "Release N reservations?" + "Stock in hand does not change; Available goes up." |
| 3d | Expected available 정확성 | ✓ | `buildSkuSummaries`: `expected_available = available + release_qty` (inventory_item_id 단위 예약 수 합산). 삭제 후 Available = 현재 Available + 해제량. 계산 정확. |
| 3e | 빈 화면 | ✓ | `rows.length === 0` → `"No stale reservations"` |
| 3f | UI 영어 | ✓ | 전체 UI 텍스트 영어. |
| 4 | #221 파일 충돌 | ✓ 없음 | #221: `void/route.ts`, `tenders/route.ts`, `void-refund-restock.spec.ts` + fixtures. #220: `release-stale-reservations/route.ts`, `stock-cleanup/page.tsx`, `stock-cleanup.spec.ts`. 겹치는 파일 0. |
| 4 | #221 의미 충돌 | ✓ 없음 | 보완(complementary). #221=앞으로 Void가 고아 예약 생성 안 함. #220=기존 11개 고아 UI 정리. |
| 5 | 스샷 git ls-tree | ✗ | 브랜치 커밋 1e3f20a 3개 파일에 스샷 없음. M2 보고서 "미완" 명시. |
| 5 | Playwright Release 흐름 | ✗ | 미실행. M2 보고서 "로컬 Admin 서버 미기동" 이유 명시. |
| 5 | CI 상태 | 불명 | check-runs API 403. `mergeable_state: unstable`. |

---

## #221 관계 · 머지 순서 제안

**파일 충돌**: 없음. 두 PR 모두 `main` base SHA `f106450` 공유.

**의미 관계**: 보완.
- #221 (`fix/m0-1105-ar-void-refund-restock`): `void/route.ts` 수정으로 앞으로 Void 시 고아 예약이 생기지 않도록 함 (R3 근본 수정).
- #220 (`feat/m2-1105-aq-stock-cleanup-page`): 기존에 쌓인 고아 예약(현재 Reserved 11+)을 Admin UI 로 정리하는 일회성 도구.

**머지 순서 권장**: **#221 먼저 → #220**. #221 로 근본 수정 후 #220 으로 기존 찌꺼기 정리가 개념상 자연스럽다. 단 코드 충돌이 없으므로 반대 순서도 무방. 어느 순서든 양쪽 머지 후 운영에서 아래 절차 1회 실행 필요.

---

## Kyu 절차 3줄

1. **Stock cleanup 열기**: Admin UI 로그인 → 왼쪽 사이드바 "Stock cleanup" 클릭 → SOOPSOK-COFFEE-LATTE-HOT 등 stale 목록이 로드되는지 확인.
2. **목록 검토 후 릴리즈**: 주문 번호(#N)와 상태(completed/canceled)를 눈으로 훑어 진행 중 주문이 없음을 확인 → "Release all" → 다이얼로그 "Release" 클릭.
3. **결과 확인**: "Released N reservations" toast 확인 → Admin Inventory에서 SOOPSOK-COFFEE-LATTE-HOT Available 수치 +N 증가 확인 (Reserved 11 → 0, Available 89 → 100 예상).

---

## 이연 순증감

이전 M2-1105-AQ 보고 대비 신규 이연 없음.

| 이연 항목 | 상태 |
|---|---|
| REQ 5 스샷 / Playwright 증거 | 미완 유지 (Kyu 실기로 대체 가능) |
| PB1·SC fee line item 통합 (R6 2차) | 이연 유지 (별도 티켓) |

---

착지 명령:
```
cp /tmp/R0-1105-BZ-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-BZ-report.md && git commit -m "r0: R0-1105-BZ" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-BZ done "APPROVE — pending 제외 로직+테스트 확인, 동작 변경 없음, #221 충돌 없음, 스샷 미첨부는 Kyu 실기 대체"
```
