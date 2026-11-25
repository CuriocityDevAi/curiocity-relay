# M0-1125-G · setup-multi-store 컨테이너 안 실행 명령 확정

PASS

읽기·조사만 수행 (src 미수정 · Railway/SSH/DB 미접근). 원장 `curiocity-relay/ledger/decision-ps-store-20261125.md` (PIM/PS 정식 이름·주소) 기준으로 `railway ssh --service commerce-core` 로 컨테이너 안에서 실행할 3블록 확정.

---

## 1. 컨테이너 안 실행 경로 (사실 확인)

**배포 방식** — `apps/commerce-core/Dockerfile` (3-stage · Node 20-alpine · multi-stage) 를 `railway.json:3-4` 가 `dockerfilePath` 로 지정. 빌드 컨텍스트 = 레포 루트. 커스텀 `startCommand` 없음 → Dockerfile `CMD` 로 가동.

**runtime 스펙** (`apps/commerce-core/Dockerfile`):
- `WORKDIR /app/.medusa/server` (108)
- `CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]` (124)
- runtime `node_modules` = builder 에서 `.medusa/server` 안에 `pnpm install --prod --frozen-lockfile --prefer-offline` 로 미리 설치 (96-99) 후 통째 COPY (112). **devDependencies 제외.**

**컨테이너 안 작업 디렉터리** = `/app/.medusa/server` (= `process.cwd()`). `railway ssh --service commerce-core` 접속 시 기본 CWD 도 Dockerfile WORKDIR 그대로.

**스크립트 형태 확인** (로컬 `.medusa/server/src/scripts/` 실측 · `medusa build` 산출):
```
.medusa/server/src/scripts/setup-multi-store.js   (← 컴파일된 JS · 컨테이너 안 이것만 존재)
.medusa/server/src/scripts/seed-soopsok.js
.medusa/server/src/scripts/check-admin-users.js
.medusa/server/src/scripts/backfill-phone-customer-name.js
```

**devDependencies 확인** (`apps/commerce-core/package.json:49-67`): `ts-node`·`typescript`·`@swc/*`·`jest` 등은 전부 devDependencies → prod 이미지에서 빠짐. **컨테이너 안에서 `.ts` 실행 불가**. `.js` 만 가능.

**CLI 호환 동작** (`node_modules/@medusajs/cli/cli.js:3-13`): `require("ts-node").register({})` 실패를 `try/catch` 로 흡수 · `NODE_ENV === "production"` 이면 경고도 억제 → prod 에서 JS-only 로드로 정상 동작.

---

## 2. `medusa exec` 실행 모델 (근거 코드)

**CLI 선언** (`node_modules/@medusajs/cli/dist/create-cli.js:555-564`):
```js
.command({
  command: `exec [file] [args..]`,
  desc: `Run a function defined in a file.`,
  handler: handlerP(getCommandHandler(`exec`, ...))
})
```

**yargs 전역 설정** (같은 파일 `:655`): `.strict()` — 알 수 없는 플래그는 에러. **`--apply` 등 커스텀 플래그는 yargs 가 "unknown option" 으로 거부**. 따라서 **`--` 구분자 필수** (yargs 가 `--` 뒤부터는 플래그 파싱 중단 → 전부 variadic positional `args..` 로 흘러들어감).

**exec handler** (`node_modules/@medusajs/medusa/dist/commands/exec.js:45-78`):
```js
async function exec({ file, args }) {
  ...
  const filePath = path.resolve(directory, file);   // directory = process.cwd()
  if (!existsSync(filePath)) throw new Error(...);
  const scriptToExec = (await dynamicImport(path.resolve(filePath))).default;
  ...
  await scriptToExec({ container, args });          // ← args 는 yargs 가 채운 positional 배열
}
```

→ `exec("./src/scripts/setup-multi-store.js")` 호출 시 `file` positional 에 담김. `--` 뒤 토큰들은 `args: string[]` 로 default export 함수에 그대로 전달.

**스크립트 default export** (`apps/commerce-core/src/scripts/setup-multi-store.ts:151-157`):
```ts
export default async function setupMultiStore({ container, args }: ExecArgs) {
  ...
  const parsed = parseArgs(Array.isArray(args) ? args : []);
```

**parseArgs 로직** (같은 파일 `:60-94`): raw 토큰을 순회하며 `--apply`·`--pim-name`·`--pim-address`·`--ps-name`·`--ps-address`·`--pim-id` 를 인식. 즉 `args = ["--apply", "--pim-name", "Soopsok Sweets PIM3", ...]` 형태로 넘어오면 됨. **`--` 를 빼먹으면 yargs strict 가 먼저 거부 → 스크립트까지 도달 못 함**.

**docstring 자체도 `--` 사용** (같은 파일 `:17-23` 스크립트 머리말):
```
pnpm --filter commerce-core exec medusa exec ./src/scripts/setup-multi-store.ts -- \
  --apply --pim-name "PIM" ...
```

