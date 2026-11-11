# M2-1105-AM 리포트

## 커밋 SHA

`9e9392d61f6ce395ce1192a72640431a59ac0fef`

## 변경 파일 목록 (줄 수)

| 파일 | 변경 |
|------|------|
| `scripts/hub-runner-v6.9.mjs` | +3403 (신규) |
| `scripts/lib/enter-check.mjs` | +38 (신규) |
| `scripts/test/hub-runner-enter-check.test.mjs` | +130 (신규) |
| `scripts/hub-runner-install.sh` | +2 / -2 (TARGET/FALLBACK 2줄) |

## 이연 순증감

해당 없음 (러너 chore — relay main 직접 push).

## 구현 요약

### REQ(a) Enter 누락 자동 재전송

`dispatchInPane` 에서 기존 `waitPaneClaudeForeground(30s)` 대신 신규 `waitSessionStartedWithRetry` 를 호출.  
60초 폴링 후 미시작이면 `\n`(Enter) 재전송 최대 2회. 2회 소진 후도 미시작이면 `blocked` 반환.  
판정 순수 함수(`shouldSendEnterRetry`, `hasSessionStarted`) → `scripts/lib/enter-check.mjs`.

### REQ(b) 네트워크/API 오류 자동 복구

`waitForLanding` 에 `onPoll(now)` 콜백 추가.  
cmux-split 경로 `spawnClaudeForItem` 에서 콜백을 통해 pane 마지막 5줄을 검사.  
`API Error · Connection · Could not resolve` 패턴 최초 감지 후 60초 대기 → `계속\n` 전송, 최대 2회.  
중복 방지: `shouldSendContinue({ firstSeenAt, now, retriesSent })` 순수 함수 판정.  
판정 순수 함수(`hasApiErrorInTail`, `shouldSendContinue`) → `scripts/lib/enter-check.mjs`.

### REQ(c) 단위 테스트

`scripts/test/hub-runner-enter-check.test.mjs` — 20개 케이스 전부 통과:
- Enter 누락 (1회 성공 / 2회 blocked / 정상 시작 no-op)
- API 오류 계속 1회 / 2회 상한 / 정상 출력 오탐 없음 / 같은 상태 재폴링 중복 없음

## 검증 로그

```
$ node --check scripts/hub-runner-v6.9.mjs
v6.9 syntax OK

$ bash -n scripts/hub-runner-install.sh
install.sh syntax OK

$ node --test scripts/test/hub-runner-stuck.test.mjs scripts/test/hub-runner-queue-update.test.mjs scripts/test/hub-runner-model.test.mjs scripts/test/hub-runner-enter-check.test.mjs
# tests 42
# pass 42
# fail 0
# duration_ms 105.134625
```

## 착지 명령

```
cp /tmp/M2-1105-AM-report.md ~/projects/curiocity-relay/m2/
cd ~/projects/curiocity-relay
git add m2/M2-1105-AM-report.md
git commit -m "m2: M2-1105-AM"
git pull --rebase --autostash origin main
git push
node scripts/claim.mjs M2-1105-AM done "v6.9: Enter 재전송+API 복구 · 테스트 42/42"
```

## Kyu 용 Mac 설치 명령

**이 설치는 이 작업이 착지한 뒤 Kyu 가 직접 실행해야 한다.**

```
cd ~/projects/curiocity-relay
git pull
bash scripts/hub-runner-install.sh
```

### 실행 가능 시점

**실행 중인 허브(세션)가 없을 때** 실행한다.  
`hub-runner-install.sh` 는 내부에서 `launchctl bootout` 으로 현재 러너를 종료한 뒤 새 러너를 `bootstrap` 하므로, 허브가 작업 중일 때 실행하면 해당 세션이 강제 종료된다.  
(`load_plist()` → `launchctl bootout ... 2>/dev/null || true` → `sleep 1` → `launchctl bootstrap`)

### 성공 확인 (세 가지 모두 확인)

1. `launchctl list | grep com.curiocity.hub-runner` — PID 컬럼이 숫자(0 이상)이면 가동 중
2. `tail -20 ~/.hub-runner/launchd.err.log` — `hub-runner-v6.9` 시작 로그 확인
3. `cat ~/projects/curiocity-relay/status/runners/all.json | grep runner` — `"runner": "v6.9"` 확인
