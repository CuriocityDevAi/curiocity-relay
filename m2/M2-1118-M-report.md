PR #377 · R-B2(a) 완료 O · 경계 경고 14→6 · smoke O · unit 539

## 결과 요약

| 항목 | 결과 |
|---|---|
| PR | https://github.com/CuriocityDevAi/storeport/pull/377 |
| 브랜치 | `refactor/M2-1118-M-rb2` |
| R-B2a 완료 | O |
| 경계 경고 (전→후) | 14→6 (register_session 관련 8건 해소) |
| checkout-handover-smoke | PASS 2/2 |
| unit | 539 tests, 47 suites PASS |
| pnpm build | exit 0 |

## 채택 접근법

**re-export 경계 마커** (물리 이동 대신):
- Medusa v2 가 entity 를 파일 경로 기준으로 모듈에 귀속 → `models/` 외 경로로 이동 시 `AwilixResolutionError: Could not resolve 'registerSessionService'` 발생 확인
- 원본 `models/` 유지 · `core/models/` 는 POS 전용 경계 주소 역할 (re-export)
- ESLint 패턴 `register_session` → `register_session/core` 로 갱신

## 변경 파일

1. `apps/commerce-core/eslint.config.ts` — POS_BOUNDARY_PATTERN `register_session/core` 로 갱신
2. `apps/commerce-core/src/modules/register_session/core/models/register-session.ts` (신규) — re-export
3. `apps/commerce-core/src/modules/register_session/core/models/cash-movement.ts` (신규) — re-export
4. `apps/commerce-core/src/modules/register_session/core/models/customer-display-device.ts` (신규) — re-export
5. `docs/plans/pos-finish-shared.md` — §5 R-B2 행 "R-B2a 완료 M2-1118-M" 표기

## 잔여 위반 (R-B2b·R-B3 소관)

- `pos_settings` 4건 (R-B1 후속)
- `api/admin/pos` 2건 (R-B3 소관)
