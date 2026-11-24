# PASS · M0-1124-H — POS Settings 매장 선택 PR 리베이스 + PB1/주소 상속 모델

- **대상 PR**: #420 (feat/M0-1124-G-pos-settings-location-picker)
- **원장**: `ledger/decision-multi-store-20261124.md` (Kyu 16:07 매장별 값 = 주소·PB1 적용 여부 · 나머지 브랜드 공통) · 선행 R0 리포트 `r0/R0-1124-W-report.md`
- **워크트리**: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1124-G-wt`
- **브랜치 HEAD**: `23c18df` (push 완료 2026-11-24 WIB)
- **베이스**: `origin/main` @ `61b4d18` (#418 M0-1124-E 머지 완료)

## 1. CHANGES · PR 리베이스 (지침 1)

- 기존 브랜치: 4 커밋 (E 원본 `efd6325` · F 원본 `3d41243` · merge `e3b05f3` · G `130f8fa`)
- 머지 상태: `CONFLICTING` (#418 squash 와 E 원본이 중복)
- 조치:
  1. `git reset --hard origin/main` (61b4d18)
  2. `git cherry-pick 130f8fa` → 충돌 없음 (G 변경분이 깔끔히 적용)
  3. H 변경분 신규 커밋
  4. `git push --force-with-lease` (pre-push: 605/605 tests PASS 재확인)
- **결과**: PR #420 의 커밋 = **2개**
  - `768ceca` feat(commerce-core): M0-1124-G — POS Settings 매장 선택 + custom_display_id 검색 + refund/return 영수증 주소
  - `23c18df` feat(commerce-core): M0-1124-H — POS 매장 설정 상속 (null = 키 삭제 · 브랜드 추종)
- **PR mergeable 상태**: `MERGEABLE` (`mergeStateStatus: UNSTABLE` = 체크 pending · 충돌 아님)

## 2. H · PB1/주소 상속 모델 (지침 2)

### 2.1 설계 문제 (R0-1124-W CHANGES)

G 는 "Switch On = 브랜드 pb1_pct 를 매장 row 에 **복사 저장**" 구조 → 나중에 브랜드
PB1 을 10→15 로 바꿔도 그 매장은 옛 10 에 머물러 조용히 어긋남. 운영 적용
(setup-multi-store) 전에 바로잡는다.

### 2.2 서버 (`apps/commerce-core/src/modules/pos_settings/service.ts`)

- `patchByScope` 에 `opts.nullDeletes` 옵션 추가. `patchLocationSettings` 는
  `nullDeletes:true` → `null` 값은 매장 row 에서 **해당 키를 삭제** (= 브랜드 상속).
  `patchStoreSettings` 는 기존 동작 (null = 저장) 유지.
- `getOrCreateByScope`: location scope 신규 row 는 **빈 `{}` settings** 로 생성.
  과거엔 `DEFAULT_POS_SETTINGS` 복사본으로 생성해서 모든 키가 override 처럼 보였고
  브랜드 변경이 반영되지 않는 조용한 drift 의 2차 원인이었음.
- `getForLocation` 반환 shape 확장: `{ ..., overrides }` (raw location row settings).
  store scope 호출 시 `overrides: null`. receipt/quote 등 기존 callers 는
  `.settings` 만 쓰므로 비파괴적.

### 2.3 라우트 (`apps/commerce-core/src/api/admin/pos/settings/route.ts`)

- `LOCATION_PATCH_KEYS = { store_address, pb1_pct }` 그대로 (지침: whitelist 는 2개).
- location PUT 에서 `pb1_pct: null` · `store_address: null` 은 **그대로 통과** →
  service 가 nullDeletes 로 키 삭제. store scope 에선 `store_address: null` →
  `""` 로 정규화 (기존 동작 보존).
- GET/PUT 응답 (location scope 한정) 에 `overrides` 필드 포함.

### 2.4 Admin UI (`apps/commerce-core/src/admin/routes/pos-settings/page.tsx`)

- 매장 선택 후 PB1 스위치:
  - **On = 상속** (저장 시 `pb1_pct: null`)
  - **Off = 매장 override 0** (저장 시 `pb1_pct: 0` · 영수증 PB1 줄 생략)
- 주소: 빈 입력 = 상속 (저장 시 `store_address: null`), 비빈 = override.
- **"Follows brand (…)" 힌트** 추가: 주소 빈칸 + PB1 On 상태일 때 브랜드 값을
  괄호에 노출 (지침: "브랜드 값 따름(n%)").
- `overrides` raw row 로 초기 스위치/주소 상태를 상속 여부에 맞게 복원.
- 색 하드코딩 0 (@medusajs/ui 토큰만).

### 2.5 타 항목 (지침 3 · 건드리지 않음)

- whitelist (2개 그대로)
- `custom_display_id` 검색 (orders-list `?q=`) 그대로
- refund / return mint-receipt `store.address` pass-through 그대로
- 색 토큰 그대로

## 3. 검증 로그 (지침 BUILD · 직접 실행)

### 3.1 typecheck

```
$ pnpm --filter commerce-core typecheck
> commerce-core@0.0.1 typecheck
> tsc --noEmit
(exit 0 · 에러 0)
```

### 3.2 test

```
$ pnpm --filter commerce-core test
Test Suites: 53 passed, 53 total
Tests:       605 passed, 605 total
Snapshots:   18 passed, 18 total
Time:        20.504 s
```

신규 추가 suite:
- `apps/commerce-core/src/modules/pos_settings/__tests__/location-inherit.unit.spec.ts` — **7 tests PASS**
  - patchLocationSettings({ pb1_pct: null, store_address: null }) 은 매장 row 에서 키를 **삭제**
  - **상속 매장 merged view 는 브랜드 pb1_pct 10→15 변경에 자동 추종** (지침 핵심)
  - Off 매장 (pb1_pct=0 override) 은 브랜드 PB1 변경에도 0 유지 (지침 핵심)
  - 매장 row 자체가 없으면 overrides=null 이고 merged view = brand 전체
  - 브랜드 주소 변경 → 상속 매장 merged view 도 자동 추종
  - store scope patch 는 null 을 그대로 저장 (키 삭제 안 함) · 기존 동작 보존
  - 매장 row 신규 생성 때 null 값은 생성 patch 에서 즉시 제외

확장된 suite:
- `apps/commerce-core/src/api/admin/pos/settings/__tests__/route.unit.spec.ts` — null pass-through · overrides 응답 shape 테스트 추가.

receipt·quote 경로 검증 (지침: "receipt·quote 경로가 merged view 를 쓰는지"):
- `mint-sale-receipt-pb1.unit.spec.ts` 가 `getForLocation` 의 `.settings` (= merged view) 를 그대로 사용하는 동작을 검증 중. 이 PR 의 변경은 서비스 반환 shape 을 확장만 하므로 기존 테스트 PASS 유지.

### 3.3 lint

```
$ pnpm --filter commerce-core lint
✖ 9 problems (0 errors, 9 warnings)
```

- 에러 **0**
- 경고 **9** (전부 pre-existing · 변경 파일과 무관 · unused eslint-disable directive)
  - `src/lib/loyalty/recover.ts:254`
  - `src/lib/manager-pin.ts:40,242`
  - `src/modules/payment_xendit/lib/creds.ts:137`
  - `src/modules/payment_xendit/lib/qris-simulate-handler.ts:165`
  - `src/modules/payment_xendit/lib/xendit-client.ts:102`
  - `src/subscribers/loyalty-earn-on-paid.ts:85`
  - `src/subscribers/order-snapshot-paid.ts:103`
  - `src/subscribers/register-session-order-attribution.ts:64`

### 3.4 feature-map-check

```
$ node scripts/feature-map-check.mjs origin/main HEAD
Feature-map v2 · round=M0-0917-A · project=storeport
  scanned: 1268 files → matched=1268 unmatched=0 (0.0%)
