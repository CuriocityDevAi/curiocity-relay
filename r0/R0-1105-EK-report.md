# R0-1105-EK 리뷰 리포트 — APPROVE (minor comments)

대상: storeport#256 (Admin UI) · 서버 #257 과 계약 대사 포함  
리뷰어: R0 (Sonnet 4.6) · 2026-11-15

---

## 판정: APPROVE

계약 필드명 100% 일치, Kyu 7개 요건 모두 ✓, raw hex 없음.  
blocking 이슈 없음 — 아래 4건은 후속 ticket 권장.

---

## 1. #256 ↔ #257 필드명 대조표

| 엔드포인트 / 필드 | 계약 | #256 UI | #257 서버 | 일치 |
|---|---|---|---|---|
| **GET settings** | | | | |
| current | current | current | current | ✓ |
| pending | PendingChange\|null | pending | pending { id, after, effective_at, reason, created_at } | △ 계약 초과 반환 — UI 미사용 · 무해 |
| timezone | "Asia/Jakarta" | timezone | "Asia/Jakarta" 하드코딩 | ✓ |
| **LoyaltySettings 11개 키** | | | | |
| enabled | ✓ | ✓ | ✓ | ✓ |
| earn_rate_pct | ✓ | ✓ | ✓ | ✓ |
| earn_base | ✓ | ✓ | ✓ | ✓ |
| round_mode | ✓ | ✓ | ✓ | ✓ |
| min_use_amount | ✓ | ✓ | ✓ | ✓ |
| max_use_pct_per_order | ✓ | ✓ | ✓ | ✓ |
| expiry_days | ✓ | ✓ | ✓ | ✓ |
| signup_bonus | ✓ | ✓ | ✓ | ✓ |
| exclude_product_ids | ✓ | ✓ | ✓ | ✓ |
| earn_on_balance_tender_only | ✓ | ✓ | ✓ | ✓ |
| tax_mode | ✓ | ✓ | ✓ | ✓ |
| **POST simulate** | | | | |
| 요청 body settings | { settings } | simulateLoyalty({ settings }) | body.settings 파싱 | ✓ |
| simulation_id | ✓ | SimulateResponse.simulation_id | sim.id 반환 | ✓ |
| settings_hash | ✓ | SimulateResponse.settings_hash | sim.settings_hash 반환 | ✓ |
| expires_at | ✓ | SimulateResponse.expires_at | sim.expires_at 반환 | ✓ |
| scenarios[].key/title/description | ✓ | ✓ | ✓ | ✓ |
| scenarios[].before/after (ReceiptPreview) | { lines: [{key,label,amount}] } | ✓ | ✓ | ✓ |
| scenarios[].changed_line_keys | ✓ | ✓ | computeDiffKeys() 반환 | ✓ |
| impact_30d.window_days / orders | ✓ | ✓ | ✓ | ✓ |
| impact_30d.earned/used/outstanding_liability/tax_reported .before/.after | ✓ | ✓ | ✓ | ✓ |
| impact_30d.sampled | 계약에 없음 | Impact 타입에 없음 | 추가 반환 | △ 무해 |
| **POST save** | | | | |
| settings / simulation_id / reason | ✓ | ✓ | ✓ | ✓ |
| apply.mode "now"/"scheduled" | ✓ | ✓ | 400 검증 | ✓ |
| apply.date YYYY-MM-DD | ✓ | scheduleDate | /^\d{4}-\d{2}-\d{2}$/ 검증 | ✓ |
| **POST pending/:id/cancel** | | | | |
| reason | { reason } | cancelPendingChange(id, reason) | body.reason 5자+ 검증 | ✓ |
| **GET audit** | | | | |
| items / count | ✓ | AuditEntry[] / count | ✓ | ✓ |
| AuditEntry 전체 필드 (14개) | ✓ | ✓ | ✓ | ✓ |

**불일치: 0건.** △ 2건은 계약 초과 반환 — backward-compatible, 수정 불필요.

---

## 2. Kyu 원문 요건 체크

