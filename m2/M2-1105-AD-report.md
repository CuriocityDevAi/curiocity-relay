# M2-1105-AD 조사 리포트 — 2026-11-07 16:04Z 운영 SSH 접속

## 결론 3줄

- **누가**: 클로드 허브 세션 흔적 없음, zsh_history 흔적 없음 — **Railway 웹 대시보드 브라우저 콘솔 또는 로컬 터미널(허브 외부)로 추정, 로컬 기록으로 특정 불가**
- **언제**: 2026-11-07T16:04:11Z SSH 연결 (10s, exit -1) · 16:07:00Z 두 번째 세션 (15s, exit -1) — 직전 허브 세션 R0-1105-AE 종료(16:02Z) 로부터 2분 공백
- **무엇을**: 두 세션 모두 exit -1 비정상 종료 · 로그에 실행 명령 없음 · 운영 DB 변경 흔적 없음

---

## 검색 경로별 매치 수

| 경로 | 패턴 매치 | 비고 |
|------|----------|------|
| `~/.hub-runner/*/*.log` (허브 러너 로그) | 0 | railway 패턴 없음 |
| `~/.claude/projects/*/*.jsonl` (클로드 세션) | 5개 파일 · 전부 간접 | 로그 파일/원장 파일을 tool_result로 읽은 것 — 실행 없음 |
| `~/.zsh_history` (셸 기록) | 0 | railway 패턴 없음 |
| `~/projects/curiocity-relay/` CI·스크립트 | 3줄 (큐/로그 텍스트만) | 실행 경로 없음 |
| `~/projects/storeport/` CI·스크립트 | 3곳 (문서 예시·주석) | 실행 경로 없음 |

---

## 증거 상세

### 1. 허브 러너 로그 (`~/.hub-runner/*/*.log`)

대상 허브: m0 / m1 / m2 / m3 / r0
결과: **0 매치** — `grep -l "railway ssh|railway run|railway shell|railway connect|railway-ssh|ssh .*railway"` 반환 없음

### 2. 클로드 세션 (`~/.claude/projects/*/*.jsonl`)

16:04Z 이전 시작 세션 타임라인:

| 세션 ID | 프로젝트 | 시작 | 마지막 활동 | 상태판 ID |
|---------|---------|------|------------|---------|
| e4dfbfdf | pos-r0 | 15:00Z | 15:09Z | (R0 사전 작업) |
| 448f04fa | storeport | 15:07Z | 15:08Z | (단명) |
| f9545052 | pos-m1 | 15:08Z | 15:08Z | (단명) |
| 829799f0 | pos-r0 | 15:36Z | 15:55Z | (R0 중간) |
| **f1f5107e** | **storeport** | **15:36Z** | **15:55Z** | **M0-1105-T** |
| daa53c85 | pos-m1 | 15:40Z | 15:40Z | (단명) |
| 057d6a1f | pos-m1 | 15:43Z | 15:43Z | (단명) |
| ef5db30f | pos-m3 | 15:45Z | 15:56Z | (M3 중간) |
| **377b72ea** | **pos-r0** | **15:56Z** | **16:02:59Z** | **R0-1105-AE** |

→ **모든 세션이 16:04Z 이전 종료**. 16:04Z 시각에 활성 클로드 세션 없음.

railway 패턴을 포함한 5개 JSONL 파일:

| 파일 | 프로젝트 | 세션 시작 | 패턴 출처 |
|------|---------|---------|---------|
| b5d85bb2 | storeport | 16:25Z | tool_result — railway-api-20261107 로그 파일 읽기 |
| 6388adde | pos-r0 | 11-09 04:05Z | tool_result — open-requirements.md 읽기 |
| 31a4a987 | pos-m3 | 16:36Z | tool_result — open-requirements.md 읽기 |
| ef6adeb1 | pos-m3 | 11-09 04:05Z | tool_result — open-requirements.md 읽기 |
| b4b5e3f9 | pos-m2 | 11-11 02:43Z | tool_result — 본 M2-1105-AD 조사 세션 |

→ 모두 간접 매치(로그·원장 파일 내용을 읽은 것). **railway ssh 명령을 직접 실행한 assistant 메시지 없음.**

