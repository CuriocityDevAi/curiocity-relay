# K0-0807-Y · X 실측 판정 · 결함 2 fix (spawn ENOENT · 이중 스위치 계약)

**round_id**: K0-0807-Y
**hub**: k0 (test-portal)
**pr**: test-portal_PR#74
**branch**: feat/k0-0807-y-loop-pilot-fixes
**status**: PR 심리 대기 · Kyu 실기 재검증 4단계 (배포 후)
**timestamp**: 2026-08-11

## 요지

**Kyu 실측 08-10 · X 라운드 loop 상주 실증 판정** · 결함 2건 확증 · fix.

**실측 결과 (Kyu 로그·보드 스크린샷)**:
- tick #1/#2 발화 · 라운드 ID 보드 표시 · 최근 사이클 이력 적재 · 하트비트 TTL 초과 💀 표시
- **상주 · 관측 전량 실동작 ✓**

**결함**:
- **①** `error=spawn claude ENOENT` = launchd 컨텍스트 PATH 부재 · **기지 함정 재발** (K0-0807-E · β 원클릭 spawn-service 정본을 loop invoke 경로가 미소비)
- **②** `config.loop.live` 미설정(=false) 인데 `mode=pilot-live` 로 실행 시도 · 이중 스위치 계약 위반

## 착지 (5 files · +230 insertions)

| 파일 | 라인 | 역할 |
|------|------|------|
| `tools/kyu-bridge/src/session-manager.mjs` | +7 | Y-1 · augmentPath import + spawn env 명시 |
| `tools/kyu-bridge/src/loop-orchestrator.mjs` | +12 | Y-2 · mode 4종 · shouldInvoke=isLive · shouldPersist=isLive · § 9.16 정본 |
| `tools/kyu-bridge/test/loop-orchestrator-pilot.test.mjs` | +9 case | Y-2 (5) + Y-3 (3) |
| `docs/design/kyu-orchestrator-v0.3.md` § 9.16 · § 9.17 · § 9.18 | 신설 3절 | 이중 스위치 · claude 경로 · 착지 표기 |
| `docs/SPEC.md` v1.41 | 트레일러 | 결함 2 fix 요약 |

## Y-1 · claude 경로 fix (§ 9.17 정본)

**뿌리**: launchd 컨텍스트 `PATH=/usr/bin:/bin:/usr/sbin:/sbin` · nvm/brew claude 못 찾음 · `spawn claude ENOENT`.

**기지 함정 재발**: K0-0807-E · β 원클릭 spawn-service `handleStart` 에서 이미 해결 (`server.mjs:413 augmentedPath`) · **loop invoke 경로에 미적용**.

**fix**: `session-manager.mjs invoke()`
```javascript
const augmentedPath = augmentPath(process.env.PATH, process.execPath);
const spawnEnv = { ...process.env, PATH: augmentedPath };
const child = spawnImpl(claudeBin, args, { cwd, env: spawnEnv });
```

- `claudeBin='claude'` 상대 이름 유지 (augmented PATH 안 자동 resolve · 자작 최소)
- `env: {...process.env, PATH: ...}` 명시 = 상속 함정 회피 (CLAUDE.md § 5.16 정합)

## Y-2 · 이중 스위치 계약 정본 (§ 9.16 신설)

**Kyu 요구**: "정본 = pilot.active(깨어남)와 loop.live(실 실행)는 별개 — live=false면 pilot.active=true여도 실 invoke 금지·판독/dry-run만".

**정본 표**:

| pilot.active | loop.live | mode 라벨 | 판독 invoke | work invoke | approvals upsert |
|--------------|-----------|-----------|-------------|-------------|------------------|
| false | false | `dry-run` | ○ | ✕ | ✕ |
| false | true  | `live`      | ○ | ○ | ○ |
| true  | false | `pilot-dry` | ○ | ✕ | ✕ |
| true  | true  | `pilot-live`| ○ | ○ | ○ |

**계약**:
- `pilot.active` = 깨어남 스위치 (판독 진입 · 프롬프트 확장 · 화이트리스트 판정)
- `loop.live` = 실 실행 스위치 (work invoke · approvals upsert)
- 두 조건 **AND** 로 실 세션 발화 판단
- **pilot-dry (신설 정본)** = 파일럿 관측만 · 실 세션 없음

**코드 변경**:
- `shouldInvoke = isLive` (기존 `isLive || isPilotHub` → live만)
- `shouldPersist = isLive` (approvals upsert도 동일)
- `mode = isPilotHub ? (isLive ? 'pilot-live' : 'pilot-dry') : isLive ? 'live' : 'dry-run'`

## Y-3 · invoke error 3회 threshold 확증

**계약**:
- `halt.flag write` = **mode 무관** (인프라 안전장치 · spawn 실패 인프라 결함)
- `approval upsert` (`invoke_error_limit`) = **isLive 게이트** (실 배선 있을 때만)

**테스트 시나리오** (`spawn claude ENOENT` 시뮬 · invoke 반환 `ok=false + error='ENOENT'` 3회):
- `pilot-dry` 3회 → `invokeErrorLimitReached=true` · halt.flag write · **approval 미적재** (live=false)
- `pilot-live` 3회 → 위 + blocking approval `파일럿 정지 · invoke error 연속 3회` 적재

## Kyu 실기 재검증 (PR body [실기] 4단계)

1. 데몬 재설치 (Y-1 spawn env 반영)
2. `pilot-dry` (live=false) 관찰 → 판독 세션만 발화 · 실 work · approval 없음
3. `pilot-live` (live=true) 실 실행 → work invoke 발화 · Kyu 지속 관찰
4. ENOENT 재현 시나리오 3회 = halt.flag write · CLI ⛔ · approval blocking (live)

## QC

```
pnpm check → COMPLETED 969 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
pnpm test  → Test Files  55 passed (55) · Tests  732 passed (732)
pnpm build → adapter-cloudflare ✔
```

**신설 8** = Y-2 이중 스위치 5 + Y-3 error threshold 3.

## 금지 · 재발 방지 (§ 9.17 정본)

- launchd 데몬 안 spawn 시 `env` 미주입 = ENOENT 재현 (기지 함정 3회차)
- 신규 spawn 도입 시 **augmentPath 편입 리뷰 필수**
- `spawn('claude', ...)` 상대 이름 OK · 단 `env.PATH` 명시 조건

## 이연 순증감

**Y 신규 이연 = 없음** (X 결함 fix 자체 완결)

**기존 이연 유지 (X 라운드)**:
- 타 허브 loop 확장 (n0/t0/m0)
- 프롬프트 자동 주입 고도화
- SIGINT halt (SPEC § 7.2 ⓓ)
- 구 PR#40/#43 정리
- watcher onNewReport 통합 (Q1 a3)
- 자동 재개 approvals-loop 편입 (Q8 g1)

**후속 (Y 이후)**: Kyu 실기 재검증 통과 → 파일럿 관찰 지속 → 확장 판정 (Kyu 사인).

## PR

https://github.com/CuriocityDevAi/test-portal/pull/74