---

## 3. 따옴표 안전성 (sh/ash · alpine)

원장 주소 두 건 문자 집합 전수:
- PIM: `P·d·.·공백·I·n·a·h·M·l·3·,·J·K·r·t·i·k·U·0·1·L·G·R·T·6·W·/·-·숫자` …
- PS: `J·l·.·A·s·i·a·f·r·k·N·o·8·,·R·T·W·G·e·K·c·m·t·n·b·u·P·D·h·I·0·7·2·공백·/`

`$` · 백틱 · `\` · `!` · `"` 전혀 없음. 쉼표·마침표·슬래시·공백은 전부 **쌍따옴표 안에서 리터럴**. alpine `sh`(busybox ash) · bash 모두 안전.

---

## 4. Kyu 가 그대로 붙여넣을 명령 3블록

### (a) 컨테이너 진입 + 위치 확인
```sh
railway ssh --service commerce-core
```
접속 뒤 안쪽 shell 에서 1줄:
```sh
pwd && ls -la src/scripts/setup-multi-store.js && which npx && node -v
```
기대: `pwd = /app/.medusa/server` · 파일 존재 · `npx = /usr/local/bin/npx` · Node `v20.x`.

### (b) dry-run (DB 변경 0 · 수행 예정 사항만 로그 출력)
```sh
npx medusa exec ./src/scripts/setup-multi-store.js
```
읽기 전용 — 현 매장 목록 · rename 예정 pair · PS 생성 예정 · inventory level 예정 · 주소 저장 예정 만 로그. **인자 없음 = `--apply` 없음 = dry-run** (스크립트 기본값 `SETUP_MULTI_STORE_DEFAULTS.apply = false`).

### (c) apply (원장 표 값 그대로)
```sh
npx medusa exec ./src/scripts/setup-multi-store.js -- --apply --pim-name "Soopsok Sweets PIM3" --pim-address "Pd. Indah Mall 3, Jl. Kartika Utama No.11 Lt. LG, RT.6/RW.3, Pd. Pinang, Kec. Kebayoran Lama, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12310" --ps-name "Soopsok Sweets Plaza Senayan" --ps-address "Jl. Asia Afrika No.8, RT.1/RW.3, Gelora, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10270"
```

핵심 포인트:
- `./src/scripts/setup-multi-store.js` (`.ts` 아님 · 컴파일된 JS)
- 작업 디렉터리 = `/app/.medusa/server` (= Dockerfile `WORKDIR`) · 이 CWD 에서 상대경로 그대로 유효
- `--` 구분자 **필수** (yargs strict 가 `--apply` 를 unknown option 으로 거부)
- 인라인 `#` 주석 금지 (요청 사항 준수)

---

## 5. selectPimTarget 검증 (pimName="Soopsok Sweets PIM3" 시)

**현재 PIM 추정 이름 = "Soopsok Store (Jakarta)"** (스크립트 머리말 `:6` · 단위테스트 `:68` · seed 기본값).

`selectPimTarget` 분기 (`src/scripts/setup-multi-store.ts:109-149`):
1. `byName` = existing 중 `name === "Soopsok Sweets PIM3"` → **없음** (초기 상태).
2. candidates = existing.filter(name !== "Soopsok Sweets Plaza Senayan") → 초기 상태에서 PS 미존재 → candidates = 전체 existing. **매장이 정확히 1개** (Soopsok Store (Jakarta)) 이면 kind="found" 반환 ✓
3. 2번째 apply (멱등 재진입) → PS 이미 존재 상태에서 byName="Soopsok Sweets PIM3" 매치 → kind="found" (이름 이미 일치 · rename skip) ✓

**단위테스트 `__tests__/setup-multi-store.unit.spec.ts:67-96` 가 이 두 케이스 모두 실증**. pimName 값만 바뀌어도 동일 로직 적용.

**리스크**: 운영 DB 에 매장이 2개 이상 (예: 과거 seed 잔재 · 테스트 매장 · 예상치 못한 location) 이고 그 중 PS 이름도 아니면 `kind="abort"` + 후보 목록 출력. 그 경우 dry-run 로그 상단의 `existing stock locations:` 섹션에서 id 를 확인한 뒤:
```sh
npx medusa exec ./src/scripts/setup-multi-store.js -- --apply --pim-id sloc_xxxxxxxxxx --pim-name "Soopsok Sweets PIM3" --pim-address "..." --ps-name "Soopsok Sweets Plaza Senayan" --ps-address "..."
```
로 직접 지정. **반드시 dry-run 로그를 먼저 확인한 뒤 apply 로 넘어갈 것.**

---

## 6. 멱등성 판정 (apply 두 번 돌릴 수 있나)

**결론: 부분 멱등 — 재실행 금지 (DB 변경 실패 지점 존재).** 1회 apply 로 완주 후 Admin 에서 확인하는 것이 안전. 재실행 필요 시 수작업으로 사전 정리 후.

