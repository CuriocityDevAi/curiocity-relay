PR #303 · pos-integration 로컬 ✅ · 다른 실패 원인 0개

## 작업 요약

- 대상: `apps/commerce-core/src/modules/customer_display_settings/service.ts`
- 수정: L445·L465·L510·L555 — `((row.events_overrides ?? {}) as EventOverrides) ?? {}` → `(row.events_overrides ?? {}) as EventOverrides`
- 동작 변경 없음 (앞쪽 `??` 가 null/undefined 처리, 뒤쪽 중복 제거)

## CI 실패 분석 (run 43802538623)

| Job | 실패 원인 |
|-----|----------|
| pos-integration | TS2869 × 4 (L445·L465·L510·L555) — 이번 PR 로 해결 |
| docker-smoke-commerce-core | 별개 job · unhealthy 타임아웃 (ExitCode 7 = curl 연결 거부 · 720s 미도달) — 기존 불량, TS2869 무관 |

pos-integration 내 "Build commerce-core" 단계에서 TS2869 4건만 발생, 다른 실패 원인 없음.

## 로컬 검증

- `pnpm build` → Backend build completed successfully (5.02s)
- `pnpm test` → 326/326 tests passed
