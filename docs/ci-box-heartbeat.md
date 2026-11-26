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
| `memory.free_pct` | `vm_stat` 페이지 카운트 계산 | (free+speculative)/total × 100 |
| `memory.swap_used_mb` | `vm.swapusage` sysctl | — |
| `disk.root_free_gb` | `df -g /` | 루트 파티션 여유 GB |
| `disk.runner_work_free_gb` | `df -g <_work>` | runner `_work` 파티션 여유 GB |
| `thermal.throttled` | `pmset -g therm` | CPU_Speed_Limit < 100 → true |
| `runners.listener_count` | `pgrep Runner.Listener` | 대기 중 러너 수 |
| `runners.worker_count` | `pgrep Runner.Worker` | 실행 중 작업 수 |
| `github.latency_ms` | `curl api.github.com` | HTTPS 응답 ms |
| `netspeed.dl_mbps` | `networkQuality -s -c` | 1시간에 1번만 측정·캐시 |
| `netspeed.ul_mbps` | 같음 | — |
| `netspeed.rpm` | 같음 | Responsiveness (RPM) |
| `postgres.alive` | `pg_isready` | localhost:5432 |
| `tailscale.up` | `tailscale status --json` | BackendState=Running |
| `tailscale.ip` | 같음 | Tailscale IPv4 |
| `health` | 판정 로직 | `ok` / `warn` / `bad` |
| `reasons` | 판정 로직 | 위반 항목 목록 |

## 판정 규칙

| 조건 | 수준 |
|------|------|
| 메모리 여유 < 15% | `warn` |
| 디스크 (/ 또는 _work) < 10 GB | `bad` |
| 러너 수 (listener) < 4 | `bad` |
| GitHub 지연 > 1500 ms | `warn` |
| 10분 이상 heartbeat 없음 | 읽는 쪽이 `bad` 판정 |

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
  "netspeed": {"dl_mbps": 450.2, "ul_mbps": 95.1, "rpm": 310, "cached": true},
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
