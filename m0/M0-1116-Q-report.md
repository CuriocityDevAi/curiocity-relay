원인 한 줄 = runner-config.json m2/m3 cwd 가 `pos-m2`·`pos-m3`(RN POS 앱)인데 큐 프롬프트가 "건드릴 파일: **storeport** …"를 지시 → spawn 된 Claude 가 cwd 밖으로 탈출해 `~/projects/storeport-kyu`(Kyu 개인 clone) 를 사용. · M2-1105-BT 설치 건 = **설치 할 것 없음**(완결된 stray). last_error 는 v7.3 이 lastError 를 영구 클리어 안 해서 남은 stale 메시지. · Kyu 할 일 = 2 단계(설정 1 · 재설치 1).

---

## 1. 허브별 cwd 결정 경로 (재현)

1. launchd plist = `~/Library/LaunchAgents/com.curiocity.hub-runner.plist` → `node /…/scripts/hub-runner-v7.3.mjs --all` (실측: `cat ~/Library/LaunchAgents/com.curiocity.hub-runner.plist`).
2. v7.3 는 `status/runner-config.json` 의 `hubs.<hub>.cwd` 를 유일한 cwd 원본으로 사용 (`pickNext` 후 `spawnClaude(item, cfg.cwd, …)`). `hubs.json` 은 build-hubs 가 매번 덮어써서 cwd 소스가 아니고, 프롬프트 본문에도 cwd 를 넣지 않음. 즉 **런너가 자식 claude 의 cwd 를 강제**.
3. 현 runner-config (실측):
   - m0 cwd = `/Users/kyu.lee/projects/storeport` (storeport 리포)
   - m1 cwd = `/Users/kyu.lee/projects/pos-m1`, m2 = `pos-m2`, m3 = `pos-m3`, r0 = `pos-r0` (전부 RN POS 앱 리포)
4. 현 큐 (실측 11-16):
   - `queue/m2/M2-1116-N.md` → "건드릴 파일: storeport `apps/customer-display/app.config.ts` 한 파일만".
   - `queue/m3/M3-1116-S.md` → "건드릴 파일: storeport `apps/customer-display/app/_layout.tsx` · `commerce-core` …".
5. spawn 된 Claude 입장: `cwd=~/projects/pos-m2` 인데 "storeport 수정" 지시 + "허브 폴더 밖 금지" 금지 + 큐에 storeport 로 가라는 구체 지시가 충돌. `pos-m2` 안엔 storeport 소스 없음. `~/projects` 아래 매칭 후보 = `storeport`(M0 cwd — 소유권 충돌) · `storeport-kyu`(Kyu 개인 clone). Claude 가 **M0 를 피해 Kyu 폴더로 들어감**. 실증:
   - `m3/M3-1116-S-report.md` 에 "**변경 범위 (storeport-kyu)**" 명시 · storeport-kyu HEAD = `470ed13 feat(loyalty): M3-1116-S …` · 브랜치 `fix/m3-1116-s`.
   - `m2/M2-1116-N-report.md` 는 경로 미명시지만 `apps/customer-display/app.config.ts` 를 PR #305 로 처리(동일 메커니즘 추정).
6. 결론: **원인은 cwd 와 작업 범위의 축 미스매치**(허브 배정 전략이 모듈 단위인데 큐가 storeport 리포 작업을 할당). 러너나 Claude 코드 버그가 아니라 **설정(라우팅)**.

## 2. "runner-folder change pending Kyu install (m2/M2-1105-BT-report.md)" 해부

- v7.3 safePull (`scripts/hub-runner-v7.3.mjs:531-560`) 는 러너 스코프(`status/claims/`·`status/runners/`·`status/hubs.json`) 밖 변경을 발견하면
  1) untracked 중 origin/main 과 동일한 것은 auto-quarantine(`~/.hub-runner/quarantine/…`),
  2) 그 뒤에도 남은 파일이 있으면 `lastError = "blocked: runner-folder change pending Kyu install (<파일>)"` 설정 + 1 회 로그. **파일명은 "남은 첫 번째 외부 변경"** 그 자체(=설치 대상이 아님).
