# M1-1126-C 리포트

**판정: PASS** · PR https://github.com/CuriocityDevAi/curiocity-relay/pull/42

---

## 작업 내용

아이맥 CI 박스가 5분마다 자기 상태를 `status/ci-box/imac.json` 에 commit/push 하는 heartbeat 시스템 구현.

### 추가 파일 (브랜치 `feat/M1-1126-C-ci-box-heartbeat`)

| 파일 | 역할 |
|------|------|
| `scripts/ci-box/health.sh` | 수집·판정·push 본체 (`--dry-run` 지원) |
| `scripts/ci-box/install-health.sh` | launchd 설치/제거/상태 (`--uninstall` / `--status`) |
| `scripts/ci-box/ci-box-health.plist.template` | launchd plist 템플릿 (StartInterval 300 · RunAtLoad) |
| `status/ci-box/.gitkeep` | 경로 플레이스홀더 |
| `docs/ci-box-heartbeat.md` | 수집 항목·판정 규칙·예시 JSON |

### setup.sh 처리
M3-1126-A 가 같은 파일 수정 중이므로 충돌 방지를 위해 `install-health.sh` 를 별도 파일로 분리. setup.sh 미수정.

---

## 수집 항목

- 시각(ts) · uptime/load · 메모리 여유%(vm_stat 페이지 카운트) · swap
- 디스크 여유(/ 와 runner `_work`)
- thermal(CPU_Speed_Limit 값)
- 러너 프로세스(Runner.Listener 수 · Runner.Worker 수)
- GitHub 도달 지연(api.github.com curl ms)
- 네트워크 속도(networkQuality -s -c · 1시간 캐시)
- Postgres 생존(pg_isready localhost:5432)
- Tailscale 상태(up · ip)
- 판정 필드 `health: ok|warn|bad` + `reasons` 배열

---

## 판정 규칙

| 조건 | 수준 |
|------|------|
| 메모리 여유 < 15% | warn |
| 디스크 (/ 또는 _work) < 10 GB | bad |
| 러너 수 (listener) < 4 | bad |
| GitHub 지연 > 1500 ms | warn |
| 10분 이상 heartbeat 없음 | 읽는 쪽 bad 판정 |

---

## 자기 검증

### dry-run 실행 (맥북 · 동일 macOS 계열)

```
bash scripts/ci-box/health.sh --dry-run
```

출력 (요약):
```json
{
  "ts": "2026-11-26T02:19:11Z",
  "memory": {"free_pct": 8, "swap_used_mb": 3591.62},
  "disk": {"root_free_gb": 226, "runner_work_free_gb": 226},
  "thermal": {"throttled": false, "cpu_speed_limit_pct": 100},
  "runners": {"listener_count": 0, "worker_count": 0},
  "github": {"latency_ms": 91, "reachable": true},
  "postgres": {"alive": true},
  "tailscale": {"up": true, "ip": "100.108.58.112"},
  "health": "bad",
  "reasons": ["memory_free_8pct_lt_15", "runners_0_lt_4"]
}
```

맥북에서 runners=0 (CI 러너 없음), memory 8% (많이 사용 중) → bad 정상 판정.
JSON 구조 · 모든 수집 항목 정상 동작 확인.

### 판정 단위 테스트 (가짜 입력 ok/warn/bad)

9/9 통과:
- 정상 → ok ✓
- 메모리 10% (<15) → warn ✓
- root 디스크 5GB (<10) → bad ✓
- runner 디스크 5GB (<10) → bad ✓
- 러너 2개 (<4) → bad ✓
- GitHub 지연 2000ms (>1500) → warn ✓
- 모든 조건 위반 → bad ✓
- GitHub 지연 1500ms (경계, >1500 아님) → ok ✓
- 메모리 15% (경계, <15 아님) → ok ✓

---

## 인증 권장안

아이맥의 `gh` CLI 로그인 재사용.
relay clone 시 `credential.helper = gh auth git-credential` 자동 설정.
미로그인 시 1회 설정 명령: `gh auth login`

---

## Kyu 설치 명령 (아이맥 SSH 접속 후 붙여넣기)

```bash
# 1. 접속
ssh KyuLee@100.82.115.70

# 2. relay 최신 pull (또는 최초 clone)
if [ -d ~/projects/curiocity-relay ]; then
  git -C ~/projects/curiocity-relay pull --ff-only
else
  git clone --depth=1 https://github.com/CuriocityDevAi/curiocity-relay.git ~/projects/curiocity-relay
fi

# 3. gh 로그인 확인 (미로그인이면 아래 명령)
gh auth status || gh auth login

# 4. heartbeat 설치
bash ~/projects/curiocity-relay/scripts/ci-box/install-health.sh

# 5. dry-run 테스트
bash ~/projects/curiocity-relay/scripts/ci-box/health.sh --dry-run

# 6. 5분 후 relay 상태 확인
bash ~/projects/curiocity-relay/scripts/ci-box/install-health.sh --status
```

설치 5분 뒤 `status/ci-box/imac.json` 이 relay 에 갱신됨을 확인.

---

## 이연 순증감

신규 파일 5개 추가. 기존 파일 미수정. 이연 없음.
