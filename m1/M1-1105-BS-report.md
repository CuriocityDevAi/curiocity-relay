# M1-1105-BS 리포트

**착지 한 줄**: #BR-a it.failing → it 승격(JSONB fix 확인) + Stock cleanup "No sale reservations" → "No open orders holding stock" 수정 완료.

---

## 1. #BR-a 결과

| 항목 | 값 |
|------|-----|
| 브랜치 | `fix/m1-1105-bs-qris-test-promote-stock-cleanup-text` (origin/main 기준) |
| 대상 커밋 (server fix) | `df117e3` M0-1105-BN — `claimWebhookCapture` JSONB `?` → `jsonb_exists` |
| origin/main 상태 | df117e3 포함 ✅ (fetch 후 `6496142` 최신) |
| `it.failing` 호출 수 | 0 (변환 전 1 · 변환 후 0) |
| 서버 side 판단 | **pass 예상** — JSONB 바인딩 버그 수정됨 · v3 추가 필드는 `parseWebhookEvent` 에서 무시되어 동일 경로 |
| 클라 폴링 버그 | 미수정 (M0 소유 — qris-status/route.ts `"captured"` vs 앱 `=== 'paid'` 불일치 · pos-qris.ts payment_request_id 미전달) |
| `pnpm test:integration:pos` | 미검증 (로컬 Docker DB 없음 — CI 결과로 대체) |

`#BM-a2` / `#BM-e2` 는 origin/main (commit `6fde849` 이후) 에서 이미 `it` 로 전환됨 — 이번 BS 범위 아님.

---

## 2. Stock cleanup 문구 전후

| 위치 | 변경 전 | 변경 후 |
|------|---------|---------|
| "Open orders holding stock" 칸 빈 상태 | `No sale reservations` | `No open orders holding stock` |
| "Stale reservations" 칸 빈 상태 | `No stale reservations` | `No stale reservations` (유지) |

파일: `apps/commerce-core/src/admin/routes/stock-cleanup/page.tsx:617`

---

## 3. 자기 검증

| 항목 | 결과 |
|------|------|
| conflict 해결 (stash pop) | ✅ 수동 해소 — `#BR-a` 추가 + origin/main `#BM-e2` 보존 |
| `it.failing(` 호출 잔존 | ✅ 0건 |
| unit tests (132 suite) | ✅ push pre-hook 통과 |
| prettier | ✅ pre-commit hook 자동 적용 |
| typecheck | 미검증 |
| integration test | 미검증 (로컬 DB 없음) |

---

## 4. PR

PR #245 · base main · draft  
`fix/m1-1105-bs-qris-test-promote-stock-cleanup-text`  
https://github.com/CuriocityDevAi/storeport/pull/245