- 과거 11-05 시점에 `m2/M2-1105-BT-report.md` 가 origin/main 미존재(=content 불일치)로 격리 실패 → 메시지 각인.
- 이후 `cc4a0d9b m2: M2-1105-BT` 로 **실제 커밋 완료**(git log 로 확인) → stray 문제 자체는 해결됨.
- 그러나 v7.3 는 `lastError` 를 **set 지점(559줄) 1 곳**, read 지점(2266줄 heartbeat) 만 가짐. **클리어 로직 없음** → safePull 성공해도 `all.json.last_error` 는 처음 각인된 문자열을 영구 유지. 지금의 `all.json`(실측):
  - `"last_error": "blocked: runner-folder change pending Kyu install (m2/M2-1105-BT-report.md)"`, `"runner": "v7.3"`, `"at": "2026-11-16T14:29:01.048Z"`, 그러나 현재 `git -C ~/projects/curiocity-relay status --porcelain` = `M status/runners/all.json` 하나뿐(= stray 없음).
- 설치 (`bash scripts/hub-runner-install.sh` 재실행)가 이번 문제(storeport-kyu 사용)를 막지 **못한다**. 설치 스크립트는 plist 재배치·node --check 뿐이고, 러너 로직 자체는 cwd 미스매치를 감지하지 않는다. "K8 러너 재설치" 핸드오프 항목은 last_error 메시지의 문구(`pending Kyu install`)에 끌려 올려진 **오독**.

## 3. 읽기 전용 상태(실측 11-16 14:32 KST)

| 폴더 | 브랜치 | git status --porcelain |
|---|---|---|
| `~/projects/storeport-kyu` | `fix/m3-1116-s` | clean (출력 없음) · HEAD `470ed13 feat(loyalty): M3-1116-S …` |
| `~/projects/kyu-display` | `main` | `D apps/customer-display/expo-env.d.ts` · `M apps/customer-display/tsconfig.json` (dirty) |
| `~/projects/agilo-fork-test` | `master` | clean (출력 없음) |

(세 폴더 모두 쓰기·checkout·stash 미실시. `git -C <path> status --short`·`branch --show-current` 만.)

## 4. 재발 방지안 (권장 1개)

### 권장: 허브별 **전용 storeport worktree** + 러너 cwd 핀 + prompt 공통 머리말 금지절

**근거**: 러너가 이미 `cfg.cwd` 를 강제로 자식 spawn 에 주입한다(§1 재현). 미스매치는 "큐가 storeport 지시 → 허브 cwd 가 RN 앱" 축 어긋남이 유일 원인. 허브별로 storeport worktree 를 1개씩 고정 할당하면 (a) cwd 가 자동으로 맞고 (b) 다른 허브 브랜치와 안 겹치고 (c) Kyu 개인 clone 은 사용자 전용으로 보존된다. `curiocity-live/storeport-wts/` 아래 티켓별 worktree 가 이미 수십 개 운용 중이라 패턴 정합(`git worktree list` 실측).

**설계**:
- 레이아웃: `~/curiocity-live/storeport-wts/hub-m2`, `…/hub-m3`, `…/hub-m1`(필요 시), `…/hub-r0`(필요 시). m0 는 `~/projects/storeport` 유지.
- 브랜치: 각 worktree 는 `origin/main` 에서 체크아웃. 티켓마다 feat/fix 브랜치는 Claude 가 거기서 잘라 쓴다.
- 러너 변경: `status/runner-config.json` 에서 m2/m3 (및 storeport 작업이 할당되는 다른 허브) cwd 를 그 경로로 교체.
- Prompt 공통 머리말(큐 템플릿): "쓰기·커밋·브랜치 전환은 **당신의 허브 cwd 안**에서만. `cd` 로 cwd 밖으로 이동 금지. 다른 리포가 필요하면 즉시 정지·M0 에 reroute 요청." — 현 ⛔ 상시 금지 블록의 "허브 폴더 밖 쓰기" 를 모든 큐가 일관되게 상속하도록 헤더 1 줄 추가.
- (선택) v7.4 에서 `lastError` 를 safePull 성공 시 null 로 돌리는 1 줄 추가 — stale 메시지 재발 방지(별도 티켓).

