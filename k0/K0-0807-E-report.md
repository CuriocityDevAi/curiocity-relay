# K0-0807-E · v0.2 첫 실전 FAIL 2건 회수 (watcher 미감지 + [🚀] ⏳ 갇힘 + test-notify)

**허브**: K0 · test-portal
**일자**: 2026-08-08
**상태**: **완료** (PR #59 · Kyu 실기 대기)

---

## [실기] · Kyu 검증 항목 (최우선 · 배포 완료 후)

**test-portal 배포 확인** (Cloudflare Workers Builds · 1-3 분 · CLAUDE.md § 9.5):
- SHA `343e9dc` main 반영 후 실기 진입

### 실기 A · 설치 갱신 + state 초기화 (쉬운 말)

```bash
# 1. 코드 pull
cd ~/projects/test-portal && git pull origin main

# 2. kyu-bridge 재설치 (config 유지 · launchd 재로드 · fix 코드 진입)
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge install

# 3. state 초기화 (fix 前 stuck 된 상태 리셋 · known_reports 다시 baseline 부터 시작)
rm -f ~/.kyu-bridge/watch-state.json

# 4. 데몬 재시작 (state 재생성)
launchctl kickstart -k gui/$UID/com.curiocity.kyu-bridge

# 5. 상태 확인
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge status
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge watch-status
```

### 실기 B · test-notify (표시 계층 분리 진단)

```bash
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge test-notify
```

**결과 판정**:
- **알림 배너 뜨면** = 표시 계층 OK → 실 감지가 발화하면 알림도 확실히 뜸
- **안 뜨면** = macOS 알림 권한 or 집중 모드 문제:
  - 시스템 설정 > 알림 > 스크립트 편집기 or 터미널 앱 · 알림 허용 확인
  - 집중 모드 (방해 금지) 해제

### 실기 C · 실 리포트 감지 재실측 (핵심 · 다음 허브 게시 대기)

- 다른 허브 (T0 · N0 · M0) 가 relay 에 새 리포트 push 대기
- 60s 이내:
  1. Kyu 맥 우상단 **알림 배너** = "T0 리포트 착지 · T0-XXXX-YY-report.md"
  2. 포털 홈 헤더 **🔔 배지** 숫자 증가

### 실기 D · [🚀 준비+열기] 정상 동작 확증

- 포털 상세 (grownest/todoboss/storeport-anchor) → [🚀 준비+열기 · Safari 또는 Chrome]
- 진행 시각 (초 카운터) 관찰:
  - 통상 3-10초 내 완료
  - "⏳ starting… · 3.4s" 등 실시간 표시
- **⏳ 갇힘 없음** · 실패 시 사람말 오류 (timeout/ports_not_ready/spawn_failed 구분) + 폴백 CTA 즉시 노출

---

## C-1 실측 로그 (E-1/E-3 뿌리)

### E-1 · watcher 미감지 뿌리 재현 (fix 前)

```
$ node -e '...pollOnce()'
---1차 poll (tree 실패 시나리오)---
[watcher] tree fetch failed HTTP 500
{"changed":false,"status":500,"error":true}
state.last_head_sha = NEW_T0K_head   ← etag 갱신됨 (Kyu 관찰 정합)
known_reports keys: 3                ← known 미갱신 (Kyu 관찰 정합)
---2차 poll (etag 이미 갱신 · 304 skip)---
[watcher] 304 (no change) · rate remaining=42
{"changed":false,"status":304}
=> T0-0807-K 영원히 감지 안 됨 (etag advance 뿌리 확증)
```

### E-1 · fix 검증 재현

```
---1차 poll (tree 실패)---
[watcher] tree fetch failed HTTP 500 · setHead 지연 유지 (재시도 대상)
state.last_head_sha = PRE_T0K_head    ← etag 갱신 안 됨 확증 (fix 정상)

---2차 poll (재시도 · tree 성공 · delete+add 패턴)---
[watcher] REMOVED 1 report(s): t0/T0-0807-J-report.md
[watcher] NEW t0/T0-0807-K-report.md sha=ddd7ee19
detected: 1, removed: 1, notified: 1 (T0-0807-K)
known_reports = { k0/K0-0807-D, n0/N0-0730-Z5, t0/T0-0807-K }
=> 정확히 정합 (J 제거 · K 추가)
```

### E-3 · launchd PATH 부재 재현 (뿌리 확증)

```
$ env -i PATH=/usr/bin:/bin:/usr/sbin:/sbin sh -c 'npm --version'
sh: line 1: npm: command not found

$ env -i PATH=/Users/kyu.lee/.nvm/versions/node/v20.19.6/bin:/usr/bin:/bin \
    sh -c 'npm --version'
10.8.2  ← nvm bin 접두하면 정상
```

즉 kyu-devenv 내부 `spawn('npm run dev:all', { shell: true, env: process.env })` 이
launchd 컨텍스트에서 실행되면 npm 못 찾음 → dev 서버 미기동 → waitForPorts 60s 소모.

Fix = server.mjs `augmentPath(process.env.PATH, nodeExec)` 로 nvm bin 접두.

---

## 완료 요약

### PR #59 (fix/k0-0807-e-watcher-and-oneclick · `343e9dc`)

- 9 파일 · 314+ / 15-
- pnpm check 952 파일 0 err 0 warn
- pnpm test 447 pass (신설 9: augment-path 6 · watcher setHead 지연·reconcile·재시도 3)
- pnpm build ✔

### E-1 fix

- **watcher.mjs**: setHead 를 tree 처리 성공 후로 지연 · tree 실패 시 etag 미갱신 → 재시도 안전
- **events-store.mjs**: `reconcileKnown(seenPaths)` 신설 · 삭제된 리포트 제거 (relay 청소 규약 정합 · Kyu 명시)

### E-2 · test-notify CLI

- **src/commands/test-notify.mjs** 신설 · CLI `kyu-bridge test-notify`
- 감지 계층 (watcher/state/API) vs 표시 계층 (osascript 권한/집중 모드) 1초 분리 진단

### E-3 · augmentPath + UI 3상태

- **server.mjs**: `augmentPath` 신설 · nvm bin + /usr/local/bin + /opt/homebrew/bin 접두
  - handleStart · handleStop spawn env.PATH 증강 (중복 제거 · 순서 유지)
- **+page.svelte**: 진행 시각 (200ms 카운터) · 폴백 즉시 노출 · 상태별 사람말 (timeout · ports_not_ready · spawn_failed · unauthorized · network kind 별)

---

## 이연 순증감

**implemented (K0-0807-E)**:
- E-1 watcher setHead 지연 + reconcileKnown (삭제 처리)
- E-2 test-notify CLI
- E-3 augmentPath + UI 3상태 명시 + 폴백 즉시
- SPEC v1.26

**신설 이연 (별건 라운드)**:
- kyu-devenv 자체 spawn 시 env.PATH 증강 (bridge 밖 실행 정합 · 저우선)
- kyu-bridge v0.3 (프롬프트 자동 주입 · **별건 Kyu 사인 필수**)
- Mixed content Safari/Chrome 실측 결과 SPEC 편입 (K0-0807-A 잔존)

**병합 순서**:
- PR #59 (이 라운드) = Kyu 실기 A-D 회수 후 병합
- 이전 라운드 = 병합 완료

---

## 다음 대기 (Kyu 회신 후)

1. **실기 A-D 회수** → PR #59 검토
2. **PR #59 병합** → auto-deploy → Kyu 재설치 + state 초기화 → 실 실측
3. **다음 허브 push** = 알림·배지 자동 발화 실측
4. **후속**: kyu-bridge v0.3 (Kyu 사인 대기) or 다른 라운드

---

*K0-0807-E · 2026-08-08 · v0.2 첫 실전 FAIL 회수 · pr-test-checklist-guide 형식 준수*
