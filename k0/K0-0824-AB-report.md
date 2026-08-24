# K0-0824-AB · AA 후속 · session id per-invoke 파생 (Kyu 로그 원문 뿌리 fix)

**round_id**: K0-0824-AB
**hub**: k0 (test-portal)
**pr**: test-portal_PR#77
**branch**: feat/k0-0824-ab-session-id-per-invoke
**status**: PR 심리 대기 · Kyu 실기 재검증 1사이클 (배포 후)
**timestamp**: 2026-08-24

## 요지

**Kyu 실측 08-24 · AA 후속 · 잔여 결함 fix**.
Kyu 요구 "로그 원문 확보 선행 · 추측 fix 금지" 준수 · **원문 로그 확보 완료**.

## 뿌리 실측 (Kyu 로그 원문)

`~/.kyu-bridge/logs/session-k0-<uuid>.log` line 실측:
```
[SESSION START] hub=k0 · sessionId=7f68a38f-5be9-56a1-8a5e-78623d20c121 · pid=93448 · at=2026-08-24T07:30:19Z
[STDERR] Error: Session ID 7f68a38f-5be9-56a1-8a5e-78623d20c121 is already in use.

[SESSION START] hub=k0 · sessionId=7f68a38f-5be9-56a1-8a5e-78623d20c121 · pid=94660 · at=2026-08-24T07:31:19Z
[STDERR] Error: Session ID 7f68a38f-5be9-56a1-8a5e-78623d20c121 is already in use.

[SESSION START] hub=k0 · sessionId=7f68a38f-5be9-56a1-8a5e-78623d20c121 · pid=95922 · at=2026-08-24T07:32:19Z
[STDERR] Error: Session ID 7f68a38f-5be9-56a1-8a5e-78623d20c121 is already in use.
```

**뿌리 확증**:
- claude CLI 는 한 `--session-id` 를 두 번째 invoke 에서 거부
- orchestrator 매 tick 같은 deterministic `makeSessionId(hubKey)` UUID 재사용
- tick #2 부터 exit=1 무한 반복 (3연속 threshold 재정지)

## 착지 (6 files · +452 insertions · -14 deletions)

| 파일 | 라인 | 역할 |
|------|------|------|
| `tools/kyu-bridge/src/session-manager.mjs` | invoke 재작성 + 3 helper 신설 | AB-1 opts.sessionId override · AB-2 자동 재시도 · deriveInvokeSessionId · deriveRetryInvokeSessionId · isAlreadyInUseError · result.attempts[] 노출 |
| `tools/kyu-bridge/src/loop-orchestrator.mjs` | +6 | AB-1 · deriveInvokeSessionId('r'/'w') 판독/작업 별도 발부 |
| `tools/kyu-bridge/test/session-manager-ab.test.mjs` | 신설 17 case | 전 4 항 커버 |
| `docs/design/kyu-orchestrator-v0.3.md` § 9.16 · § 9.21 | 조항 추가 + 신설 | 파일:줄:커밋 정본 · 착지 표기 |
| `docs/SPEC.md` v1.44 | 트레일러 | 요약 |
| `docs/requirements-tracking.md` K44 | 편입 | 이연 순증감 |

## AB-1 · session id per-invoke 파생

**deriveInvokeSessionId(hubKey, roundId, suffix)** 헬퍼:
```
seed = 'orch-<hubKey>::<roundId>::<suffix>'
UUID = SHA-256(seed) → v5-style
```

**orchestrator 소비**:
- 판독 세션: `deriveInvokeSessionId(hubKey, roundId, 'r')`
- 작업 세션: `deriveInvokeSessionId(hubKey, roundId, 'w')`

**결과**:
- 매 tick roundId 다름 = 판독/작업 sessionId 자연 격리
- 판독/작업 sessionId 도 서로 다름 (suffix 분리)
- deterministic hub UUID (`makeSessionId(hubKey)`) 는 재접속 정본 유지 · invoke spawn 별건

## AB-2 · already-in-use 자동 재시도 (1회)

