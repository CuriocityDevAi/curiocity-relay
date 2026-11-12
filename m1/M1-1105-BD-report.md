# M1-1105-BD 리포트 — install.sh 백틱 버그 · pane-close m2 가드 제거

작성: 2026-11-12 · Sonnet 4.6 · ⚠️ 수동 투입
PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/2 (브랜치 `m1/BD-install-backtick` · 커밋 e1ea2b6)

---

## 0. claim
`node scripts/claim.mjs M1-1105-BD started "manual"` 완료 (06:28:45Z).

---

## 1. install.sh 백틱 위치 · 수정 file:line

### 뿌리 (고치기 전 · `scripts/hub-runner-install.sh:89·116`)
```sh
cat > "$PLIST_FILE" <<PLIST          # ← unquoted heredoc
...
<!-- ...(대안으로 `caffeinate -i` 서브프로세스를 ...) -->   # ← 백틱 2개
...
PLIST
```
unquoted `<<PLIST` 안의 `` `caffeinate -i` `` 를 bash 가 명령 치환으로 해석 → `caffeinate -i` 가 실제로 포크되고 `` ` ... ` `` 안 결과가 비어 있어서 heredoc 자체는 끝나는 듯 보이나, `caffeinate -i` 프로세스는 install.sh 가 끝나도 **무한 실행** · 설치 로그는 `node --check OK` 뒤 멈춘 것처럼 보임. Kyu `pkill -P <pid> caffeinate` 로 풀고 v7.2 가동(pid 31237 · 06:14Z).

### 수정 (`scripts/hub-runner-install.sh:87-141`)
- ProcessType/LowPriorityIO/LegacyTimers 긴 XML 주석 전체를 **heredoc 밖 쉘 주석**(`#`) 으로 이동 (write_plist 선언 바로 위).
- heredoc 바디에는 변수 치환만 필요한 plist 뼈대만 유지 — 백틱·`$(` 전무.
- 다른 heredoc 2개(`<<'NODE'` × 2) 는 이미 quoted 라 안전.

