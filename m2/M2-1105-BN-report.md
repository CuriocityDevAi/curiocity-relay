# M2-1105-BN 완료 리포트

## 결과 한 줄
4개 REQ 전부 완료 — tax_mode 읽기 전용·목 폴백 dev-only·접근성 3건·e2e CI job — PR #256 추가 커밋 4개 push.

## 작업 내역

### REQ1 · tax_mode 숨김 (커밋 33013cb)
- `page.tsx` SimulateView: `sim-tax-mode-select` select + discount 경고 블록 제거 → `data-testid="sim-tax-mode-readonly"` 텍스트 "결제수단 방식 (인도네시아 일반 · 자카르타 PBJT 기준)" 표시
- `LoyaltySettings.tax_mode` 타입/API/DEFAULT_SETTINGS 계약 유지
- spec 7 갱신: `sim-tax-mode-select` not attached · `sim-tax-mode-readonly` "인도네시아 일반" 포함 체크

### REQ2 · 목 폴백 dev-only (커밋 cb7b198)
- `loyalty-api.ts`: `IS_DEV = import.meta.env.DEV` 플래그 추가 — 404 및 "Failed to fetch" 폴백을 dev 빌드에서만 활성화; 운영 빌드에서 throw
- `page.tsx` 오류 상태: `role="alert"` div + `data-testid="retry-btn"` Retry 버튼 추가
- spec 9 추가: 500 오류 시 retry-btn 표시, simulate-btn 미표시 검증

### REQ3 · 접근성 (커밋 ccc741e)
- `Field` 컴포넌트: `id?: string` prop + `<Label htmlFor={id}>`
- `earn_base` select `id="sim-earn-base-select"` · `round_mode` select `id="sim-round-mode-select"` (세금 모드는 readonly라 select 없음)
- `SaveDialog`: `role="dialog" aria-modal="true" aria-labelledby="save-dialog-title"` + Heading `id="save-dialog-title"`
- `UngatedModal`: `role="dialog" aria-modal="true" aria-labelledby="ungated-dialog-title"` + Heading `id="ungated-dialog-title"`
- `save-gate-banner`, `pending-banner`, 오류 div: `role="alert"` 추가

### REQ4 · CI e2e job (커밋 1631c52)
- `ci.yml` changes-filter: `loyalty_admin` 경로 추가 (loyalty 소스·e2e·playwright.config)
- `e2e-admin-loyalty` job: Postgres 서비스 + Medusa dev 백그라운드 + chromium Playwright
- 실패 시 `loyalty-e2e-screenshots-{run_id}` + `loyalty-e2e-report-{run_id}` artifact 업로드
- 다른 job과 독립 (paths 필터 · `needs: changes-filter` 만)

## 자기 검증

### unit 테스트
```
apps/commerce-core test: Tests: 160 passed, 160 total
packages/event-contracts test: Tests: 21 passed (21)
```

### Playwright e2e (로컬 실행 필요 — Medusa dev 서버 없이 CI 미실행)
- page.route() mock 서버로 loyalty API 전부 가로챔
- spec 7 갱신: `sim-tax-mode-select` → `sim-tax-mode-readonly` 로 변경
- spec 9 신규: 500 오류 → retry-btn 검증

### Push 확인
```
feat/m2-1105-bm-loyalty-admin-ui (추가 커밋 4개)
  1631c52 ci: REQ4
  ccc741e fix: REQ3
  cb7b198 fix: REQ2
  33013cb feat: REQ1
```

## PR
https://github.com/CuriocityDevAi/storeport/pull/256 — "R0-EK 후속" 절 추가 완료
