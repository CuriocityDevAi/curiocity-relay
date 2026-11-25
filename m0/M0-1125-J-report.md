PASS

## M0-1125-J — setup-multi-store CLI 인자 무시 버그 수정

**PR**: https://github.com/CuriocityDevAi/storeport/pull/434
**브랜치**: `feat/M0-1125-J-setup-multi-store-args`
**머지 상태**: 셀프 머지 금지 — T0 소관 (CI green).

---

## 원인 (파일 : 줄 · 재현 출력)

`@medusajs/cli@2.17.2` 가 등록한 `exec [file] [args..]` 커맨드는 전역 `.strict()` 로 돌면서 **populate-- 를 안 켬**. yargs 17 의 default 는 `--` 뒤 토큰을 `_` (positional) 로 밀어넣는 것이라 `args..` positional 이 비어버림 → `ExecArgs.args = []`.

- 파일: `node_modules/.pnpm/@medusajs+cli@2.17.2_@types+node@20.19.43/node_modules/@medusajs/cli/dist/create-cli.js:556`
  - `command: 'exec [file] [args..]'` · `parserConfiguration` 없음
  - 전역 `.strict()` on `dist/create-cli.js:655`
- 참고: `node_modules/.pnpm/@medusajs+medusa@2.17.2.../dist/commands/exec.js:45` · `async function exec({ file, args })` — `args` 를 그대로 destructure 해서 스크립트에 전달.

### 로컬 재현 (yargs 17.7.2 · CLI 와 동일 버전)

```
=== without -- ===
cmd: npx medusa exec ./script.js --pim-name PIM3 --ps-pb1 off
FAIL: Unknown arguments: pim-name, pimName, ps-pb1, psPb1

=== with -- ===
cmd: npx medusa exec ./script.js -- --pim-name PIM3 --ps-pb1 off
argv.file = "./script.js"
argv.args = []        ← 버그: args.. positional 이 비어버림
argv._    = ["exec","--pim-name","PIM3","--ps-pb1","off"]
argv["--"]= undefined
```

→ `--` 없으면 strict 실패, `--` 있으면 args 빈 배열. Kyu 운영 명령 (`-- --pim-name "Soopsok Sweets PIM3" ...`) 은 후자에 해당 → **모든 플래그 무시 · default 사용**. apply 였으면 운영 매장 이름이 "PIM", 주소가 "Pondok Indah Mall, Jakarta" 로 덮어씌워질 뻔.

---

## 수정 (세 겹)

파일: `apps/commerce-core/src/scripts/setup-multi-store.ts`

1. **`extractArgvFromProcess`** · `process.argv` 에서 `setup-multi-store(\.(c|m)?[jt]s)?$` 매칭 토큰 뒤를 뽑고 `--` 토큰 제거. `resolveSetupArgs` 가 `ExecArgs.args` 가 비면 이걸로 복구.
2. **`parseEnvFlags`** · `SMS_APPLY` · `SMS_PIM_NAME` · `SMS_PIM_ADDRESS` · `SMS_PS_NAME` · `SMS_PS_ADDRESS` · `SMS_PS_PB1` · `SMS_PS_NICKNAME`. 우선순위: **CLI arg > env > default**. `SMS_APPLY` 는 `1` / `true` 만 허용 (대소문자 무시).
3. **`assertSafeApply`** · apply 모드에서 `pim-name` · `pim-address` · `ps-name` · `ps-address` 중 하나라도 **default** 출처면 즉시 `ArgParseError` throw. 사고 방지.

또 `parseCliFlags` 에 `requireValue` 가드 추가 — `--pim-name --apply` 처럼 값 자리에 플래그가 오면 거절 (기존 `val ?? out.pimName` 이 default 로 "삼키던" 미세 버그도 함께 수정).

dry-run 머리말에 `raw process.argv` · `raw ExecArgs.args` · `resolved argv` · `env 사용 키` · 각 값의 출처 (arg/env/default) 를 로그.

**기존 공개 API `parseArgs(argv)` 는 유지** (defaults + CLI 병합) — 외부 호출자 영향 없음.

---

## 수정 후 재현 출력 (end-to-end · yargs 17 로 CLI 재현)

Kyu 2026-11-25 13:23 운영 명령 그대로 시뮬레이션:

