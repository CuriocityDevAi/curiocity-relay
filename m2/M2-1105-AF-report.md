# M2-1105-AF Report — Railway 명령 원천 차단 + 모니터링

날짜: 2026-11-11  담당: Claude Code (M2 세션)

---

## 1. 변경 파일 · diff

### `~/.claude/settings.json` (기존 내용 병합)

```diff
  "skipDangerousModePermissionPrompt": true,
+ "permissions": {
+   "deny": [
+     "Bash(railway*)",
+     "Bash(npx @railway/cli*)",
+     "Bash(bunx @railway/cli*)",
+     "Bash(pnpm dlx @railway/cli*)"
+   ]
+ },
+ "hooks": {
+   "PreToolUse": [
+     {
+       "matcher": "Bash",
+       "hooks": [
+         {
+           "type": "command",
+           "command": "/Users/kyu.lee/.claude/hooks/block-railway.sh"
+         }
+       ]
+     }
+   ]
+ }
```

백업: `~/.claude/settings.json.bak-20261111`  
JSON 유효성: `node -e JSON.parse` 통과

### 신규 파일: `~/.claude/hooks/block-railway.sh`

```bash
#!/usr/bin/env bash
# CurioCity policy: block railway CLI calls from hub sessions (M2-1105-AF)
LOG_FILE="$HOME/.hub-runner/blocked/railway-attempts.log"
mkdir -p "$(dirname "$LOG_FILE")"

INPUT=$(cat)
TOOL_NAME=$(printf '%s' "$INPUT" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)
[ "$TOOL_NAME" = "Bash" ] || exit 0

CMD=$(printf '%s' "$INPUT" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)
SESSION_ID=$(printf '%s' "$INPUT" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d.get('session_id','unknown'))" 2>/dev/null)
CWD_VAL=$(printf '%s' "$INPUT" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null)

BLOCKED=0; REASON=""

# Check 1: railway as a command at line-start or after shell operators
if echo "$CMD" | grep -qE '(^|[;&|`\(][[:space:]]*)railway([[:space:]]|$)'; then
    BLOCKED=1; REASON="railway-direct"
fi

# Check 2: npm/bunx/pnpm wrappers — command-position only (same guard as check 1)
if echo "$CMD" | grep -qE \
    '(^|[;&|`\(][[:space:]]*)npx[[:space:]]+@railway/cli|(^|[;&|`\(][[:space:]]*)bunx[[:space:]]+@railway/cli|(^|[;&|`\(][[:space:]]*)pnpm[[:space:]]+dlx[[:space:]]+@railway/cli'; then
    BLOCKED=1; REASON="railway-npm-wrapper"
fi

# Check 3: SSH to *.railway.app hosts
if echo "$CMD" | grep -qE 'ssh[[:space:]]+[^#]*\.railway\.app'; then
    BLOCKED=1; REASON="ssh-to-railway"
fi

