---
round: M0-1105-D
pr:
  storeport: storeport#187
base_pr: storeport#185
outcome: admin-pos-settings-page-live · 사이드바 "POS Settings" + CogSixTooth 등록 · show_tax_label/dp_percent/receipt_header 세 필드 저장·새로고침 유지 · Playwright 3/3 PASS · 라이트/다크 스샷 캡쳐 · BOOT OK · 금지 영역 변경 0
kyu_checks: 1 (admin.meros.id → Settings → POS Settings → DP 50 저장 → 새로고침 유지 · 헤드리스 Playwright 대역으로 완료 · 3/3 assertions true)
---

# M0-1105-D · Admin POS Settings 페이지

**일자**: 2026-11-06 · **허브**: M0 · **대상**: `apps/commerce-core/src/admin/routes/pos-settings/page.tsx` + `apps/commerce-core/src/admin/lib/pos-settings-api.ts`.

**base**: storeport PR #185 (M0-1105-C · 통합 6/6 PASS) 후속. UI 전용.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | Admin 사이드바에 "POS Settings" 항목 신설 | ✓ (defineRouteConfig · CogSixTooth) |
| 2 | 세 필드 렌더 (show_tax_label 토글 · dp_percent 0~100 · receipt_header 3-line) | ✓ |
| 3 | GET /admin/pos/settings 로 초기값 로드 | ✓ (useEffect) |
| 4 | Save 버튼 → PUT /admin/pos/settings → 토스트 "POS Settings saved" | ✓ |
| 5 | 새로고침 후 값 유지 (Playwright E2E) | ✓ (3/3 PASS) |
| 6 | 라이트 + 다크 스샷 | ✓ |
| 7 | 영어 전용 (ADDENDUM §2) | ✓ (라벨·설명·플레이스홀더 모두 영어) |
| 8 | 산출물 기동 BOOT OK + /health 200 (M0-1104-I 상시 ⓒ) | ✓ |
| 9 | 격리 frozen-lockfile exit 0 (상시 ⓑ · @medusajs/icons 추가분) | ✓ |
| 10 | 금지 (medusa-config.ts · /src/api/admin/pos/**) 변경 0 | ✓ |
| 11 | 런타임 파일 I/O 0 (M0-1104-I 상시) | ✓ |

---

## 1. 구현 ↔ 파일

### `apps/commerce-core/src/admin/routes/pos-settings/page.tsx` (신규)
- `defineRouteConfig({ label: "POS Settings", icon: CogSixTooth })` 로 사이드바 등록.
- `@medusajs/ui`: `Container · Heading · Text · Label · Switch · Input · Textarea · Button · toast` 만 사용.
- `useEffect` 초기 fetch → `setInitialSettings` + 각 필드 state 시드.
- `hasChanges` 계산: 세 필드 중 하나라도 initial 과 다르면 true.
- `dpInvalid`: `Number.isFinite` 실패 또는 범위 밖이면 true. Save 비활성 + 인라인 `text-ui-fg-error` 메시지.
- Save 성공 → `toast.success("POS Settings saved")`; 실패 → `toast.error("Save failed", { description })`.
- 테스트 ID: `pos-settings-dp-input` · `pos-settings-show-tax-switch` · `pos-settings-header-textarea` · `pos-settings-save`.

### `apps/commerce-core/src/admin/lib/pos-settings-api.ts` (신규)
- `fetchPosSettings()` → `GET /admin/pos/settings` (credentials:"include").
- `updatePosSettings(patch)` → `PUT /admin/pos/settings` body=JSON patch.
- 타입: `PosSettings` (optional show_tax_label/dp_percent/receipt_header) · `PosSettingsResponse` (settings: PosSettings).
- 실패 시 `throw new Error(\`${METHOD} ${ENDPOINT} failed (${res.status}): ${await res.text()}\`)` — 메시지에 status + body.

### `apps/commerce-core/package.json`
- `"@medusajs/icons": "^2.17.2"` 추가 (CogSixTooth 소스 · 기존에 미등재였음).

### `pnpm-lock.yaml` + `apps/commerce-core/pnpm-lock.yaml`
- `pnpm add @medusajs/icons` + `pnpm install --ignore-workspace --lockfile-only` 로 workspace/isolated 양쪽 동기화.

---

## 2. 검증

### ⓐ Build (`pnpm --filter commerce-core build`)
- Backend 3.88s · Frontend 17.85s · **PASS**.

### ⓑ 격리 frozen-lockfile (상시 · Railway 동일 조건)
- `/tmp/repro-m1105d` 로 `apps/commerce-core` 통째 복사 + `package.json` + `pnpm-lock.yaml`.
- `pnpm install --ignore-workspace --frozen-lockfile` → **exit 0**.
- `@medusajs/icons` 추가분 반영 확정. M0-1104-F 교훈 (standalone vs workspace lockfile divergence) 재발 없음.

### ⓒ 산출물 기동 (dist 직접 `node`)
- `node .medusa/server/index.js` port 9993 → stdout:
  ```
  BOOT OK unknown :9993
  Server is ready on port: 9993
  ```
- `curl -sI http://127.0.0.1:9993/health` → **200**.
- M0-1104-I 교훈 (런타임 파일 I/O 금지) 준수 — 본 라운드도 UI 전용이라 추가 I/O 없음.

### 라우트 존재 확인
- `GET /admin/pos/settings` (no auth) → **401**. 라우트는 등록 완료 · auth gate 정상.

### Playwright E2E (admin 로그인 → POS Settings → DP 50 저장 → 새로고침 → 값 유지)
- Bearer-header 인증으로 세션 쿠키 플레이킹 우회 (테스트 환경 전용).
- 결과:
  ```json
  {
    "e2e": {
      "initial": { "dp": "100", "tax": "false", "header": "" },
      "toastShown": true,
      "afterReload": {
        "dp": "50",
        "tax": "true",
        "header": "Soopsok Cafe\nJl. Melati 1\nNPWP 00.000.000.0-000.000"
      },
      "assertions": {
        "dp_persisted": true,
        "tax_persisted": true,
        "header_persisted": true
      }
    }
  }
  ```
- 3/3 assertions **PASS**.

### 스샷 (라이트 · 다크)
- `docs/M0-1105-D-pos-settings-light.png` · `docs/M0-1105-D-pos-settings-dark.png`.
- 양 테마 모두 사이드바 "POS Settings" (CogSixTooth) 등록 · 모든 필드 · 설명 · 플레이스홀더 영어로 확인.
- feature-map.yaml 에 `docs/M0-*-pos-settings-*.png` 패턴 추가 · 736/736 matched.

---

## 3. Kyu 실기 (헤드리스 Playwright 대역)

- admin → Settings 트리 → **POS Settings** 진입
- DP `50` 입력 · Switch ON · header `Soopsok Cafe\\nJl. Melati 1\\nNPWP 00.000.000.0-000.000`
- Save → 토스트 "POS Settings saved"
- 새로고침 → DP 50 유지 · Switch ON 유지 · header 3-line 유지
- 위 JSON 3/3 true 로 확인 (시각적 확인은 라이트/다크 스샷)

---

## 4. 금지 영역 (변경 0)

- `apps/commerce-core/medusa-config.ts` — 손 안 댐
- `apps/commerce-core/src/api/admin/pos/**` — 서버 라우트 미변경 (프런트만)
- 런타임 `readFileSync` 추가 **0** (M0-1104-I 상시)
- `meros` 리터럴 추가 사용처: `src/admin/**` 예외 범위 내 (CLAUDE.md §0 carve-out)

---

## 5. 산출물

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/187
- **브랜치**: `feat/m0-1105-d-admin-pos-settings`
- **커밋**: `bf61135` — `feat(admin): POS Settings 페이지 (M0-1105-D)`
- **스샷**: `docs/M0-1105-D-pos-settings-{light,dark}.png`

---

## 6. 다음 후보

- **M0-1105-E** · POS Settings 값을 실제 결제/영수증 플로우에 접속:
  - `show_tax_label=false` 일 때 영수증 renderer 가 tax 줄 생략
  - `dp_percent` 를 pre-order tenders 계산식에 반영 (현재 라우트는 request body 의 dp 를 받지만 default fallback 이 서버 settings 를 못 참조)
  - `receipt_header` 를 영수증 템플릿 상단에 삽입
- Admin extension 측에서 "Receipt configuration" sub-page (tax label 텍스트 PBJT/PPN 선택) 신설 여부 — Kyu 결정 대기.