```
[CLI] file = "./src/scripts/setup-multi-store.js"
[CLI] ExecArgs.args = []                    ← medusa CLI 버그 그대로 재현

[FIX] usedProcessArgvFallback = true        ← process.argv 로 복구 발동
[FIX] argv = ["--apply","--pim-name","Soopsok Sweets PIM3","--pim-address","Pondok Indah Mall, Jakarta","--ps-name","Soopsok Sweets Plaza Senayan","--ps-address","Plaza Senayan, Jakarta","--ps-pb1","off","--ps-nickname","PS"]
[FIX] args.apply = true
[FIX] args.pimName = "Soopsok Sweets PIM3"
[FIX] args.pimAddress = "Pondok Indah Mall, Jakarta"
[FIX] args.psName = "Soopsok Sweets Plaza Senayan"
[FIX] args.psAddress = "Plaza Senayan, Jakarta"
[FIX] args.psPb1 = off
[FIX] args.psNickname = PS
[FIX] sources = {"apply":"arg","pimName":"arg","pimAddress":"arg","psName":"arg","psAddress":"arg","pimId":"default","psPb1":"arg","psNickname":"arg"}
[FIX] assertSafeApply: PASS
```

### 안전장치 재현

```
=== Case A: apply only, no name/address ===
sources = {"apply":"arg","pimName":"default","pimAddress":"default","psName":"default","psAddress":"default", ...}
RESULT: THROWS (expected) - --apply 중단: 값이 전달되지 않았습니다 — 명령/인자 확인. 기본값 사용 키: pimName, pimAddress, psName, psAddress. (argv=["--apply"] · env 사용 키=[])

=== Case B: env SMS_APPLY=1 + 4 required env vars ===
sources = {"apply":"env","pimName":"env","pimAddress":"env","psName":"env","psAddress":"env", ...}
args = {"apply":true,"pimName":"Soopsok Sweets PIM3","pimAddress":"Pondok Indah Mall, Jakarta","psName":"Soopsok Sweets Plaza Senayan","psAddress":"Plaza Senayan, Jakarta","pimId":null,"psPb1":"off","psNickname":"PS"}
RESULT: PASS (expected)
```

---

## 단위 테스트 / 타입 / 린트 / CI

- `pnpm --filter commerce-core test`: **696 passed · 60 suites** (setup-multi-store 33 passed · 기존 20 + 신규 13)
- `pnpm --filter commerce-core typecheck`: **clean**
- `pnpm --filter commerce-core lint`: **0 errors** (9 pre-existing warnings · 본 PR 무관)

### PR #434 CI

| check | status | time |
|---|---|---|
| changes-filter | pass | 17s |
| markers-and-forbidden | pass | 19s |
| route | pass | 2m35s |
| check | pass | 22s |
| heavy-mac | **pass** | 15m10s |
| heavy-cloud | skipping | — |

모두 **green**.

---

## Kyu 명령 2 개 (환경변수 방식 · 한 줄 · 인라인 `#` 주석 금지)

**환경변수 방식 추천** · `--` 없이도 동작 · 셸 따옴표 손실 無.

### dry-run

```
SMS_PIM_NAME="Soopsok Sweets PIM3" SMS_PIM_ADDRESS="Pondok Indah Mall, Jakarta" SMS_PS_NAME="Soopsok Sweets Plaza Senayan" SMS_PS_ADDRESS="Plaza Senayan, Jakarta" SMS_PS_PB1=off SMS_PS_NICKNAME=PS npx medusa exec ./src/scripts/setup-multi-store.js
```

### apply

```
SMS_APPLY=1 SMS_PIM_NAME="Soopsok Sweets PIM3" SMS_PIM_ADDRESS="Pondok Indah Mall, Jakarta" SMS_PS_NAME="Soopsok Sweets Plaza Senayan" SMS_PS_ADDRESS="Plaza Senayan, Jakarta" SMS_PS_PB1=off SMS_PS_NICKNAME=PS npx medusa exec ./src/scripts/setup-multi-store.js
```

(실행 위치는 운영 컨테이너 안의 `/app/.medusa/server` — 기존 운영 절차와 동일.)

CLI 인자 방식도 수정으로 작동하지만 (`-- --apply --pim-name "..." ...`), env 방식이 셸 따옴표 손실에 더 강하므로 권장.

---

## 커밋 메시지 (processes)

`processes: [commerce-core.seed-scripts]` — `docs/feature-map.yaml:562` 의 `apps/commerce-core/src/scripts/**` 커버리지.

---

## 셀프 머지

금지 (지시 준수). T0 착지 대기.
