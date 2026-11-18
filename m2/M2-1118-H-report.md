PR #364 · 경계 경고 19→14 · 해석 순서 불변 O · qris IT N/A (it.sh 스크립트 미존재)

## 결과 요약

| 항목 | 결과 |
|---|---|
| PR | https://github.com/CuriocityDevAi/storeport/pull/364 |
| 경계 경고 | 19 → 14 (payment_xendit 관련 0 · 5건 해소) |
| 해석 순서 불변 | O — Admin 저장 키(AES-256-GCM) 우선 → env fallback 그대로 |
| Unit tests | 528/528 PASS |
| `it.sh qris` | N/A — `apps/commerce-core/scripts/it.sh` 미존재 |
| TS 에러 (신규) | 0 (기존 admin 위젯 TS2786 에러는 사전 존재) |

## 해소된 위반 5건

1. `payment_xendit/__tests__/qris-xendit.unit.spec.ts:15` — `../../pos_settings/lib/xendit-creds`
2. `payment_xendit/lib/config.ts:3` — `../../pos_settings/lib/xendit-creds`
3. `payment_xendit/services/xendit-qris-provider.ts:36` — `../../pos_settings/lib/xendit-creds`
4. `payment_xendit/services/xendit-qris-provider.ts:37` — `../../pos_settings`
5. `payment_xendit/services/xendit-qris-provider.ts:38` — `../../pos_settings/service`

## 의존 방향 (PR 본문 3줄)

1. `resolveXenditCreds` + 암호화 유틸을 `payment_xendit/lib/creds.ts` 로 이동, `XenditSettingsReader` 인터페이스(구조적 타이핑)를 받음.
2. `xendit-qris-provider.ts` 는 IoC 컨테이너에서 `"pos_settings"` 문자열 키로 resolve 후 `XenditSettingsReader` 캐스트.
3. `pos_settings/lib/xendit-creds.ts` 는 얇은 재수출 — POS 전용 호출부 경로 변경 없음.