| 스텝 | 가드 | 재실행 결과 |
|---|---|---|
| 1. PIM rename | `pimTarget.name !== parsed.pimName` 체크 (`setup-multi-store.ts:194-207`) | ✓ skip (이름 이미 일치) |
| 2. PS create | `existing.find(name === psName)` 체크 (`:212-227`) | ✓ skip |
| 3. sales channel ↔ PS link | **가드 없음** · `linkSalesChannelsToStockLocationWorkflow({ add: [defaultSc.id] })` 재호출 (`:240-245`) | △ `associateLocationsWithSalesChannelsStep` → `remoteLink.create()` (`@medusajs/core-flows/dist/sales-channel/steps/associate-locations-with-channels.js:25-35`) · Medusa RemoteLink 구현에 따라 duplicate upsert 로 흡수 가능성 있으나 **확정 못 함** |
| 4. inventory levels | **가드 없음** · 전체 inventory items 에 대해 `createInventoryLevelsWorkflow` 재호출 (`:256-266`) | ✗ **실패 가능성 높음** — `validateInventoryLocationsStep` 은 location 존재만 체크 (`@medusajs/core-flows/dist/inventory/steps/validate-inventory-locations.js:12-25`) · 실제 생성은 `createInventoryLevelsStep` → `service.createInventoryLevels()` 로 바로 insert. `inventory_level` 테이블의 `(inventory_item_id, location_id)` unique 제약 위반 예상 |
| 5. pos_settings store_address | `patchLocationSettings` (CM 자체 메소드) | ✓ 추정 upsert (매장별 1 row · PK=location_id) |

**고칠 점 제안 (코드 수정은 하지 않음 · 원장용 메모만)**:
- 스텝 3: `remoteLink.list(filter)` 로 기존 link 조회 후 add 리스트 축소. 또는 workflow 결과를 try/catch 로 흡수.
- 스텝 4: 이미 inventory_level 이 있는 (item, PS) pair 는 `filter` 로 제외. `inventoryModule.listInventoryLevels({ location_id: psId })` 선조회 후 `inventoryItems` 와 차집합.
- 양쪽 다 `--force` 옵션 혹은 선행 조회 분기 추가하면 완전 멱등 가능.

---

## 7. 사후 수작업 (스크립트가 안 하는 것 · 원장 재확인)

apply 성공 후 Admin UI 에서:
- PS 매장 PB1 세금 끄기 (매장 override · 기본은 브랜드 PB1 상속)
- PS 매장 닉네임 지정 (주문번호 접두)

원장 `decision-ps-store-20261125.md:15` 명시.

---

## 참고 근거 파일 요약
- `/Users/kyu.lee/projects/storeport/railway.json:3-4` — Dockerfile path · watchPatterns
- `/Users/kyu.lee/projects/storeport/apps/commerce-core/Dockerfile:108,112,124` — WORKDIR · runtime COPY · CMD
- `/Users/kyu.lee/projects/storeport/apps/commerce-core/Dockerfile:96-99` — `pnpm install --prod --frozen-lockfile` (devDeps 제외)
- `/Users/kyu.lee/projects/storeport/apps/commerce-core/package.json:49-67` — devDependencies 목록 (ts-node 등)
- `/Users/kyu.lee/projects/storeport/apps/commerce-core/src/scripts/setup-multi-store.ts:60-94,109-149,151-305` — parseArgs · selectPimTarget · main
- `/Users/kyu.lee/projects/storeport/apps/commerce-core/src/scripts/__tests__/setup-multi-store.unit.spec.ts:67-96` — selectPimTarget 케이스 검증
- `/Users/kyu.lee/projects/storeport/apps/commerce-core/.medusa/server/src/scripts/setup-multi-store.js` — 컴파일 산출 실측
- `node_modules/@medusajs/cli/dist/create-cli.js:555-564,655` — `exec [file] [args..]` 선언 · `.strict()`
- `node_modules/@medusajs/cli/cli.js:3-13` — ts-node register try/catch · NODE_ENV=production 경고 억제
- `node_modules/@medusajs/medusa/dist/commands/exec.js:45-78` — exec 본체 (dynamicImport · args 전달)
- `node_modules/@medusajs/core-flows/dist/stock-location/workflows/link-sales-channels-to-stock-location.js` — 링크 workflow
- `node_modules/@medusajs/core-flows/dist/sales-channel/steps/associate-locations-with-channels.js:20-36` — remoteLink.create
- `node_modules/@medusajs/core-flows/dist/inventory/workflows/create-inventory-levels.js` + `steps/create-inventory-levels.js:10-20` + `steps/validate-inventory-locations.js:12-25` — inventory levels workflow (중복 가드 없음)
- `/Users/kyu.lee/projects/curiocity-relay/ledger/decision-ps-store-20261125.md:4-5,10-15` — PIM/PS 정식 이름·주소·사후 수작업
