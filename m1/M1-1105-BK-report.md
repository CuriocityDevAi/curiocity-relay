# M1-1105-BK Report — resolveXenditCreds 단일화

## 통합 구조

| 경로 | 변경 |
|------|------|
| `pos_settings/lib/xendit-creds.ts` | canonical · `svc\|null` 허용 · POS_SECRETS_KEY 우선 · console.warn 추가 · XENDIT_SECRET_KEY fallback |
| `payment_xendit/lib/config.ts` | 기존 동기 함수 삭제 → xendit-creds.ts re-export |
| `payment_xendit/services/xendit-qris-provider.ts` | `resolveCreds()` async · container → POS_SETTINGS_MODULE → resolveXenditCreds |
| `api/hooks/payment/xendit/route.ts` | webhook token: env 직접 → resolveXenditCreds(posSettingsSvc).webhook_token |
| `api/admin/pos/_shared/xendit-refund.ts` | import 교체 + async resolveXenditCreds(container.resolve) |

## 바뀐 호출부 목록

1. `payment_xendit/services/xendit-qris-provider.ts` — resolveCreds() async 전환 + container 주입
2. `api/hooks/payment/xendit/route.ts` — webhook token을 pos_settings에서 읽도록
3. `api/admin/pos/_shared/xendit-refund.ts` — 동기→async resolveXenditCreds
4. `payment_xendit/__tests__/qris-xendit.unit.spec.ts` — 기존 동기 테스트 → BK 통합 테스트 4개
5. `api/hooks/payment/xendit/__tests__/webhook-route.unit.spec.ts` — pos_settings stub 추가

## 테스트

| Suite | 개수 | 결과 |
|-------|------|------|
| qris-xendit.unit.spec.ts | 41 | ✓ |
| xendit-creds.unit.spec.ts | 15 | ✓ |
| webhook-route.unit.spec.ts | 12 | ✓ |
| 기타 | - | ✓ |
| **합계** | **68** | **전부 통과** |

TypeScript `tsc --noEmit`: 오류 없음.

## CI run

GitHub Actions CI가 `feat/m1-1105-bj-xendit-admin` 브랜치에서 trigger되지 않음 (API 조회 0 runs). 원인: 이 레포의 ci.yml은 Dockerfile/package.json 변경 시 docker-smoke만 실행하며 commerce-core docker-smoke는 `if: false` 비활성 상태. `markers-and-forbidden` 잡은 항상 실행 예정이나 이 브랜치에서는 trigger 미작동 확인. 로컬 테스트 68개 통과 + tsc clean으로 대체 검증.

커밋:
- `c4af760` feat(pos-settings): M1-1105-BK · resolveXenditCreds 단일화
- `c709fd4` fix(test): M1-1105-BK · webhook-route mock에 pos_settings stub 추가
- `ba52320` ci: trigger CI check (M1-1105-BK)

PR #233 코멘트: https://github.com/CuriocityDevAi/storeport/pull/233#issuecomment-6829308989