첫 번째 프롬프트 첫 줄:
- storeport/b5d85bb2: `/Users/kyu.lee/projects/curiocity-relay/queue/m2/M2-1105-AD.md 파일을 읽고 그대로 수행` ← 현재 세션은 M2-1105-AD 조사 세션 — 무관
- storeport/b5d85bb2 (16:25Z 시작) 첫 메시지: (이 조사 이전 세션, 운영 장애 진단 작업)

### 3. 셸 기록 (`~/.zsh_history`)

**0 매치** — `grep -n "railway ssh|railway run|railway shell|railway connect|railway-ssh|ssh .*railway"` 반환 없음
→ Kyu 수동 실행 가능성 낮음

### 4. relay CI·스크립트 / storeport 코드

relay 리포 (`~/projects/curiocity-relay/`):
```
logs/railway-api-20261107-1550-1607.log:35:  [railway-ssh] SSH connected  ← 로그 파일
queue/m2/M2-1105-AD.md:3: (큐 파일 텍스트)
ledger/open-requirements.md:12: (원장 텍스트)
```
→ 기록 파일만, 실행 경로 아님

storeport 리포 (`~/projects/storeport/`):
```
docs/plans/P1a-1-screen-comparison.md:246:  railway ssh --service commerce-core '...'  ← 설정 가이드 문서
docs/plans/P1a-1-defect-round5.md:73:  (M0-0729-H 생성 기록 주석)
apps/commerce-core/src/scripts/check-admin-users.ts:5:  railway run --service commerce-core  ← 주석
```
→ 문서 예시·주석, 자동 실행 코드 없음

Railway 대시보드 웹 콘솔(브라우저) 경로: **로컬 기록으로 판별 불가**

---

## 결론표

| 후보 | 증거 | 확신도 | SSH 무엇을 했는지 |
|------|------|--------|----------------|
| 클로드 허브 세션 | 없음 — 모든 세션 16:02Z 이전 종료, 로그 0매치 | 불명 (실행 흔적 없음) | 불명 |
| Kyu 수동 (로컬 터미널) | zsh_history 0매치 | 불명 (기록 없음) | 불명 |
| CI 스크립트 | 실행 경로 없음 | 없음 | - |
| Railway 웹 콘솔 (브라우저) | 로컬 기록으로 판별 불가 | 불명 | 불명 |
| 운영 DB 변경 여부 | exit -1 (10s, 15s) · 로그에 명령 없음 | 변경 없음 (유력) | 연결만, 명령 없거나 즉시 종료 |

> exit -1 × 2회: 연속 접속 실패 혹은 즉시 종료. 짧은 체류 시간(10s, 15s)으로 실질적 DB 조작 가능성 낮음.

---

## 재발 방지안 (제안만 · 적용 X)

**① 전역 `permissions.deny` 규칙** (파일: `~/.claude/settings.json` · 적용 주인: Kyu):
```json
{
  "permissions": {
    "deny": ["Bash(railway*)", "Bash(ssh*railway*)"]
  }
}
```
Claude Code 공식 문서(Permissions 섹션): `permissions.deny` 는 `--dangerously-skip-permissions` 모드에서도 하드 블록으로 적용됨 — allow 규칙과 달리 deny 는 모드 무관 차단. 각 허브 프로젝트 `.claude/settings.json` 에도 동일 규칙 추가 시 defense-in-depth 확보.

**② 프로젝트별 허브 설정** (파일: `~/projects/storeport/.claude/settings.json` 등 허브별 cwd · 적용 주인: Kyu):
동일 `permissions.deny` 규칙 — 허브 cwd 단위로도 차단 보장.

**③ `PreToolUse` hook 대안** (`~/.claude/settings.json` hooks 항목 · 적용 주인: Kyu):
hook에서 railway 패턴 감지 시 exit 2 반환 → skip-permissions 모드 포함 모든 모드에서 차단; 차단 로그도 남길 수 있어 감사에 유리.

---

## 착지 명령

```
cp /tmp/M2-1105-AD-report.md ~/projects/curiocity-relay/m2/ && cd ~/projects/curiocity-relay && git add m2/M2-1105-AD-report.md && git commit -m "m2: M2-1105-AD" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M2-1105-AD done "16:04Z SSH 발신 허브 불명 — 클로드 세션·zsh_history 흔적 없음, Railway 웹 콘솔 가능성, 두 세션 모두 exit -1(10s·15s) 운영 DB 변경 없음"
```