재발 방지 (정적):
```
awk 'inhd{if(/^PLIST$/){inhd=0}else{print}} /cat > .* <<PLIST$/{inhd=1}' scripts/hub-runner-install.sh | grep -cE '`|\$\('
# → 0
```

### 수정 (`scripts/test/hub-runner-install.test.mjs` 신규)
- **T1·T2**: write_plist 임시 경로 호출 — bash timeout 2000ms 로 감쌈 · 2초 초과 시 명령 치환 서브프로세스 의심으로 실패. 생성된 plist 가 `plutil -lint` 통과 확인.
- **T3**: heredoc 바디 전수 정적 검사 — 백틱·`$(` 발견 시 실패.
- **T4**: `<key>ProcessType</key><string>Interactive</string>` · `LowPriorityIO=false` · `LegacyTimers=true` 보존 확인 (M1-1105-BA 수정 retrogression 감시).
- **T5**: 다른 heredoc(`<<NODE` 등) 전부 quoted (`<<'NODE'`) 확인.

---

## 2. 현재 설치 plist 확인 (수정·재설치 금지)

```
$ plutil -lint ~/Library/LaunchAgents/com.curiocity.hub-runner.plist
/Users/kyu.lee/Library/LaunchAgents/com.curiocity.hub-runner.plist: OK

$ grep -E "ProcessType|LowPriorityIO|LegacyTimers|hub-runner-v" ~/Library/LaunchAgents/com.curiocity.hub-runner.plist
<string>/Users/kyu.lee/projects/curiocity-relay/scripts/hub-runner-v7.2.mjs</string>
<key>ProcessType</key>
<key>LowPriorityIO</key>
<key>LegacyTimers</key>

$ grep -c 'caffeinate' ~/Library/LaunchAgents/com.curiocity.hub-runner.plist
0
```
- lint OK · v7.2 바이너리 로드 · ProcessType=Interactive 있음 · caffeinate 텍스트 없음.
- 현재 설치는 안전한 상태 — 수정·재설치 **하지 않음** (REQ 2).

---

## 3. pane-close m2 가드 처리

### 결정: `hub === 'm2' → skip` 가드 **제거** (권장안)
- 뿌리: v6.5 때 M2 는 수동 투입 전용이라 skip 가드 추가 (M1-1105-BC 가 그 가드를 그대로 가져옴) → v7 시대 M2 도 큐 자동 투입(M2-1105-AQ·AR·AS)로 전환됐으나 가드 미반영 → M2 끝난 창이 영원히 안 닫힘.
- claim note 의 "manual" 문자열 기반 판정 검토 → **불필요**. 이유: `exitPaneClaude` 는 러너의 dispatch 성공 경로에서만 호출됨(`hub-runner-v7.2.mjs:2082`). 수동 투입(Kyu 가 직접 claude 띄움) 은 러너 dispatch 를 거치지 않아 이 함수에 도달하지 않음. 함수-레벨 skip 가드 자체가 불필요.

### 수정 (`scripts/lib/pane-close.mjs:42-54`)
```diff
-export function decideCloseAction({ hub, state, attempt, isDone }) {
-  if (hub === 'm2') return { action: 'skip', reason: 'manual-hub' };
+export function decideCloseAction({ hub: _hub, state, attempt, isDone }) {
   if (isDone === false) return { action: 'skip', reason: 'not-done' };
```
주석에 뿌리·수정 이유 기록 (lib/pane-close.mjs:18-23 · hub-runner-v7.2.mjs:1530-1532).

### 테스트 변경 (`scripts/test/hub-runner-pane-close.test.mjs`)
- 제거: `가드 — hub=m2 skip` · `우선순위 — m2 는 isDone=false 보다 먼저`.
- 추가: `BD — hub=m2 는 다른 허브와 동일하게 닫힘` · `BD — reason 에 manual-hub 없음 (전수 검증)` · `우선순위 — isDone=false 는 state=claude 보다 먼저 (BD: m2 포함)`.
- 총 14 → 14 (순증감 0 · 의미는 전환).

---

## 4. 테스트 통과 로그 · 설치 명령

### 전체 (기존 102 BC + 신규 4 install = 106)
```
$ node --test scripts/test/*.test.mjs
...
1..106
# tests 106
# pass 106
# fail 0
# duration_ms 7191.625625
```

### 설치 명령 (허브 전부 idle 때 · PR #2 머지 뒤)
```
cd ~/projects/curiocity-relay
git pull origin main
grep -c 'caffeinate' scripts/hub-runner-install.sh          # 0 (쉘 주석에서도 제거됐는지 2차 확인)
awk 'inhd{if(/^PLIST$/){inhd=0}else{print}} /<<PLIST$/{inhd=1}' scripts/hub-runner-install.sh | grep -cE '`|\$\('   # 0
bash scripts/hub-runner-install.sh
```
`install.sh` 는 TARGET=hub-runner-v7.2.mjs 디폴트 유지 · FALLBACK v7.1.

---

## 5. 이연 순증감
- 이연: 0 신규
- 해결: 장치 사건 11-12 13:12 (install.sh 백틱) · M1-1105-BC 가 가져온 M2 skip 가드 (v6.5 잔재) 정리.
- ledger/device-incidents.md 는 "install.sh 백틱 caffeinate" 항목 추가 + 해결 ID M1-1105-BD 대상.

---

## 6. 착지 명령
```
cp /tmp/M1-1105-BD-report.md ~/projects/curiocity-relay/m1/ && \
cd ~/projects/curiocity-relay && \
git add m1/M1-1105-BD-report.md && \
git commit -m "m1: M1-1105-BD" && \
git pull --rebase --autostash origin main && \
git push && \
node scripts/claim.mjs M1-1105-BD done "PR #2 · install.sh heredoc 백틱 제거 + 테스트 · pane-close m2 가드 제거 · plist lint OK"
```