| 항목 | 결과 | 근거 |
|---|---|---|
| Simulate 1회 후 Save 활성 | ✓ | `saveEnabled = !!(simResult && lastSimHash === currentHash)` · 마운트 즉시 1회 autorun |
| 값 변경 시 Save 비활성 | ✓ | `update()` 내 `setLastSimHash(null)` 즉시 호출 · debounce 400ms 후 재시뮬 완료 시 재활성 |
| Before 왼쪽 / After 오른쪽 영수증 | ✓ | `ScenarioCard`: `grid grid-cols-2` · 왼쪽 `<ReceiptCard label="Before">` · 오른쪽 `<ReceiptCard label="After" changed={...}>` |
| 카드 한 줄 description | ✓ | `<Text size="small" className="text-ui-fg-subtle">{scenario.description}</Text>` |
| Save 팝업 사유 필수 5자+ | ✓ | `reason.trim().length < 5` → toast.error + return · 서버도 동일 검증 |
| Save 팝업 즉시/예약 달력(오늘 이후) | ✓ | radio "now"/"scheduled" · scheduled: `<Input type="date" min={tomorrow}>` + 클라이언트 검증 |
| 감사 목록 항목별 표시 | ✓ | `AuditRow`: created_at · actor.email · diff(key: from→to) · reason · apply_mode · status Badge · 행 클릭 시 simulation_snapshot 전개 |

---

## 3. Semantic 토큰

**raw hex 없음.** 전체 `page.tsx`에서 `#RRGGBB` / `#RGB` 형식 사용 0건.  
모든 색상은 Medusa UI semantic token 클래스 사용:  
`text-ui-fg-subtle`, `bg-ui-bg-base`, `border-ui-border-base`, `text-ui-fg-error`,  
`text-ui-tag-orange-text`, `bg-ui-tag-orange-bg`, `border-ui-tag-orange-border` 등.

---

## 4. i18n

**경미한 하드코딩 1건:**
- `page.tsx` tax_mode 경고 문구 중 `"(세무사 확인 후에만)"` 한국어 삽입
- Playwright test 7에서 `.toContainText("세무사 확인 후에만")`로 동일하게 검증 중
- 현 프로젝트 i18n 미도입 관행과 일치 — 후속 ticket 권장 (blocking 아님)

---

## 5. 접근성 (키보드·포커스)

**긍정:**
- `<Switch id="toggle-enabled">` + `<Label htmlFor="toggle-enabled">` 연결 ✓
- `<Textarea id="save-reason">` + `<Label htmlFor="save-reason">` 연결 ✓
- 모든 인터랙티브 요소가 Medusa UI 컴포넌트 기반 → 기본 키보드 접근성 확보

**후속 ticket 권장:**

1. **`Field` 컴포넌트 `htmlFor` 미연결** — `sim-earn-base-select`, `sim-round-mode-select`, `sim-tax-mode-select` 3개 `<select>`가 `id`는 있으나 Field의 `<Label>`과 `htmlFor`로 연결되지 않음. `Field({ id?, label, ... })` → `<Label htmlFor={id}>` 적용 필요.

2. **모달 aria 미적용** — `SaveDialog`, `UngatedModal`에 `role="dialog"`, `aria-modal="true"`, `aria-labelledby` 없음.

3. **동적 배너 `role="alert"` 미적용** — `save-gate-banner`, pending-banner 등.

---

## 6. Playwright 어설션·스크린샷·CI

**spec**: `apps/commerce-core/e2e/admin/loyalty-gate.spec.ts` (310줄 · 8 test)  
**mock 전략**: `page.route()` 인터셉트 — 실서버 불필요

**어설션 종류:**
- `toBeEnabled()` / `toBeDisabled()` — Save 버튼 게이트
- `toBeVisible()` / `not.toBeVisible()` — impact-panel, save-dialog, audit-table 등
- `toContainText(...)` — diff 표, status badge, warning 문구

**스크린샷 (9개):**  
`loyalty-01-sim-done-save-enabled.png` · `loyalty-02-after-change-disabled.png` · `loyalty-02b-after-resim-enabled.png` · `loyalty-03-gate-banner.png` · `loyalty-04-save-dialog.png` · `loyalty-05-scheduled-calendar.png` · `loyalty-06-audit-trail.png` · `loyalty-07-tax-mode-warning.png` · `loyalty-08-impact-panel.png`

**CI 연동 미비 (후속 ticket 권장):**  
`package.json`에 `"test:e2e:admin"` 스크립트 추가되었으나, `.github/workflows/ci.yml`에 e2e job이 추가되지 않음. 현재 Playwright test는 수동 실행만 가능.

---

## 종합

**필드명 불일치 0건 · Kyu 요건 7/7 ✓ · raw hex 0건**  
blocking 이슈 없음 — 4개 후속 ticket (접근성 2건 + CI 연동 + i18n 1건) 권장.

서버 #257 minor: `computeImpact30d()`에서 `(svc as any)` 타입 캐스팅 사용 — 기능 동작 무관하나 타입 정합 개선 권장.