**트레이드오프**:
- 디스크 추가 사용(worktree 1 개 ≈ 2–3 GB) · 하지만 `curiocity-live/storeport-wts/` 패턴으로 이미 수용 중.
- 허브가 storeport 아닌 리포도 가끔 만지면(예: M2 가 pos-m2 손 대야 할 때) 라우팅을 M0 가 다시 담당. 현재 큐 11-16 분을 보면 m2·m3 는 전부 storeport 작업이라 분리가 오히려 명확.

### Kyu 가 할 일 (처음 하는 사람 기준 · 전 허브 idle 때)

**사전 확인**(둘 다 선행):
```
cat ~/projects/curiocity-relay/status/runners/all.json | grep -E '"current"'
# → 모든 허브 current 가 null 인지 확인 (현재 M0 가 이 티켓 처리 중 · 끝난 뒤 돌릴 것)
```

**1단계 · storeport 허브 worktree 추가(m2·m3 · 쉘에서 1 회)**:
```
cd ~/projects/storeport && \
  git fetch origin main && \
  git worktree add -B hub-m2 ~/curiocity-live/storeport-wts/hub-m2 origin/main && \
  git worktree add -B hub-m3 ~/curiocity-live/storeport-wts/hub-m3 origin/main && \
  (cd ~/curiocity-live/storeport-wts/hub-m2 && pnpm install) && \
  (cd ~/curiocity-live/storeport-wts/hub-m3 && pnpm install)
```
(참고: `hub-m2`·`hub-m3` 브랜치는 "휴면 홈" 용도이고, 실제 티켓 작업은 Claude 가 거기서 `feat/…` 브랜치를 새로 자른다. 티켓 마무리 후엔 홈 브랜치로 돌아가면 됨.)

**2단계 · runner-config.json 수정 → 러너 재설치(쉘에서 1 회 · 이것만 Kyu 가 함)**:
`status/runner-config.json` 의 `hubs.m2.cwd` · `hubs.m3.cwd` 를 각각
- `"/Users/kyu.lee/curiocity-live/storeport-wts/hub-m2"`
- `"/Users/kyu.lee/curiocity-live/storeport-wts/hub-m3"`

로 바꾼 뒤:
```
cd ~/projects/curiocity-relay && \
  git add status/runner-config.json && \
  git commit -m "chore(runner): m2/m3 cwd → storeport hub worktree (fix M0-1116-Q)" && \
  git pull --rebase --autostash origin main && git push && \
  bash scripts/hub-runner-install.sh
```
install.sh 가 자동으로 cwd 존재 여부를 선실측(설치 시 1 단계에서 만든 dir 확인) · 레거시 plist 정리 · bootout+bootstrap 수행.

(선택 3단계 · 큐 템플릿 머리말에 "cwd 밖 금지" 1 줄 추가 — M0 가 다음 라운드부터 반영. Kyu 는 안 해도 됨.)

### 설치됐으면 이번 문제가 막혔는지?
- 1·2 단계 설치 후: m2/m3 cwd 가 storeport 로 가므로 Claude 가 `storeport-kyu` 로 탈출할 유인이 사라짐 → **막힘**.
- stale `last_error` 는 1·2 단계로는 안 지워짐(v7.3 코드 한계). 신규 stray 가 생기지 않는 한 동작엔 무해 — 신호로 오해만 안 하면 됨. 정식 처리는 v7.4 에서 lastError 성공 시 리셋.

---

- 착지 명령(마지막 1회):
```
cp /tmp/M0-1116-Q-report.md ~/projects/curiocity-relay/m0/ && cd ~/projects/curiocity-relay && git add m0/M0-1116-Q-report.md && git commit -m "m0: M0-1116-Q" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M0-1116-Q done "cwd 미스매치 · install 건 無 · Kyu 2단계"
```
