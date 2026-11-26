# ci-box heartbeat — 아이맥 상태 모니터링

아이맥(macOS 26 · M1 16GB · CI 전용) 이 5분마다 자기 상태를 `status/ci-box/imac.json` 에 commit/push 하는 heartbeat 시스템.

## 파일 구조

```
scripts/ci-box/
  health.sh                   # 수집·판정·push 본체
  install-health.sh           # launchd 설치/제거/상태 확인
  ci-box-health.plist.template  # launchd plist 템플릿
status/ci-box/
  imac.json                   # heartbeat 결과 (아이맥이 write)
```

## 수집 항목

| 필드 | 수집 방법 | 비고 |
|------|-----------|------|
| `ts` | ISO 8601 UTC | 수집 시각 |
| `uptime.uptime_secs` | `kern.boottime` sysctl | 부팅 후 경과 초 |
| `uptime.load_1/5/15` | `vm.loadavg` sysctl | 1/5/15분 로드 평균 |
| `memory.free_pct` | `vm_stat` 페이지 카운트 계산 | (free+spec+inactive)/total × 100 · inactive 포함(M1-1126-G) |
| `memory.swap_used_mb` | `vm.swapusage` sysctl | — |
| `disk.root_free_gb` | `df -g /` | 루트 파티션 여유 GB |
| `disk.runner_work_free_gb` | `df -g <_work>` | runner `_work` 파티션 여유 GB |
| `thermal.throttled` | `pmset -g therm` | CPU_Speed_Limit < 100 일 때만 true |
| `runners.listener_count` | `ps -axo command \| grep Runner.Listener` | 대기 중 러너 수 · null = 측정 불가 |
| `runners.worker_count` | 같음 (Runner.Worker) | 실행 중 작업 수 · null = 측정 불가 |
| `github.latency_ms` | `curl api.github.com` | HTTPS 응답 ms |
| `netspeed.dl_mbps` | `/usr/bin/networkQuality -s -c` → 실패 시 curl Cloudflare 10MB 폴백 (M1-1126-J) | 1시간에 1번만 측정·캐시 · null = 두 방법 모두 실패 |
| `netspeed.ul_mbps` | networkQuality 성공 시 측정 · curl 폴백 시 null | — |
| `netspeed.rpm` | networkQuality 성공 시 측정 · curl 폴백 시 null | Responsiveness (RPM) |
| `postgres.alive` | `pg_isready` | localhost:5432 |
| `tailscale.up` | 절대경로 Tailscale.app binary (M1-1126-G) | BackendState=Running · null = 미설치 |
| `tailscale.ip` | 같음 | Tailscale IPv4 |
| `health` | 판정 로직 | `ok` / `warn` / `bad` |
| `reasons` | 판정 로직 | 위반 항목 목록 (unknown_* 는 포함되나 bad 판정 무관) |

## 판정 규칙

| 조건 | 수준 |
|------|------|
| 메모리 여유 < 15% | `warn` |
| 디스크 (/ 또는 _work) < 10 GB | `bad` |
| 러너 수 (listener) < 4 | `bad` |
| 러너 수 null (ps 실패) | `ok` + reasons 에 `unknown_runners` |
| GitHub 지연 > 1500 ms | `warn` |
| tailscale / netspeed 측정 불가 | `ok` + reasons 에 `unknown_*` |
| 10분 이상 heartbeat 없음 | 읽는 쪽이 `bad` 판정 |

## launchd 환경 주의사항

launchd 에서 health.sh 실행 시 PATH 가 사용자 셸과 다름.
M1-1126-G 에서 확인된 원인과 대응:

| 항목 | 원인 | 대응 |
|------|------|------|
| `tailscale.up` false 거짓 | PATH 에 Tailscale.app 없음 | 절대경로 `/Applications/Tailscale.app/Contents/MacOS/Tailscale` |
| `netspeed` 0/0/0 거짓 | PATH 에 `networkQuality` 없음 | 절대경로 `/usr/bin/networkQuality` |
| `runners.listener_count` 0 거짓 | `pgrep`이 launchd 자식 컨텍스트에서 타 사용자 프로세스 미조회 | `ps -axo command \| grep -c` 로 교체 |
| `memory.free_pct` 2 거짓 | inactive 페이지(회수 가능) 미포함 | `(free+spec+inactive)/total` 공식 |
| `thermal.throttled` true 거짓 | GPU_Throttle grep 오탐 | CPU_Speed_Limit < 100 조건만 사용 |

M1-1126-J 에서 확인된 원인과 대응:

| 항목 | 원인 | 대응 |
|------|------|------|
| `netspeed` null (unknown_netspeed) 거짓 | 절대경로 대응 후에도 아이맥 launchd 환경에서 `networkQuality` 가 0 bytes/s 반환 (Ethernet 인터페이스 미지원 또는 잠금화면 네트워크 확장 제한) | `networkQuality` dl=0 시 `curl https://speed.cloudflare.com/__down?bytes=10000000` 으로 dl_mbps 대체 측정 · ul·rpm=null 허용 |

## JSON 예시

```json
{
  "ts": "2026-11-26T05:00:00Z",
  "uptime": {"uptime_secs": 86400, "load_1": 0.5, "load_5": 0.4, "load_15": 0.3},
  "memory": {"free_pct": 42, "swap_used_mb": 0, "swap_free_mb": 2048},
  "disk": {"root_free_gb": 150, "runner_work_free_gb": 150},
  "thermal": {"throttled": false, "cpu_speed_limit_pct": 100},
  "runners": {"listener_count": 4, "worker_count": 1},
  "github": {"latency_ms": 320, "reachable": true},
  "netspeed": {"dl_mbps": 83.1, "ul_mbps": null, "rpm": null, "cached": false},
  "postgres": {"alive": true},
  "tailscale": {"up": true, "ip": "100.82.115.70"},
  "health": "ok",
  "reasons": []
}
```

## 인증

push 는 아이맥에 설치된 `gh` CLI의 인증을 재사용.
- gh 로그인 확인: `gh auth status`
- 미로그인 시 1회: `gh auth login`

clone 시 credential helper 를 `gh auth git-credential` 로 자동 설정.

## 로그

`~/Library/Logs/ci-box-health.log`

## 설치

heartbeat 전용 clone 경로(`~/projects/curiocity-relay-heartbeat`)를 사용한다.
기존 `~/projects/curiocity-relay` tarball 폴더는 건드리지 않는다.

아이맥 SSH 접속 후 아래 명령을 순서대로 실행 (if 블록은 한 번에 붙여넣기):

```bash
ssh KyuLee@100.82.115.70
if [ -d ~/projects/curiocity-relay-heartbeat/.git ]
then
  git -C ~/projects/curiocity-relay-heartbeat pull --ff-only
else
  git clone --depth=1 https://github.com/CuriocityDevAi/curiocity-relay.git ~/projects/curiocity-relay-heartbeat
fi
gh auth status || gh auth login
bash ~/projects/curiocity-relay-heartbeat/scripts/ci-box/install-health.sh
bash ~/projects/curiocity-relay-heartbeat/scripts/ci-box/health.sh --dry-run
bash ~/projects/curiocity-relay-heartbeat/scripts/ci-box/install-health.sh --status
```
