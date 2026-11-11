# M2-1105-AN 리포트 · hub-runner-v7.0 (cmux 빈 Hubs 탭 반복 생성 수정)

완료: 2026-11-11

---

## 커밋 SHA

`dd5038cb31c4f249e961320dff46e1faf11b13ae` (heartbeat 커밋에 포함됨 — 러너가 staged 파일을 함께 커밋)

---

## 변경 파일 목록

| 파일 | 종류 | 줄 수 |
|------|------|-------|
| `scripts/hub-runner-v7.0.mjs` | 신규 (v6.9 복사+수정) | 3539 |
| `scripts/lib/cmux-hubs.mjs` | 신규 | 89 |
| `scripts/test/hub-runner-cmux-hubs.test.mjs` | 신규 | 209 |
| `scripts/hub-runner-install.sh` | 수정 (TARGET/FALLBACK 2줄) | 187 |

---

## 이연 순증감

신규 파일만 추가, 기존 파일(v6.9 포함) 수정 없음.

---

## 착지 명령

```
cp /tmp/M2-1105-AN-report.md ~/projects/curiocity-relay/m2/
cd ~/projects/curiocity-relay
git add m2/M2-1105-AN-report.md
git commit -m "m2: M2-1105-AN"
git pull --rebase --autostash origin main
git push
node scripts/claim.mjs M2-1105-AN done "v7.0 cmux UNKNOWN 처리 · Hubs 빈 탭 반복 생성 차단 · 10분 상한 · prune · 테스트 30개"
```

---

## 테스트 통과 로그

```
node --test scripts/test/hub-runner-cmux-hubs.test.mjs
# tests 30
# pass  30
# fail  0
# duration_ms ~103ms
```

전체 테스트 (기존 포함):
```
node --test scripts/test/hub-runner-stuck.test.mjs \
     scripts/test/hub-runner-enter-check.test.mjs \
     scripts/test/hub-runner-queue-update.test.mjs \
     scripts/test/hub-runner-model.test.mjs \
     scripts/test/hub-runner-cmux-hubs.test.mjs
# tests 72
# pass  72
# fail  0
```

검증:
```
node --check scripts/hub-runner-v7.0.mjs   → OK
bash -n scripts/hub-runner-install.sh       → OK
```

---

## Kyu 용 Mac 설치 명령 (이 작업 착지 후 직접 실행)

**이 설치는 이 작업이 착지(push + claim done)한 뒤 Kyu 가 직접 실행해야 한다.**

```
cd ~/projects/curiocity-relay
git pull
bash scripts/hub-runner-install.sh
```

### 성공 확인 방법

설치 스크립트는 `launchctl bootout` 으로 기존 러너를 종료하고 `launchctl bootstrap` 으로 v7.0 을 재가동한다.

1. PID 숫자 확인 (0 이상이면 정상 실행 중):
```
launchctl list | grep com.curiocity.hub-runner
```
출력 예: `12345  0  com.curiocity.hub-runner`  ← 첫 컬럼이 pid

2. 로그에서 v7.0 시작 줄 확인:
```
grep "hub-runner-v7.0" ~/.hub-runner/launchd.err.log | tail -3
```

3. relay `status/runners/all.json` 의 version=v7.0 확인:
```
grep runner ~/projects/curiocity-relay/status/runners/all.json
```

### 실행해도 되는 시점

허브에서 claude 가 실행 중이지 않을 때. 설치 스크립트가 `launchctl bootout` 으로 기존 러너(및 그 자식 프로세스인 claude)를 종료하므로, **실행 중인 허브 작업이 없을 때** 설치할 것.

확인: `launchctl list | grep com.curiocity.hub-runner` 에서 pid 컬럼 확인 후, 허브 pane(cmux Hubs 탭)에 claude 작업이 없을 때 실행.

---

## 수동 정리 팁 (자동 prune 이 건너뛴 경우)

cmux 사이드바에 빈 "Hubs" 탭이 여러 개 남아있으면:

1. cmux 열기
2. 사이드바에서 "Hubs" 탭들 중 허브 pane(M0/M1/M2/M3/R0 패널)이 없는 빈 것들 선택
3. `close-workspace` 명령 또는 사이드바 우클릭 → "Close workspace"로 삭제

또는 터미널에서 한 번에:
```
cmux list-workspaces
```
로 `workspace:N  Hubs` 목록을 확인한 뒤, 비어있는 것들에 대해:
```
cmux close-workspace --workspace workspace:N
```
(실행 중인 허브 pane 이 없는 것만 닫을 것)

---

## 자기 검증

- `node --check scripts/hub-runner-v7.0.mjs` → 실행, OK
- `bash -n scripts/hub-runner-install.sh` → 실행, OK
- `node --test scripts/test/hub-runner-cmux-hubs.test.mjs` → 실행, 30/30 통과
- 전체 테스트 → 실행, 72/72 통과
