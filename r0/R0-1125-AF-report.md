# R0-1125-AF 리포트

## 판정
- **#443** APPROVE ✅
- **#437** CHANGES 🔴 (블로커 3건)
- **#435** APPROVE ✅

---

## #443 — hotfix(commerce-core): M0-1125-Q cd-builder 워크스페이스 수정 + PR docker build 가드

**판정: APPROVE**

### CI
| 잡 | 결과 |
|---|---|
| `docker-build-commerce-core (ubuntu)` | ✅ pass 6m28s |
| `check` / `markers-and-forbidden` / `route` / `changes-filter` | ✅ pass |
| `heavy-mac` | pending (self-hosted · 블로커 아님) |

### 검증 항목
- **cd-builder** `packages/receipt-view-model/package.json` → `pnpm install` 전 복사 ✅
- `--filter "customer-display..."` (전이 workspace deps 포함) ✅
- `packages/receipt-view-model/` 소스 → `build:web` 전 복사 ✅
- **runtime WORKDIR** = `/app/.medusa/server` (#442 수정 유지) ✅
- **builder stage** 변경 없음 · `pnpm build` 그대로 ✅
- **docker-build-pr.yml** ubuntu-latest · GHA cache · concurrency cancel-in-progress ✅

---

## #437 — fix(cd): M1-1125-N/S CD 영수증 = POS 영수증 (서버 full receipt CD snapshot 반영)

**판정: CHANGES (블로커 3건)**

### 서버 런타임 @storeport/receipt-view-model import 확인
`apps/commerce-core/src/` 하위 non-admin 경로(modules / workflows / api) import **0줄** ✅  
`src/admin/` (vite 번들 · 런타임 서버 아님) 4건 → 허용 ✅

### standalone install
`apps/commerce-core/package.json` + `apps/commerce-core/pnpm-lock.yaml` 로 `pnpm install --frozen-lockfile --ignore-workspace` 실행 결과:
```
ERR_PNPM_OUTDATED_LOCKFILE  pnpm-lock.yaml is not up to date with package.json
```
→ package.json `dependencies`에 `"@storeport/receipt-view-model":"workspace:*"` 잔존 · lockfile 미수록 → **FAIL**

### CI 실패
| 잡 | 결과 | 원인 |
|---|---|---|
| `check` | ❌ FAIL | feature-map-check exit=1 (1 unmatched 7.1%) |
| `heavy-mac` · `customer-display·typecheck` | ❌ FAIL | TS2304 ×2 |
| `heavy-mac` · 단위 65 suites | ✅ pass | |

### 블로커 상세

**Blocker 1** `apps/customer-display/src/types/order-snapshot.ts:4`  
`export type { SnapshotItem, ReceiptItem } from "@storeport/receipt-view-model"` 는 파일 내 스코프에 타입 이름을 노출하지 않음.  
동일 파일 내 `OrderSnapshot.items: SnapshotItem[]`(101번), `receipt.items: ReceiptItem[]`(129번) → TS2304.  
fix: `import type { ... } from "..."` + `export type { ... }` (from 없는 형태) 분리.

**Blocker 2** `apps/commerce-core/src/types/__tests__/customer-display-types.unit.spec.ts`  
feature-map 경로 패턴 미등록 → `check` 잡 exit=1.  
fix: feature map에 M1-1125-S 항목으로 `src/types/__tests__/` 경로 패턴 추가.

**Blocker 3** `apps/commerce-core/package.json` + `pnpm-lock.yaml` 불일치  
`dependencies`에 `@storeport/receipt-view-model` 잔존 · lockfile 미수록 → standalone install ERR_PNPM_OUTDATED_LOCKFILE.  
fix: `dependencies`에서 제거 → `pnpm install --ignore-workspace` 로 lockfile 재생성.  
(admin vite alias는 경로 직접 참조로 package.json 의존 불필요)

### non-blocking ✅
- `patchSnapshotReceiptByOrder` 로직 · try-catch non-fatal ✅
- `subtotal != null` 폴백 수정 (100% 할인 케이스) ✅
- `line_total → total` 단일화 · 테스트 65 suites pass ✅

---

## #435 — feat(commerce-core): M1-1125-M POS Settings Customer Display 탭 분리

**판정: APPROVE**

### CI
`heavy-mac` pass 13m22s · `check` pass · `route` pass · 전 초록 ✅

### 검증 항목
- TABS 배열: `[..., "receipt", "customer-display"]` — Receipt 오른쪽 6번째 ✅
- `className={TAB_TRIGGER_CLASS}` — 나머지 탭과 동일 · #433(M1-1125-L) 알약 스타일 일관 ✅
- `data-testid="pos-settings-tab-customer-display"` ✅
- `?tab=customer-display` URL 직접 진입 지원 ✅
- General 탭 Customer Display 블록(`<section>`) 완전 제거 ✅
- `inLocationMode` 분기 → Brand-wide 안내문 (편집 불가) ✅
- Playwright smoke 10개 (탭 6개 존재, CD 탭 클릭, General CD 블록 없음, URL 직접 진입) pass ✅
