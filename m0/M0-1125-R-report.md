PASS

## PR

https://github.com/CuriocityDevAi/storeport/pull/445

**브랜치**: `feat/M0-1125-R-cd-sync-server` (commit `d2df753`)
**base**: `main`

## 요약

손님화면(CD) ↔ POS 동기화 **서버 몫** (계약서 `plans/cd-sync-contract-20261125.md`). 짝 PR CD(M1-1125-T) · POS(M3-1125-R) 와 같은 계약을 공유.

### 변경 범위
- 17 files · +1624 / -2
- 범위: `apps/commerce-core` 서버 (api · modules · workflows · subscribers) + `docs/feature-map.yaml`
- Dockerfile · CD 앱 · src/admin 비변경 (M1 몫 + M0-1125-Q 가드)

### 신규
- 마이그레이션 `Migration20261125000001` — `customer_flow_state/source/first_visit/confirmed_at` 컬럼
- Lib `apps/commerce-core/src/lib/customer-flow/{transitions,orchestrator}.ts`
- API `apps/commerce-core/src/api/customer-display/customer-flow/route.ts` (CD 인증 · 7 action)
- API `apps/commerce-core/src/api/admin/pos/customer-flow/route.ts` (POS · link_phone/reset)
- 테스트 4개 파일 · 92 tests

### 수정
- `types/customer-display.ts` — PaymentPhase · CustomerFlowState · CustomerFlow · CustomerFlowTender · CustomerFlowAction 타입
- `register_session/lifecycle.ts` — `serializeSnapshot` 에 payment_phase · customer_flow · tender 추가
- `register_session/service.ts` — `setCustomerFlow` 메서드
- `subscribers/loyalty-earn-on-paid.ts` — `customer_flow_state='confirmed'` 가드 (§3 적립 규칙)
- `customer_display_settings/service.ts` — getDisplayConfig 가 pb1_pct 를 활용(라벨-금액 동일 소스)
- `api/middlewares.ts` — `/customer-display/customer-flow` device-token matcher 추가

## 테스트 로그

```
pnpm -C apps/commerce-core typecheck
  → 0 errors

pnpm -C apps/commerce-core test
  Test Suites: 71 passed, 71 total
  Tests:       830 passed, 830 total
  Snapshots:   18 passed, 18 total
  Time:        36.181 s

  신규 4 suites · 92 tests:
    transitions.unit.spec.ts         · 58 (허용·거부 전이)
    orchestrator.unit.spec.ts         · 12 (적립 4경우 + 멱등 + submit_phone 분기 + POS)
    customer-flow-dto.unit.spec.ts    · 12 (serializeSnapshot 신규 필드)
    display-config-pb1.unit.spec.ts   ·  4 (PB1 라벨 소스)

pnpm -C apps/commerce-core lint
  → 0 errors (9 pre-existing warnings · 신규 0)

node scripts/feature-map-check.mjs
  → 1312 files scanned · 0 unmatched

bash scripts/naming-check.sh
  → PASS (meros 매치 0 · 모듈명 규격 · [...x] 없음 · 동명 migration 없음)
```

## Standalone 설치 검증 (#442 교훈)

```
$ mktemp -d /tmp/standalone-M0-1125-R-XXXX
$ cp -R apps/commerce-core/* $TMPDIR/
$ cd $TMPDIR && pnpm install --frozen-lockfile --ignore-workspace

Lockfile is up to date, resolution step is skipped
Already up to date
Done in 886ms
```

