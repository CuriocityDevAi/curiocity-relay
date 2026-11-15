# R0-1105-EN — 재리뷰 리포트

**#257 판정: APPROVE** — EJ CHANGES(settings_hash GATED-only) 해소 완료.  
**#256 판정: CHANGES** — BN 4건 전부 확인 완료. 블로커: `mergeable_state: "dirty"` (충돌 해결 후 재푸시 필요).

리뷰어: R0 (Sonnet 4.6) · 2026-11-15

---

## REQ 1 · #257 EJ CHANGES 해소 — settings_hash GATED-only

### 수정 위치 확인
파일: `apps/commerce-core/src/modules/loyalty_settings/service.ts`

```typescript
// 수정 후 (M0-1105-CC commit 6d2329f)
export function hashSettings(settings: unknown): string {
  const src = (settings ?? {}) as Record<string, unknown>;
  const gatedOnly: Record<string, unknown> = {};
  for (const k of GATED_KEYS) gatedOnly[k] = src[k];
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(sortKeys(gatedOnly)))
    .digest("hex");
}
```
주석: `"R0-1105-EJ fix: hash GATED keys only so UNGATED toggles do not invalidate an in-flight simulation"` ✓  
`GATED_KEYS` 9개 모두 포함(earn_rate_pct · earn_base · round_mode · min_use_amount · max_use_pct_per_order · expiry_days · signup_bonus · tax_mode · exclude_product_ids) ✓

두 경로 단일 함수 사용:
- `simulate/route.ts` → `svc.createSimulation(after)` → 내부 `hashSettings(settings)` 호출 ✓
- `settings/route.ts` POST → `hashSettings(after)` 직접 비교 ✓

### 회귀 테스트 5건 (`service.unit.spec.ts` describe "hashSettings scope · GATED keys only")

| # | 테스트명 | 검증 내용 |
|---|---|---|
| 1 | UNGATED-only differences produce identical hashes | enabled + earn_on_balance_tender_only 토글 → 해시 동일 |
| 2 | GATED differences produce distinct hashes | earn_rate_pct 2→3 → 해시 상이 |
| 3 | regression · simulate(GATED) → UNGATED-only save → save(GATED) succeeds | 핵심 버그 시나리오 해소 |
| 4 | regression · GATED value divergence still mismatches (409 path intact) | 409 경로 유지 |
| 5 | hash is independent of key order / undefined UNGATED keys | sparse GATED-only 객체 = 전체 객체 해시 동일 |

### 버그 시나리오 재현 (테스트 3 추적)

```
1. simulate({ ...current, earn_rate_pct:2 }) → sim.id = "loysim_N", hash = H1 (GATED-only)
2. applySettings({ ...current, enabled:true }) → UNGATED 단독 저장, simulation 불필요 ✓
3. current 재조회: { ...prev, enabled:true }
4. hashSettings({ ...current_new, earn_rate_pct:2 })
   → gatedOnly = { earn_rate_pct:2, earn_base:..., ...(enabled 제외) }
   → H2 == H1 (GATED 값 동일) ✓
5. getValidSimulation(sim.id) → found, settings_hash == H2 → save 성공 ✓
```

이전엔 step 4에서 enabled=true 가 해시에 포함되어 H2 ≠ H1 → 409 "settings_hash mismatch" 강제 재시뮬. 수정 후 해소 ✓

### R0 minor 수정 확인
`simulate/route.ts` `computeImpact30d()`:
```typescript
type OrderRow = { subtotal?: number; item_subtotal?: number; ... };
type OrderServiceLike = { listOrders?: (...) => Promise<OrderRow[]> };
```
기존 `(svc as any)` + `(o as any)` 캐스팅 → 로컬 인터페이스로 타입 정합화 ✓ (동작 변경 없음)

### CI
체크런 직접 조회 불가 (403). PR 자기보고: `unit-commerce-core` 193 passed (신규 33건 포함 · 이전 188). 직접 확인 미완료.

**판정: APPROVE** — EJ CHANGES 필수 수정 1건 해소 완료. CI 자기보고 통과.

---

## REQ 2 · #256 BN 4건 확인

### REQ1 · tax_mode 읽기 전용 ("세무사" 문구 0)

`page.tsx` SimulateView → `Field label="Tax mode"` 블록:
```tsx
<Field label="Tax mode">
  <Text size="small" className="text-ui-fg-subtle"
    data-testid="sim-tax-mode-readonly">
    결제수단 방식 (인도네시아 일반 · 자카르타 PBJT 기준)
  </Text>
</Field>
```
- `sim-tax-mode-select` 없음 ✓  
- `"세무사 확인 후에만"` 문구: `page.tsx` 전체 0건 ✓  
- 메인 설정 화면 `SettingRow label="Tax mode"` → `{current.tax_mode}` 읽기 전용 표시 ✓  
- Spec 7 검증: `sim-tax-mode-select` not attached · `sim-tax-mode-readonly` visible + contains "인도네시아 일반" · `tax-mode-warning` not attached ✓  
- API/DB `tax_mode` 필드: 계약 유지 ✓

### REQ2 · 목 폴백 dev-only (근거 파일:줄)

파일: `apps/commerce-core/src/admin/lib/loyalty-api.ts`