if [ "$BLOCKED" -eq 1 ]; then
    ISO_TIME=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
    CMD_MASKED=$(printf '%s' "$CMD" | python3 -c "
import sys, re
cmd = sys.stdin.read()
masked = re.sub(
    r'(RAILWAY_TOKEN|token|secret|password|api[_-]?key)\s*[=:]\s*\S+',
    r'\1=***', cmd, flags=re.IGNORECASE)
print(masked[:200], end='')
")
    printf '%s | session=%s | cwd=%s | reason=%s | cmd=%s\n' \
        "$ISO_TIME" "$SESSION_ID" "$CWD_VAL" "$REASON" "$CMD_MASKED" >> "$LOG_FILE"
    printf 'Blocked by CurioCity policy: railway commands are not allowed for hubs\n' >&2
    exit 2
fi
exit 0
```

비밀값 없음. 토큰/비밀번호 패턴은 로그에서 `***`로 마스킹.

---

## 2. 문서 근거

**deny 규칙이 `--dangerously-skip-permissions`(`bypassPermissions`)에서도 적용되는가?**

> "Deny rules block in every mode, including `bypassPermissions`."  
> — code.claude.com/docs/en/permission-modes (Actions no mode auto-approves 섹션)

추가 확인:  
> "Claude Code evaluates deny and ask rules regardless of what a PreToolUse hook returns: a matching deny rule blocks the call."  
> — code.claude.com/docs/en/permissions (Precedence among rules, hooks, and mods 섹션)

이중 방어:
- **1차**: `permissions.deny` — Claude Code 내부에서 도구 호출 전 평가. `bypassPermissions`에서도 유효.
- **2차**: `PreToolUse` hook(block-railway.sh) — 도구 호출 직전 실행, exit 2로 차단 + 로그 기록.

---

## 3. 실증 4건 결과

### 테스트 환경

```
cwd: /tmp
settings: ~/.claude/settings.json (deny rules + hook)
hook: ~/.claude/hooks/block-railway.sh
log: ~/.hub-runner/blocked/railway-attempts.log
```

### ① `railway --version` → 차단 (성공)

```
$ cd /tmp && claude -p "Execute this exact bash command: railway --version"

The command was blocked by a hook policy:
  Blocked by CurioCity policy: railway commands are not allowed for hubs
```

로그: `2026-11-11T07:21:16Z | session=90299d72-... | cwd=/private/tmp | reason=railway-direct | cmd=railway --version`

### ② `npx @railway/cli whoami` → 차단 (성공)

```
$ cd /tmp && claude -p "Execute this exact bash command: npx @railway/cli whoami"

The command was blocked by a local hook (/Users/kyu.lee/.claude/hooks/block-railway.sh)
with the message: "Blocked by CurioCity policy: railway commands are not allowed for hubs"
```

로그: `2026-11-11T07:23:50Z | session=6e838af9-... | cwd=/private/tmp | reason=railway-npm-wrapper | cmd=npx @railway/cli whoami`

### ③ `grep -c railway /tmp/x.txt` → 허용 (성공)

```
$ cd /tmp && claude -p "Execute this exact bash command: grep -c railway /tmp/x.txt"

Output: `1`
```

오탐 없음: `railway` 가 파일 내용 검색 인수로 사용될 때는 차단하지 않음.  
(hook check 1·2는 `railway`/`npx @railway/cli`가 명령 실행 위치에 있을 때만 매칭)

### ④ `--dangerously-skip-permissions` + `railway --version` → 차단 (성공)

```
$ cd /tmp && claude --dangerously-skip-permissions -p \
    "Execute this exact bash command: railway --version"

Blocked by a local hook (`block-railway.sh`):
  "railway commands are not allowed for hubs". Nothing ran.
```

로그: `2026-11-11T07:21:56Z | session=65b4df15-... | cwd=/private/tmp | reason=railway-direct | cmd=railway --version`

**결론**: `bypassPermissions` 모드에서도 hook이 작동하여 차단됨.  
(deny 규칙은 Claude Code 내부에서, hook은 PreToolUse 단계에서 각각 차단)

---

## 4. 모니터링 연결 제안 (코드 없이, 3줄)

러너의 health-check 사이클에서 `~/.hub-runner/blocked/railway-attempts.log`의 줄 수와 마지막 항목 타임스탬프를 읽어 `runner-status` 브랜치의 `state.json`에 `{"blocked_railway_count": N, "last_blocked_at": "ISO시각"}` 형태로 업데이트한다.  
이를 통해 curiocity-relay 모니터링 대시보드가 차단 추이를 시계열로 볼 수 있고, 급격한 증가 시 알림 트리거가 가능하다.  
구현은 다음 러너 버전(runner.mjs)의 `runHealthCheck()` 함수 내 2~3줄 추가로 충분하다.

---

## 5. 되돌리는 법

```bash
cp ~/.claude/settings.json.bak-20261111 ~/.claude/settings.json
rm ~/.claude/hooks/block-railway.sh
```

---

## 착지 명령

```bash
cp /tmp/M2-1105-AF-report.md ~/projects/curiocity-relay/m2/ \
  && cd ~/projects/curiocity-relay \
  && git add m2/M2-1105-AF-report.md \
  && git commit -m "m2: M2-1105-AF" \
  && git pull --rebase --autostash origin main \
  && git push \
  && node scripts/claim.mjs M2-1105-AF done "railway deny+hook 이중차단 완료, 실증4건, 모니터링제안"
```
