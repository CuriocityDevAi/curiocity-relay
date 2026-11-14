# R0-1105-EI 리뷰 리포트 — storeport #255 · @medusajs/loyalty-plugin 2.17.2 설치

**판정: APPROVE** — R1 범위(설치·migrate·스모크) 5개 체크포인트 모두 통과. 소수 follow-up 사항 기재.

head: 5860c76 · 검토일: 2026-11-15

---

## REQ 1 — 운영 영향

### 신규 테이블 (migrate 생성)
PR 본문 실측 6종:
- `store_credit_account`
- `store_credit_account_transaction` (amount numeric · IDR 정수 저장 가능)
- `loyalty_gift_card`
- `loyalty_gift_card_store_credit_store_credit_account` (junction · auto-link)
- `cart_cart_loyalty_gift_card` (junction · auto-link)
- `order_order_loyalty_gift_card` (junction · auto-link)

auto-link 2종(`cart_`, `order_`)은 기존 cart/order 컬럼 변경 없이 junction 테이블 추가만. Medusa auto-link 패턴상 기존 테이블 스키마 직접 변경 없음.

> ⚠️ **문서 불일치**: `medusa-config.ts` 주석은 "5종"으로 적고 (`store_credit_transaction_group` · `loyalty_gift_card_invitation`) 있으나 PR 본문 실측 목록과 테이블명이 다름. 주석 수정 권고 (R2 또는 follow-up 커밋).

### 롤백 절차
PR 본문에 접근 방식 기재 O ("plugin npm 제거 → down 마이그레이션 수동 실행 필요. 운영 데이터 유입 전이면 drop 안전"). 단, 구체적 명령어(`medusa migrations revert` 등)가 미기재. 운영 배포 전 R2에서 보완 권고.

### 판단
idempotent migrate · 기존 테이블 락 없음 · 롤백 접근 O → **통과**

---

## REQ 2 — 버전 고정 및 lockfile

| 항목 | 결과 |
|------|------|
| 버전 고정 | `@medusajs/loyalty-plugin: 2.17.2` 정확히 pin (caret 없음) |
| peerDeps 정합 | lockfile snapshot: `admin-sdk@2.17.2`, `cli@2.17.2`, `dashboard@2.17.2`, `framework@2.17.2`, `test-utils@2.17.2`, `ui@4.1.19`, `react-router-dom@6.30.4` — 모두 commerce-core 기존 pin과 일치 |
| lockfile 변경 범위 | pnpm-lock.yaml: importer 3줄 + package entry 34줄 + snapshot 20줄. 플러그인 관련만. 루트 lock 포함 diff 확인 — 타 패키지 버전 변동 없음 |
| 신 peer warning | `@medusajs/icons` 2.22.3 설치 vs 플러그인 peerDep 요구 2.17.2. **단, icons는 optional peer** (peerDependenciesMeta optional: true) → installed 2.22.3 그대로 사용. PR 본문 "기존 선존 상태" 표기는 약간 오도적 — loyalty-plugin 추가로 비로소 발생하는 경고이나 optional이므로 기능 무영향 |

**판단: 통과**

---

## REQ 3 — Admin 번들 / MEROS i18n 충돌

PR 본문: 플러그인 번들 `.medusa/server/src/admin/index.mjs`에 "Store Credits" · "Gift Cards" label 포함 확인.

**`medusa build` 로그 미첨부** — PR 본문이 "Railway 배포 후 / R2 smoke 몫"으로 명시적 defer. R1 범위 내 빌드 증거 없음.

#249 i18n 오버라이드 충돌 여부: 직접 검증 없음. 단 Medusa i18n 오버라이드는 기존 namespace의 키 덮어쓰기 방식 — 플러그인이 새 route/menu를 추가하는 것과 충돌 경로가 다름. 현 아키텍처상 충돌 가능성 낮으나 미확인.

> ⚠️ **Follow-up 권고**: R2 배포 후 `medusa build` 로그(warning 0 확인) + Admin 시크릿 창 "Store Credits" 메뉴 렌더 스크린샷 첨부.

**판단: R1 범위 내 허용 · 통과** (R2 보완 권고)

---

## REQ 4 — 스모크 테스트 실 플러그인 사용 여부 · CI 결과

### 테스트 실 플러그인 여부
`medusaIntegrationTestRunner` (`@medusajs/test-utils` 공식 러너) 사용 — 실 Postgres boot. `container.resolve("store_credit")` 로 실제 모듈 resolve. 모킹 없음. 2/2 로컬 pass 확인.

### CI job 결과

| job | 결과 | 시간 |
|-----|------|------|
| pos-integration | ✅ pass | 6분 20초 |
| unit-commerce-core | ✅ pass | 1분 0초 |
| check | ✅ pass | 14초 |
| markers-and-forbidden | ✅ pass | 7초 |
| changes-filter | ✅ pass | 8초 |
| docker-smoke-* | ⏭ skipping (변경 없음) | — |
| **test:integration:loyalty** | **CI 미편입** | — |

> ⚠️ **loyalty CI 미편입**: PR 본문 명시 — "CI 편입은 R2 범위". 로컬 실 Postgres에서만 통과. pos-integration CI는 loyalty 테이블 무관 범위이므로 regression 없음.

**판단: R1 범위 내 허용 · 통과** (R2 CI 편입 필요)

---

## REQ 5 — 기존 결제 라우트·웹훅 변경 0 확인

diff 대상 파일:
- `integration-tests/loyalty/store-credit-smoke.spec.ts` (신규)
- `jest.config.js` (loyalty 매트릭스 추가)
- `medusa-config.ts` (plugins 배열 loyalty 추가만)
- `package.json` (dependency 추가)
- `docs/feature-map.yaml` (loyalty L2 entry 추가)
- `pnpm-lock.yaml`

payment providers · tenders · refund · void · xendit webhook 관련 파일 **변경 없음**. PR 본문 명시: "기존 결제 흐름 ... 수정 0".

**판단: 완전 통과**

---

## 종합

| REQ | 판정 |
|-----|------|
| 1 운영 영향 | ✅ 통과 (테이블 주석 불일치 follow-up) |
| 2 버전 고정·lockfile | ✅ 통과 |
| 3 Admin 번들 | ✅ 통과 (R2 빌드 로그 보완 권고) |
| 4 스모크 테스트·CI | ✅ 통과 (loyalty CI 편입은 R2) |
| 5 결제 무변경 | ✅ 통과 |

**APPROVE** — R1(설치·migrate·스모크) 목적 충족. R2 follow-up: ① loyalty CI 편입 ② Admin 빌드 로그 첨부 ③ 롤백 exact 명령어 문서화 ④ medusa-config.ts 테이블 목록 주석 수정.