```typescript
// Vite replaces import.meta.env.DEV at build time — mock fallback is tree-shaken out of production bundles.
const IS_DEV: boolean =
  typeof import.meta !== "undefined" &&
  (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

async function request<T>(url, init?, mockFn?) {
  try {
    const res = await fetch(url, ...);
    if (res.status === 404) {
      if (IS_DEV && mockFn) return mockFn();   // ← dev 전용
      throw new Error(...);
    }
    if (!res.ok) {
      throw new Error(...);                    // ← 500 등 비-404: mock 없음 ✓
    }
    ...
  } catch (err) {
    if (IS_DEV && mockFn && err.message.includes("Failed to fetch"))
      return mockFn();                         // ← 네트워크 실패: dev 전용
    throw err;                                 // ← 운영 빌드: throw ✓
  }
}
```

- Vite 빌드 시 `import.meta.env.DEV` = `false` → `IS_DEV = false` → 목 경로 tree-shaken ✓  
- 500 오류 → `throw new Error(...)` → `page.tsx` catch → `setError(...)` → `role="alert"` div + `data-testid="retry-btn"` 표시 ✓  
- Spec 9 추가: 500 → `retry-btn` visible · `simulate-btn` not visible ✓

### REQ3 · 접근성 3건

| 항목 | 수정 내용 | 확인 |
|---|---|---|
| Field `htmlFor` | `sim-earn-base-select`, `sim-round-mode-select` 에 `id` 속성 추가. `Field` 컴포넌트 → `<Label htmlFor={id}>` | ✓ |
| 모달 aria | `SaveDialog`: `role="dialog" aria-modal="true" aria-labelledby="save-dialog-title"` · `UngatedModal`: `role="dialog" aria-modal="true" aria-labelledby="ungated-dialog-title"` | ✓ |
| 동적 배너 `role="alert"` | `pending-banner` · `save-gate-banner` · 오류 div 모두 `role="alert"` | ✓ |

sim-tax-mode-select 삭제로 EK에서 지적한 3개 select 중 나머지 2개(earn_base · round_mode)에만 적용됨 — 계획 일치 ✓

### REQ4 · 새 e2e CI job

`ci.yml` 변경:

**changes-filter 출력 추가:**
```yaml
loyalty_admin: ${{ steps.filter.outputs.loyalty_admin }}
```
경로 필터:
```yaml
loyalty_admin:
  - 'apps/commerce-core/src/admin/routes/pos-settings/loyalty/**'
  - 'apps/commerce-core/src/admin/lib/loyalty-api.ts'
  - 'apps/commerce-core/e2e/admin/**'
  - 'apps/commerce-core/playwright.config.ts'
```

**e2e-admin-loyalty job:**
- 트리거: `loyalty_admin == 'true' || github.event_name == 'pull_request'` ✓
- 서비스: Postgres 16-alpine ✓
- Medusa dev 서버 백그라운드 기동 ✓
- Playwright chromium only (`npx playwright install --with-deps chromium`) ✓
- 실패 시 artifact: 스크린샷 + HTML 리포트 ✓

CI 체크런 직접 조회 불가 (403). PR 자기보고: Unit 160/160 pass.

---

## REQ 3 · #256 ↔ #257 계약 필드 재대사 (변경분만)

| 변경 항목 | 서버 (#257 CC) | UI (#256 BN) | 계약 | 판정 |
|---|---|---|---|---|
| `settings_hash` 계산 | GATED_KEYS 9개 sha256 | `gatedHash()` = JSON.stringify(GATED 9개) · 서버 hash 미참조 | "GATED 키 전체" | ✓ |
| `impact_30d.sampled` | 여전히 반환 | Impact 타입 미포함 · UI 미사용 | 계약 외 | △ 무해 (기존 EK 보고 동일) |
| 나머지 전체 필드 | 변경 없음 | 변경 없음 | 일치 | ✓ |

필드명 불일치 없음.

---

## REQ 4 · mergeable 확인 · 머지 순서

| PR | mergeable_state | 판단 |
|---|---|---|
| #257 | **clean** | 즉시 머지 가능 ✓ |
| #256 | **dirty** | ❌ 충돌 해결 필요 |

**#256 블로커**: `mergeable_state: "dirty"`. `git pull --rebase origin main` 후 충돌 해결 → 재푸시 필요.

**머지 순서 #257 → #256**:
- #257(clean) 먼저 머지 ✓  
- #257이 `ci.yml` 미수정 (서버 단독 PR) → #256 rebase 후 `loyalty_admin` 경로 추가 + `e2e-admin-loyalty` job 충돌 가능성 낮음  
- 단, #256은 rebase 없이는 머지 불가 → 머지 순서 자체 유효하나 #256 충돌 선해결 필수

---

## 판정 요약

| REQ | 대상 | 항목 | 결과 |
|---|---|---|---|
| 1 | #257 | hashSettings GATED-only 수정 | ✓ |
| 1 | #257 | 회귀 테스트 5건 | ✓ |
| 1 | #257 | 버그 시나리오 해소 (simulate→UNGATED→GATED) | ✓ |
| 1 | #257 | R0 minor (any 캐스팅 제거) | ✓ |
| 1 | #257 | CI jobs | 직접 확인 불가 (403) · PR 자기보고 통과 |
| 2 | #256 | REQ1 tax_mode 읽기 전용 · "세무사" 0 | ✓ |
| 2 | #256 | REQ2 목 폴백 dev-only (import.meta.env.DEV) | ✓ |
| 2 | #256 | REQ3 접근성 3건 | ✓ |
| 2 | #256 | REQ4 e2e CI job | ✓ |
| 3 | 양쪽 | 계약 필드 재대사 | 불일치 0건 |
| 4 | #257 | mergeable (clean) | ✓ |
| 4 | #256 | mergeable (dirty) | ❌ **블로커** |

**#257: APPROVE** · **#256: CHANGES** (충돌 해결 후 재푸시)