```

- 신규 파일 `apps/commerce-core/src/modules/pos_settings/__tests__/location-inherit.unit.spec.ts`
  는 feature-map.yaml 의 `commerce-core.pos-settings.files: apps/commerce-core/src/modules/pos_settings/**` 글롭에 자동 포함 (지침: processes:[commerce-core.pos-settings]).

### 3.5 git diff stat

```
$ git diff origin/main...HEAD --stat
 .../src/admin/lib/pos-settings-api.ts              |  37 +-
 .../src/admin/routes/pos-settings/page.tsx         | 707 +++++++++++--
 .../pos-settings/sections/OrderNumbersSection.tsx  |  19 +-
 .../pos/orders-list/__tests__/route.unit.spec.ts   |  88 +++
 .../src/api/admin/pos/orders-list/route.ts         |  10 +
 .../pos/settings/__tests__/route.unit.spec.ts      |  99 ++-
 .../src/api/admin/pos/settings/route.ts            |  48 +-
 .../__tests__/location-inherit.unit.spec.ts        | 226 +++++++
 .../src/modules/pos_settings/service.ts            |  50 +-
 .../src/workflows/pos-refund/steps/mint-receipt.ts |   6 +-
 .../src/workflows/pos-return/steps/mint-receipt.ts |  24 +-
 11 files changed, 1100 insertions(+), 214 deletions(-)
```

## 4. PR 본문 갱신 (지침 REPORT)

- PR #420 본문 리바이즈 완료 (`gh pr edit 420 --body ...`).
- Kyu 실기 체크리스트에 **"매장 PB1 On → 브랜드 PB1 변경 → 매장도 따라감"** 항목 추가 (지침 요구).
- 베이스/머지 순서 섹션 삭제 (#418 머지 완료 · 더 이상 유효하지 않음).
- 기술 메모 (M0-1124-H) 섹션 신설.

## 5. 수용 범위

- 운영 DB · prod SSH · railway CLI 미접근. curiocity-relay 브랜치 변경 0.
- `~/projects/curiocity-relay` 수정 없음.
- PR 자기 머지 없음 (지침: "PR 자기 머지 금지").
- /loop · 예약 깨우기 없음.
- 범위 밖 파일 수정 없음 (지침 파일 외 변경 0).
- 네이밍 3층 규약: pre-commit `naming-check` PASS (meros 매치 0 · UI 소스에만 조건부 허용 범위).

## 6. 미검증 / 미실행

- **Kyu dev 실기**: hub-m0 에서 dev slot 미할당 · 브라우저 세션 미실행. PR 체크리스트로 회부.
- **Admin UI 비주얼 회귀**: 색 토큰만 사용 (하드코딩 0) · 자동화 스냅샷은 M0-1119-V IT 외 추가 없음.

## 7. 다음 단계 (권장)

1. Kyu 실기 (6 항목) — 특히 PB1 Brand 추종 시나리오 실지 확인 (unit 커버리지 + 수동 검증 1회로 상속 모델 확정).
2. CI (unstable 체크 pending) 그린 확인 후 squash merge.
3. 머지 후 setup-multi-store `--apply` 집행 (PIM/PS 2 매장 · 매장별 pos_settings row 는 빈 settings 로 생성됨 · 주소만 override).