**session-manager.invoke** 재작성:
- 1회차: opts.sessionId (or rec.sessionId) 로 spawn
- stream stderr 캡처 후 `isAlreadyInUseError` 매칭
- **첫 시도 already-in-use** = `deriveRetryInvokeSessionId(baseSessionId)` (hrtime.bigint nanosec 편입) 로 새 sessionId · 1회 재시도
- **재실패** = error 카운터 +1 (기존 흐름 유지)
- **non-in-use 실패** = 재시도 안 함 (unknown option 등)
- `result.attempts[]` = 재시도 이력 노출 (Kyu 관측)

## AB-3 · design § 9.16 정본 조항 (파일:줄:커밋)

**추가된 정본**:
- `tools/kyu-bridge/src/session-manager.mjs:392` — `deriveInvokeSessionId(hubKey, roundId, suffix)`
- `tools/kyu-bridge/src/session-manager.mjs:429` — `isAlreadyInUseError(stderr)`
- `tools/kyu-bridge/src/loop-orchestrator.mjs:264` — 판독 sessionId 소비
- `tools/kyu-bridge/src/loop-orchestrator.mjs:359` — 작업 sessionId 소비
- 커밋 기저 = `01c150f` (AA)

**금지 문언**: orchestrator 안 직접 `rec.sessionId` 사용 금지 · 매 invoke 별도 sessionId 발부 원칙.

## AB-4 · claude 버전 진단 결론

**cmux claude 실측** (K0 실행):
```
$ /Applications/cmux.app/Contents/Resources/bin/claude --version
2.1.128 (Claude Code)
```

**이전 진단 로그** = `version=1.0.108 (Claude Code)` 표시:
- augmentPath 우선순위 `nvmBin > /usr/local/bin > /opt/homebrew/bin > current PATH`
- `/opt/homebrew/bin/claude` = **1.0.108** (구버전 · homebrew)
- augmentPath 로 homebrew 채택 = 진단 로그가 실 소비 바이너리를 정확히 반영

**결론**: **진단 함수 정상 · 실 소비 바이너리가 진짜 1.0.108** (진단 함수 버그 아님). Kyu 해소 경로 = AA-2 `config.claudeBin = /Applications/cmux.app/.../claude` 로 신버전 강제.

## AB-5 · 승인 큐 잔여 항목 방침

id 끝 `invoke-mt6x4rpn` = **자동 소비 금지 · Kyu 수동 [승인]/[반려] 후 resume-loop (SPEC § 7.2 ⓓ 정본 유지)**.

## QC

```
pnpm check → COMPLETED 969 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
pnpm test  → Test Files  58 passed (58) · Tests  768 passed (768)
pnpm build → adapter-cloudflare ✔
```

**신설 17** = deriveInvokeSessionId 5 + isAlreadyInUseError 4 + deriveRetryInvokeSessionId 2 + invoke sessionId override 2 + 자동 재시도 4.

## Kyu 실기 재검증 · self-contained 1사이클

1. **데몬 재설치** · 진단 로그 확증 (claude 실행 경로 · 버전)
2. **config.claudeBin = /Applications/cmux.app/.../claude 유지** (AA-2 신버전 강제)
3. **live 재점화** + pilot 활성 · 재기동
4. **60s 대기** · 세션 로그 확증:
   - sessionId 가 매 tick 다름 (deterministic 아님)
   - 'already in use' 문구 **완전 부재**
   - `[loop] pilot-live · work invoke ok=true · exit=0`
5. **다음 tick** 도 정상 발화 (판독 'r' · 작업 'w' suffix 다른 sessionId)

## 이연 순증감 (requirements-tracking K44)

- **AB 신규 이연 = 없음** (session id per-invoke 뿌리 fix 로 잔여 결함 해소)
- **기존 이연 유지** (X · Y · Z · AA 6종):
  - 타 허브 loop 확장 · 프롬프트 자동 주입 고도화 · SIGINT halt · 구 PR#40/#43 정리 · watcher onNewReport 통합 · 자동 재개 approvals-loop
- **AB-5 잔여 항목** (invoke-mt6x4rpn) = 자동 소비 금지 · Kyu 수동 판정

## PR

https://github.com/CuriocityDevAi/test-portal/pull/77
