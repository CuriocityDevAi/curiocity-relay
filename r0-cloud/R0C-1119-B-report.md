#386 APPROVE · #385 CHANGES || clone 2초 · install O 26초 · unit O 29초 · build O 33초 · PG 기동 3초 · pin-audit O 13초 · 총 3분

# R0C-1119-B — R0 클라우드 시험 2차 · 실행 측정

- 실행: 2026-11-19 · 클라우드 스케줄 세션 (리포 2개 연결 상태) · PR 코멘트 0건
- 대상 head: #386 `32b526f` · #385 `639ecd4` (둘 다 main `b9cdb58` 머지 포함)
- 환경: Node v22.23.5 · pnpm 9.15.0 · PostgreSQL 16 (이미지 내장) · HOME=/root
- **결론: 1차의 막힘(리포 미연결)이 풀리자 clone → install → unit → build → 통합(pin-audit)까지 클라우드에서 모두 그대로 돎. 전체 실측 약 3분.**

## 1. 단계별 결과

| 단계 | 명령 | 결과 | 시간 | 비고 |
|---|---|---|---|---|
| clone storeport | `git clone --depth 1` | O | 2초 | |
| clone relay | `git clone --depth 1` | O | 1초 | |
| PR head fetch | `git fetch --depth 50 origin pull/386/head pull/385/head` | O | 1초 | `gh` 불필요 |
| install | `pnpm install --frozen-lockfile` | O | 26초 | 빈 store 기준 (캐시 없음) |
| unit | `apps/commerce-core` 에서 `pnpm test` (TEST_TYPE=unit) | O | 29초 | 47 suites · 539 tests 전부 pass |
| build | `pnpm --filter commerce-core build` | O | 33초 | backend 8초 · admin frontend 31초 |
| PG 기동 | `service postgresql start` → `pg_isready` | O | 3초 | `ALTER USER postgres PASSWORD 'postgres'` 1줄로 끝 |
| pin-audit | `cd apps/commerce-core && bash scripts/it.sh pin-audit` | O | 13초 | 4/4 pass · DB 생성·삭제 스크립트가 자동 처리 |
| eslint (#385) | `npx eslint src/` (commerce-core) | 실패(exit 1) | 3초 | 7 errors · 6 warnings |

- 주의: `it.sh` 위치는 리포 루트가 아니라 `apps/commerce-core/scripts/it.sh`. 환경변수는 스크립트 기본값(`DB_USERNAME=postgres` · `DB_PASSWORD=postgres` · localhost:5432)이 그대로 맞아서 따로 export 불필요.

## 2. 실패 단계 오류 원문 (#385 eslint · 5줄)

```
src/lib/link-customer-order.ts  20:1  error  '../api/admin/pos/_shared/manager-pin' import is restricted from being used by a pattern. … no-restricted-imports
src/lib/loyalty/earn.ts  26:1  error  '../../modules/pos_settings' import is restricted from being used by a pattern. … no-restricted-imports
src/modules/payment_xendit/__tests__/qris-simulate-bk.unit.spec.ts  17:1  error  '../../../api/admin/pos/orders/[id]/qris-simulate/route' import is restricted …
src/modules/payment_xendit/__tests__/qris-xendit-bd.unit.spec.ts  22:1  error  '../../../api/admin/pos/_shared/xendit-refund' import is restricted …
✖ 13 problems (7 errors, 6 warnings)
```

같은 명령을 main `b9cdb58` 에서 돌리면 `✖ 13 problems (0 errors, 13 warnings)` → 7개 error 는 전부 #385 의 warn→error 승격으로 생김.

## 3. #385 — CHANGES

- 1차 지적 3건 **재확인 = 3건 모두 그대로 남아 있음** (위 오류 원문 1·3·4번째 줄):
  1. `src/lib/link-customer-order.ts:20` → `_shared/manager-pin`
  2. `payment_xendit/__tests__/qris-xendit-bd.unit.spec.ts:22` → `_shared/xendit-refund`
  3. `payment_xendit/__tests__/qris-simulate-bk.unit.spec.ts:17` → `orders/[id]/qris-simulate/route`
- **신규 4건** (main 머지로 들어온 loyalty 코드 · `"|modules/pos_settings"` 패턴 위반):
  `src/lib/loyalty/earn.ts:26` · `src/lib/loyalty/snapshot-earn.ts:22` · `src/lib/loyalty/__tests__/earn-offset.unit.spec.ts:7` · `src/lib/loyalty/__tests__/snapshot-earn.unit.spec.ts:12`
- 근거: PR 이 `eslint.config.ts` 에서 `"no-restricted-imports": ["warn", …]` → `["error", …]` 로 바꾸고 메시지를 "R-B1~B3 완료." 로 고쳤지만, 공용 영역의 POS import 가 7곳 남아 있어 "위반 0 → error 승격 안전" 이라는 PR 설명이 사실과 다름.
- 참고: CI 워크플로(`.github/workflows/*.yml`)에 eslint 실행이 없어서 CI 는 초록으로 나올 수 있음 — 그래서 더 위험 (로컬 `npx eslint` 만 깨짐). 이동·재수출 부분 자체는 1차 판단대로 문제 없음.
- 요구: 7곳 해소(`manager-pin` · `pos_settings` 공용 승격 또는 예외 처리, xendit 테스트 2개 이동/제외) 후 error 승격 · 아니면 이번 PR 은 warn 유지.

## 4. #386 — APPROVE

- 변경은 `integration-tests/pos/pin-audit.spec.ts` 1개(+10/−4): `isDraft: true` 추가, `pos-complete` → `POST /admin/pos/orders/${order.id}/tenders` 에 `provider_id: "pp_cash_default"` 로 바꿈 (주석: "providerToMethod 가 "cash" 반환").
- **이번엔 실제로 돌려서 확인**: `it.sh pin-audit` 4/4 pass — `✓ cash 환불 성공 시 pin_audit_log 1건 (feature:refund, outcome:success)` 포함.
- nit (블로커 아님 · 1차와 같음): tenders 호출이 `validateStatus: () => true` 로 응답을 검사하지 않음 → `expect(res.status).toBe(200)` 한 줄 권장.

## 5. 토큰/비용

확인 불가 — 세션 안에서 토큰 사용량이나 비용을 읽을 도구·환경변수가 없음.

## 6. 상시 운영 셋업 (스크립트)

```bash
git clone --depth 1 https://github.com/CuriocityDevAi/storeport ~/storeport && cd ~/storeport
git fetch --depth 50 origin pull/$PR/head:pr$PR && git checkout -q pr$PR
pnpm install --frozen-lockfile                                  # ~26초 (캐시 없음)
service postgresql start && su postgres -c "psql -c \"ALTER USER postgres PASSWORD 'postgres';\""
cd apps/commerce-core && pnpm test && bash scripts/it.sh "$SPEC"   # unit ~29초 · 통합 spec 1개 ~13초
npx eslint src/                                                  # CI 가 안 돌리므로 R0 가 직접
```

- 리포 2개를 세션에 붙인 채로 스케줄을 만들면 위 그대로 동작. 남은 과제 = 전체 통합(`it.sh` 인자 없이 · pos+loyalty 전체) 소요 시간 실측.
