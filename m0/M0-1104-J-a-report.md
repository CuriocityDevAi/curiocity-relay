---
round: M0-1104-J-a
pr:
  storeport: storeport#181
outcome: P1a 결제·영수증 서버 골격 스켈레톤 · provider 3종 등록 · 산출물 기동 BOOT OK · 검증 4 로그 전부 PASS
kyu_checks: 1 (railway-boot-stable-ja-a · PR #181 머지 후 Railway 재배포 BOOT OK + payment_provider 3종 확인)
---

# M0-1104-J-a · P1 결제·영수증 서버 골격 (B 라운드 실행)

**일자**: 2026-11-05 · **허브**: M0 · **대상**: storeport `apps/commerce-core/src/modules/{receipt,payment_cash,payment_edc_manual,payment_xendit,pos_settings,register_session}` + `links/` + `medusa-config.ts` + `package.json`/lock.

**선행**: M0-1104-J 계획 승인 (오케 11-05) · storeport PR #180 머지.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | receipt 모듈 (엔티티 · service 스켈레톤 · migration · Order link) | ✓ |
| 2 | pos_settings 모듈 (기본값: deposit_pct 100 · tax null · rounding off · reprint_limit 3 · ui_language en · footer "Thank you") | ✓ |
| 3 | payment_cash · payment_edc_manual 신규 (ModuleProvider · AbstractPaymentProvider 상속 스켈레톤) | ✓ |
| 4 | payment_xendit 재편 (standalone Module → ModuleProvider · 실 호출 J-c) | ✓ |
| 5 | register_session 확장 (expected_by_method jsonb · cash_movement.type += pay_in·pay_out) | ✓ |
| 6 | medusa-config providers 등록 블록 (pp_cash_default · pp_edc_manual_default · pp_xendit_qris_default) | ✓ |
| 7 | 산출물 기동 BOOT OK + /health 200 (상시 ⓒ) | ✓ |
| 8 | 격리 frozen-lockfile exit 0 (상시 ⓑ · xendit-node 추가 수반) | ✓ |
| 9 | ADDENDUM §2 영어 (문구·라벨·런북) | ✓ |
| 10 | 금지 (src/api/** · src/admin/** · pos-complete route) | ✓ (변경 0) |

---

## 1. 산출물 (storeport PR #181 · 26 파일 변경)

### 신규 모듈
| 모듈 | 파일 |
|------|------|
| **receipt** | `src/modules/receipt/index.ts` · `service.ts` (4 메서드 스켈레톤) · `models/receipt.ts` · `models/receipt-sequence.ts` · `migrations/Migration20261105000001.ts` |
| **pos_settings** | `src/modules/pos_settings/index.ts` · `service.ts` (DEFAULT_POS_SETTINGS + getOrCreateStoreSettings) · `models/pos-settings.ts` · `migrations/Migration20261105000002.ts` |
| **payment_cash** | `src/modules/payment_cash/index.ts` (ModuleProvider) · `services/cash-provider.ts` (AbstractPaymentProvider · static id="cash") · `services/index.ts` |
| **payment_edc_manual** | `src/modules/payment_edc_manual/index.ts` · `services/edc-manual-provider.ts` (static id="edc_manual") · `services/index.ts` |
| **Order↔Receipt link** | `src/links/order-receipt.ts` (defineLink · isList: true) |

### 기존 모듈 수정
| 파일 | 변경 |
|------|------|
| `apps/commerce-core/src/modules/payment_xendit/index.ts` | standalone `Module(...)` → `ModuleProvider(Modules.PAYMENT, {services:[XenditQrisProviderService]})` 재편 |
| `apps/commerce-core/src/modules/payment_xendit/service.ts` | **삭제** (standalone service 폐기) |
| `apps/commerce-core/src/modules/payment_xendit/services/xendit-qris-provider.ts` | 신규 AbstractPaymentProvider 구현 (static id="xendit_qris" · 실 Xendit SDK J-c) |
| `apps/commerce-core/src/modules/payment_xendit/services/index.ts` | re-export |
| `apps/commerce-core/src/modules/register_session/models/register-session.ts` | `expected_by_method: model.json().nullable()` 추가 |
| `apps/commerce-core/src/modules/register_session/models/cash-movement.ts` | `type` enum 에 `pay_in` · `pay_out` 추가 (주석 보강 · ADDENDUM §2 영어) |
| `apps/commerce-core/src/modules/register_session/migrations/Migration20261105000003.ts` | 신규 · ALTER column + check constraint 재설정 |
| `apps/commerce-core/medusa-config.ts` | **providers 등록 블록만 수정** · `@medusajs/medusa/payment` 블록 신설 · providers 3종 · receipt/pos_settings 추가 등록 · 기존 payment_xendit standalone 제거 |
| `apps/commerce-core/package.json` | `xendit-node` 추가 (J-c 선행) |
| `apps/commerce-core/pnpm-lock.yaml` | standalone lock 재생성 (M0-1104-F 교훈) |
| `docs/runbooks/payment-core.md` | 신규 (영어 · 모듈 목록 · 등록 패턴 · 마이그레이션 명령 · 검증 체크리스트 · deferred · 보안 노트) |
| `docs/feature-map.yaml` | `payment-providers` live 승격 (+ cash/edc_manual 등재) · `receipt`·`pos-settings` L2 신설 |

---

## 2. 검증 4 로그 (필수)

### 2-1. `pnpm --filter commerce-core build` PASS
```
info:    Backend build completed successfully (2.96s)
info:    Frontend build completed successfully (14.17s)
```
exit 0.

### 2-2. 격리 `pnpm install --frozen-lockfile` exit 0 (상시 ⓑ · M0-1104-F)
```
$ mkdir -p /tmp/repro && cp apps/commerce-core/{package.json,pnpm-lock.yaml,.npmrc} /tmp/repro/
$ cd /tmp/repro && pnpm install --frozen-lockfile
... + xendit-node + 기존 deps ...
Done in 10.4s
=== EXIT 0 ===
```
→ Railway Dockerfile 동일 조건 통과.

### 2-3. `npx medusa db:migrate` 성공
```
$ cd apps/commerce-core/.medusa/server
$ NODE_ENV=production DATABASE_URL=... npx medusa db:migrate
...
{"level":"info","message":"Migration scripts completed"}
```
테이블 확정: `receipt` · `receipt_sequence` · `pos_settings` · `order_order_receipt_receipt` (링크 자동) · `register_session` (+ expected_by_method) · `cash_movement` (check constraint 확장) · Medusa payment 집합.

### 2-4. 산출물 기동 `BOOT OK` + `/health 200` (상시 ⓒ · M0-1104-I)
```
$ ... npx medusa start > /tmp/boot.log &
$ sleep 25 && grep -E "BOOT OK|Server is ready" /tmp/boot.log
SENTRY disabled · SENTRY_DSN not set (set in Railway Variables to enable)
BOOT OK unknown :9998
{"activity_id":"...","duration":1979,"level":"info","message":"Server is ready on port: 9998"}

$ curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9998/health
200
```

### Provider 등록 확정
```
$ psql -d storeport_m0_1104_ja_boot -c "SELECT id FROM payment_provider ORDER BY id;"
           id
------------------------
 pp_cash_default
 pp_edc_manual_default
 pp_system_default      (Medusa 기본)
 pp_xendit_qris_default
```

### cash_movement.type check 확정
```
CHECK ((type = ANY (ARRAY['sale','pickup','adjustment','pay_in','pay_out'])))
```

### register_session.expected_by_method 컬럼 확정
```
 expected_by_method  | jsonb |
```

---

## 3. 설계 노트 (실측 재확인)

- `markPaymentCollectionAsPaid` default `pp_system_default` fallback (`@medusajs/core-flows/.../mark-payment-collection-as-paid.js:33, 63`) → J-b 는 `createPaymentSessionsWorkflow` 를 **provider_id 명시 호출** (3 providers 중 하나 지정).
- `session.data` Store API 노출 (`@medusajs/types/.../store/entities.d.ts:14-19`) → QRIS data 는 whitelist 4 필드만 (`qr_string`·`expires_at`·`reference_no`·`issuer`) · PG 키·raw 응답은 options 또는 `Payment.metadata` 격리.
- `createOrderFulfillmentWorkflow` 가 재고 차감 유일 지점 (`create-fulfillment.js:360`) → J-b 는 `order_type==='preorder'` 는 fulfillment 보류 (Serahkan/Send to production 시점까지 reservation 유지).

---

## 4. 규약 정합

| 규약 | 상태 |
|------|------|
| 주인 파일 (`modules/{...}/**` + `links/**` + `medusa-config.ts` providers 블록 + `package.json`/lock) | ✓ |
| 금지 (src/api/** · src/admin/** · pos-complete route) | ✓ |
| build PASS | ✓ |
| 산출물 기동 BOOT OK + ready + /health 200 (상시 ⓒ) | ✓ |
| 마이그레이션 성공 | ✓ |
| 격리 frozen-lockfile exit 0 (상시 ⓑ) | ✓ |
| Provider 등록 (3종) | ✓ |
| naming-check PASS (admin 예외 유지 · 모듈 코드 "meros" 0) | ✓ |
| ADDENDUM §2 영어 전부 | ✓ |
| feature-map 722/722 matched | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 5. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (P1 서버 골격 자리 확보 · J-b 실구현 의존성 해제) |
| 등재 | +2 (receipt · pos-settings feature-map L2 신설) |
| 미결 | 2 (railway-boot-stable-ja-a · Kyu 머지 후 재배포 확인 + J-b 후속 라운드 필요) |
| **총 순증감** | **-1 → Kyu 도장 시 -2** |

---

## 6. 다음 게이트

1. **Kyu**: PR #181 머지 → Railway 자동 재배포 → `BOOT OK ... · sentry on` (DSN 있으면) · provider_provider 테이블에 pp_cash_default / pp_edc_manual_default / pp_xendit_qris_default 등록 확인.
2. **M0-1104-J-b 발의** (API 실구현): `/admin/pos/orders/:id/tenders` + `/fulfill` + `/receipt{,/reprint,/send}` + `/settings` 신설 · provider 실 검증 (cash tendered · EDC 입력 필수) · `pos-complete` shim 전환.
3. **M0-1104-J-c** (Xendit): `xendit-node` 실 호출 + `/webhooks/xendit` signature 검증 · Kyu Xendit test key (1Password) 공유 선행.

---

*M0-1104-J-a · 2026-11-05 · P1a 결제·영수증 서버 골격 착지 · 26 파일 · provider 3종 등록 (pp_cash_default · pp_edc_manual_default · pp_xendit_qris_default) · 검증 4 로그 PASS · ADDENDUM §2 영어 · storeport PR #181 · Kyu 머지 대기*