PASS — `@storeport/receipt-view-model` 서버 런타임 import 없음, 타입은 로컬 정의 (#442 준수).

## 전이 표 테스트 결과 요약

### 허용 전이 (계약 §2 · 전부 PASS)

| current | action | next |
|---|---|---|
| none / skipped | start_entry | entering |
| entering | submit_phone (is_new=true) | first_visit |
| entering | submit_phone (is_new=false) | confirming |
| first_visit | continue_first_visit | confirming |
| first_visit / confirming | change_number | entering |
| confirming | confirm | confirmed |
| entering / none | skip | skipped |
| confirming | confirm_timeout | unconfirmed |
| 모든 상태 (7종) | link_phone | confirming |
| 모든 상태 (7종) | reset | none |

### 거부 전이 (sampled · 총 42개 pending 조합 전부 PASS)
- `none + confirm` → invalid_transition
- `confirming + submit_phone` → invalid_transition
- `confirmed + confirm` → invalid_transition (멱등 경계)
- `skipped + submit_phone` → invalid_transition
- etc.

응답 형식 통일: 거부 전이 = `200 {ok:false, reason:'invalid_transition', customer_flow}` (상태 코드 비분기 · #438 방식).

### 적립 4경우 (계약 §3)

| 시나리오 | linkCustomerToOrder 호출 | earn_triggered | 결과 |
|---|---|---|---|
| paid → confirm | 1회 | true | 즉시 적립 (경로 1) |
| confirm → paid | 1회 (isCompleted=false, no earn) | false | subscriber 가 나중 적립 (경로 2) |
| confirm_timeout → unconfirmed | 0회 | false | 적립 없음 |
| confirm 이후 중복 confirm 이벤트 | 1회 (두 번째는 invalid_transition) | — | 멱등성 보장 |

Subscriber 가드(`loyalty-earn-on-paid`): `customer_flow_state` 저장돼 있으면 `'confirmed'` 만 통과 → `skipped`/`unconfirmed`/`confirming` 은 payment.captured 로 들어와도 적립 없음.

## PB1 라벨 진단 결과

### 어디서 "11" 이 왔는지

**뿌리 = `apps/customer-display/app/index.tsx:128` + `apps/customer-display/app/mirror.tsx:21` 하드코딩 fallback `taxRate: 11`.**

```ts
// apps/customer-display/app/index.tsx:126-134
const DEFAULT_LIVE_STORE: StoreConfig = {
  storeName: "",
  taxLabel: "PB1",
  taxRate: 11,   // ← 하드코딩된 fallback
  ...
};
```

**트리거 경로**:
1. CD 앱 라이브 모드가 `GET /customer-display/display-config` 응답을 받음
2. 응답 `tax_rate` 가 `null` 이면 CD 가 `DEFAULT_LIVE_STORE.taxRate = 11` 로 폴백
3. 서버의 `getDisplayConfig` 는 `tax_rate = posSettings.tax_rate_pct ?? null` 로 썼다 (PKP 전용 필드 · 미설정이 기본)
4. 운영 매장은 `pb1_pct = 10` (영수증·금액 계산 소스) 로 저장돼 있어 **금액은 10% 로 정확**, 그런데 `tax_rate_pct` 는 미설정이라 서버 응답은 null → CD 가 "11%" 라벨 노출
5. 결과: 라벨 11 · 금액 10% (120,000 → 12,000) 어긋남

### 수정 (금액 계산 무변경)

`getDisplayConfig` 가 라벨·세율을 금액과 **같은 소스**에서 뽑도록 변경:

- `pb1_pct > 0` 매장 → `tax_label="PB1"` · `tax_rate=pb1_pct` (실제 적용 세율과 동일 소스)
- `pb1_pct = 0` + PKP 토글 → 기존 `tax_label`/`tax_rate_pct` 폴백 유지
- 금액 계산 로직 (`tenders/route.ts` · `receipt/service.ts` · `receipt-preview.ts`) **비변경** (이미 10% 정확)

이 변경만으로도 CD 앱 fallback `11` 은 더 이상 발화하지 않음 (서버가 올바른 값을 제공).

### 운영 DB 조치 필요 여부

**필요 없음.** 코드 기본값/시드에 `11` 저장 지점 없음:
- `DEFAULT_POS_SETTINGS.pb1_pct = 0` (OK)
- `DEFAULT_LOYALTY_SETTINGS` 에 PB1 관련 11 없음 (OK)
- `setup-multi-store` CLI 는 `--ps-pb1 off|on|inherit` 세 모드만, 숫자 11 쓰지 않음 (OK)
- CD 앱 mock `DEFAULT_STORE.taxRate = 10` (OK · 라이브 fallback 과 별개)
- 운영 CD 앱의 하드코딩 `11` (index.tsx:128 · mirror.tsx:21) 은 M1 담당 — 향후 CD 앱 PR 에서 10 으로 정렬 권장 (지금은 서버 응답이 올바르므로 fallback 미발화)

만약 운영 DB `pos_settings.pb1_pct` 가 `11` 로 저장돼 있다면 (operator 입력 실수 · 확률 낮음 — 그랬다면 금액도 13,200 이 돼야 하는데 12,000 이 나오므로) **Kyu Admin 에서 10 으로** 변경 바람.

## CI 상태 (push 후 1회)

```
changes-filter                                pending
check                                         pending
docker-build-commerce-core (ubuntu)           pending
markers-and-forbidden                         pending
route                                         pending
```

(지시 §[REPORT] 대로 1회만 캡처 · 승인/머지 없음)

## 승인 상태

- PR 생성 완료 (#445) · 승인 **대기**
- 셀프 머지 **없음**
- 짝 PR (M1-1125-T CD 앱 · M3-1125-R POS) 와 통합 검증 후 Kyu 승인 → T0 착지
