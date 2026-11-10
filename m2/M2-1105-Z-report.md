# M2-1105-Z 리포트

hub: m2  
runner: v6.3  
작성: 2026-11-10

---

## 1. 원인 분석 (file:line + 로그 발췌)

### 1-1. ensurePaneShell 실패 — Escape×2+/exit (hub-runner-v6.2.mjs:873-877)

```
# ~/.hub-runner/m3/M3-1105-Z.log (실측)
[pane-state] hub=m3 · initial=claude · tail 영역 claude chrome 토큰 감지
[pane-state] hub=m3 · claude → Escape×2 + /exit · send=true
[pane-state] hub=m3 · shell 복귀 실패 · last=claude · tail:
✻ Baked for 23m 31s
  ⏵⏵ bypass permissions on (shift+tab to cycle)   new task? /clear to save 125.2k tokens
```

`hub-runner-v6.2.mjs:873-877`: Claude 가 "baked/recap" 화면인 상태에서 `Escape×2` 는 입력칸 위치를 확실히 초기화하지 못함. 이후 `/exit` 가 입력 도중에 처리돼 `/exit` 명령으로 인식되지 않음. `Escape` 는 Claude 내부 UI 이벤트(메뉴 닫기 등)를 트리거할 수 있어 오히려 역효과.

**v6.3 수정**: `Escape×2` → `ctrl-u` (Unix 라인 초기화 — Claude 의 UI 상태와 무관하게 입력 버퍼 클리어) + close-surface/new-surface 폴백 추가.

### 1-2. 3분 지연 원인 — hub-runner-v6.2.mjs:1493

```
# ~/.hub-runner/launchd.err.log (발췌)
[hub-runner-v6.2:m3 2026-11-10T07:00:11Z] pick · M3-1105-AB
[hub-runner-v6.2:m3 2026-11-10T07:00:34Z] pane busy (1st) · 다음 tick 1회 재시도 예약
[hub-runner-v6.2:m3 2026-11-10T07:01:14Z] pick · M3-1105-AB
[hub-runner-v6.2:claim 2026-11-10T07:01:37Z] M3-1105-AB → blocked · pane busy (2nd · 재시도 소진)
[hub-runner-v6.2:m3 2026-11-10T07:08:27Z] pick · M3-1105-AB (오케 재발부 + Kyu /exit 후)
```

`hub-runner-v6.2.mjs:1493`: 2nd pane-busy 에서 `clearPaneBusyRetry` 로 retry 마크를 지움 → oké 가 `blocked` → `issued` 재발부 → 다음 tick 에 `hasPaneBusyRetry` = false → `else` 분기에서 `markPaneBusyRetry` 호출 → 1-tick 대기 추가 → 다시 2nd pane-busy → blocked 반복. 1 사이클 = 2 tick × 60s = 최소 2분, 추가 오버헤드로 3분.

**v6.3 수정**: `PANE_BUSY_EXHAUSTED_DIR` 마크 도입 — 2nd pane-busy 시 `markPaneBusyExhausted` 설정, 이후 reissue 뒤 여전히 pane-busy 면 2-tick 사이클 없이 즉시 blocked.

---

## 2. 수정 사항 (scripts/hub-runner-v6.3.mjs)

### 2-1. ensurePaneShell 개선 (option c = a + b 폴백)

- **(a)** `Escape×2` → `ctrl-u` (입력버퍼 클리어) + `/exit\n` → 10s 대기 → 여전히 claude 면 `C-c×2`
- **(b)** (a) 실패 시 `close-surface` + `new-surface` (PTY 종료 → SIGHUP → 프로세스 사망 + 새 쉘 생성) → 레이아웃 갱신 (in-memory + 파일)

### 2-2. exitPaneClaude 개선

- `Escape×2` → `ctrl-u` + `/exit\n` + `close-surface` 폴백

### 2-3. pane-busy 소진 후 즉시 집기

- `PANE_BUSY_EXHAUSTED_DIR` 마크: 2nd pane-busy 시 설정, reissue 후 pane-busy 재발 시 2-tick 사이클 없이 즉시 blocked

### 2-4. 완료 후 자동 정리

- 허브가 claim done 올리고 pane 이 입력 대기 상태이면 `ensurePaneShell` (작업 중엔 절대 안 건드림 조건 준수)

### 2-5. 셀프테스트 추가 (--selftest-respawn)

- `close-surface` + `new-surface` 폴백 경로 검증 — ctrl-u+/exit 무시 mock → C-c 무시 → close+new → shell 복귀

---

## 3. 셀프테스트 결과

```
selftest-split   OK · hub=m1 · landing=claim-done · pane=surface:38
selftest-timeout OK · 60s 초과 → C-c 2회 · pane blocked · sleep 중단 확인
selftest-layout  OK · 재사용 workspace=workspace:17 · 신 workspace 생성 안함
selftest-busy    OK · busy claude → ctrl-u+/exit → 작업 투입 → report 착지 → shell 복귀 (4 phase)
selftest-respawn OK · ctrl-u+/exit 무시 mock → C-c 무시 → respawn-pane → shell 복귀
```

---

## 4. 업그레이드 명령

```bash
cd ~/projects/curiocity-relay && git pull --rebase --autostash origin main && bash scripts/hub-runner-install.sh
```

(install.sh 는 `TARGET=hub-runner-v6.3.mjs FALLBACK=hub-runner-v6.2.mjs` 로 실행)
