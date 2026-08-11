# K0-0807-AA · 파일럿 왕복 완주 후속 · claude invoke exit=1 뿌리 fix (버전 함정)

**round_id**: K0-0807-AA
**hub**: k0 (test-portal)
**pr**: test-portal_PR#76
**branch**: feat/k0-0807-aa-claude-invoke-fix
**status**: PR 심리 대기 · Kyu live 재점화 1사이클 재검증
**timestamp**: 2026-08-11

## 요지

**Kyu 실측 08-11 · v0.3 왕복 완주 확증 + 잔여 결함 fix**.
Kyu 요구 "추측 fix 금지 · 원문 확보 선행" 준수 · **뿌리 실측 완료**.

**실측 결과**:
- ✓ Z 이후 upsert ok → 화면 표시 → 판정 소비 → resume cleared 왕복 완주
- ❌ 잔여 = pilot-live invoke tick 3연속 exit=1 → threshold 재정지 반복
- Kyu 임시 조치 = loop.live=false 하강 (pilot-dry 상주)

## 뿌리 실측 (Kyu 로그 원문 확보)

`~/.kyu-bridge/logs/session-k0-<uuid>.log` line 44-50:
```
[STDERR] error: unknown option '--no-session-persistence'
```

시스템 실 조사:
- `/opt/homebrew/bin/claude` = **1.0.108** (구버전 · 이 옵션 미지원)
- `/Applications/cmux.app/Contents/Resources/bin/claude` = **2.1.128** (신버전 · 지원)

**뿌리**:
- Y-1 augmentPath 우선순위 = `nvmBin > /usr/local/bin > /opt/homebrew/bin > current PATH`
- 시스템에 nvm/local claude 없음 → **homebrew 구버전 선택** → `--no-session-persistence` 미지원 → exit=1
- K0-0807-O extraArgs 편입이 신버전 전용 옵션 · **버전 함정**

## 착지 (6 files · +328 insertions)

| 파일 | 라인 | 역할 |
|------|------|------|
| `tools/kyu-bridge/src/loop-orchestrator.mjs` | +18 | AA-1 extraArgs 기본 정정 · AA-3 stderr 캡처 + extractStderrGist + approval summary/background 편입 |
| `tools/kyu-bridge/src/loop-config.mjs` | +1 | AA-2 · LoopConfigFields.claudeBin 타입 정의 |
| `tools/kyu-bridge/src/commands/serve.mjs` | +30 | AA-4 · logClaudeResolution() 진단 함수 (which + version) |
| `tools/kyu-bridge/test/loop-orchestrator-aa.test.mjs` | 신설 12 case | 전 4 항 커버 |
| `docs/design/kyu-orchestrator-v0.3.md` § 9.16 · § 9.20 | 절 신설/보강 | 버전 함정 정본 + 착지 |
| `docs/SPEC.md` v1.43 | 트레일러 | 요약 |

## AA-1 · extraArgs 정정

기존:
```javascript
extraArgs: config.extraArgs ?? ['--no-session-persistence', '--output-format', 'text']
```

fix:
```javascript
extraArgs: config.extraArgs ?? ['--output-format', 'text']
```

- persistence 옵션 제거 · **양쪽 버전 호환**
- session-id 이미 명시 = 세션 격리 충분
- config.extraArgs override 지원 유지 (Kyu 강제 편입 가능)

## AA-2 · config.loop.claudeBin 오버라이드

```json
{
  "loop": {
    "claudeBin": "/Applications/cmux.app/Contents/Resources/bin/claude"
  }
}
```

- Kyu 절대경로 지정 = augmentPath 우선순위 우회
- session-manager.invoke 에 그대로 전달
- 미주입 = DEFAULT `'claude'` (PATH 기반)

## AA-3 · approval "last error" stderr 요지 편입

**extractStderrGist** 헬퍼:
- 첫 non-empty 라인 · 200자 cap
- 빈/null 안전

**approval.context**:
```javascript
{
  summary: `last error = ${invokeError}` + (gist ? ` · stderr = ${gist}` : ''),
  background: readingStderr ? `[STDERR 원문 · 최대 500자]\n${stderr.slice(0, 500)}` : undefined
}
```

- exit=1 만으로 Kyu 판단 불가 회수
- background = 원문 500자 (즉시 진단)
- orchestrator result.invokeStderrGist 노출 (관측 API)

## AA-4 · serve.mjs 진단 로그

```
[kyu-bridge] claude 실행 경로 진단: /opt/homebrew/bin/claude · version=1.0.108 (Claude Code) · PATH 기반
```

또는 config override 시:
```
[kyu-bridge] claude 실행 경로 진단: /Applications/cmux.app/.../claude · version=2.1.128 (Claude Code) · config override
```

- `which claude` + `<path> --version` 실행 · augmentedPath 소비
- **실 소비 바이너리·버전 표시** (진단 자원)

## Kyu 실기 재검증 · self-contained 5단계 (live 재점화 1사이클)

1. **데몬 재설치** · 진단 로그 확증 (claude 실행 경로 · 버전)
2. **구버전 감지 시** = config.loop.claudeBin 편집 · 재기동
3. **live 재점화** = config.loop.live=true · pilot.active=true · 재기동
4. **60s 대기** · pilot-live invoke `ok=true · exit=0` 로그 확증
5. **여전히 error 시** = 승인 큐 blocking approval · context.summary 안 stderr 요지 진단

## QC

```
pnpm check → COMPLETED 969 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
pnpm test  → Test Files  57 passed (57) · Tests  751 passed (751)
pnpm build → adapter-cloudflare ✔
```

**신설 12** = extractStderrGist 5 + extraArgs 2 + claudeBin 2 + approval stderr 편입 3.

## 금지 · 재발 방지 (§ 9.16 정본 편입)

- 최신 claude 옵션 (`--no-session-persistence` · `--fork-session` 등) 을 extraArgs 기본에 넣지 마라
- 다중 버전 함정 재현
- 필수 시 = config.claudeBin 로 최소 버전 강제 후 편입

## 이연 순증감

**AA 신규 이연 = 없음** (Z 이후 왕복 완주 잔여 fix)

**기존 이연 유지 (X · Y · Z)**:
- 타 허브 loop 확장 (n0/t0/m0)
- 프롬프트 자동 주입 고도화
- SIGINT halt (SPEC § 7.2 ⓓ)
- 구 PR#40/#43 정리
- watcher onNewReport 통합
- 자동 재개 approvals-loop 편입

**후속**: Kyu live 재점화 통과 → 파일럿 확장 판정 (Kyu 사인).

## PR

https://github.com/CuriocityDevAi/test-portal/pull/76
