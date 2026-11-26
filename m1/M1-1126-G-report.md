# M1-1126-G 리포트

**판정**: health=bad 는 거짓 — launchd 실행 환경 버그 5건 확인·수정 완료  
**PR**: https://github.com/CuriocityDevAi/curiocity-relay/pull/44

---

## 원인 (항목별 1줄)

| 항목 | 거짓값 | 원인 |
|------|--------|------|
| `memory.free_pct` = 2 | ~37% | `(free+spec)/total` 공식이 inactive(회수 가능) 페이지를 제외해 과소 측정 |
| `runners.listener_count` = 0 | 4 | `pgrep -c -f`는 launchd 자식 컨텍스트에서 타 사용자 프로세스를 보지 못함 |
| `tailscale.up` = false | true | launchd PATH에 `/Applications/Tailscale.app/Contents/MacOS` 미포함 |
| `netspeed` = 0/0/0 | 83↓/68↑ | launchd PATH에 `/usr/bin/networkQuality` 미포함 |
| `thermal.throttled` = true (speed=100) | false | GPU_Throttle 문구 grep 오탐 — CPU_Speed_Limit=100 과 모순 |

---

## 수정 내용

- `health.sh`: 메모리 공식 · ps -axo 교체 · tailscale/networkQuality 절대경로 · thermal GPU_Throttle 제거 · null 처리
- `ci-box-health.plist.template`: 주석에 절대경로 사용 명시
- `scripts/test/ci-box-health.test.sh`: 신규 (18 cases)
- `docs/ci-box-heartbeat.md`: 수집 항목·판정 규칙·launchd 주의사항 갱신

---

## 자기 검증: 맥북 dry-run (launchd 동일 환경은 아님 — 미검증 명시)

맥북 로컬에서 `bash health.sh --dry-run` 실행. launchd 완전 동일 환경 재현은 하지 않음.

```json
{
  "ts": "2026-11-26T03:45:13Z",
  "memory": { "free_pct": 36, "swap_used_mb": 3549.19, "swap_free_mb": 1570.81 },
  "runners": { "listener_count": 4, "worker_count": 0 },
  "tailscale": { "up": true, "ip": "100.108.58.112" },
  "netspeed": { "dl_mbps": 0, "ul_mbps": 0, "rpm": 0, "cached": true },
  "health": "ok",
  "reasons": []
}
```

- memory.free_pct: 36% — 구 공식(1%)보다 현실적, 수동 측정 수준과 일치
- runners.listener_count: 4 — 맥북에 4개 러너 존재, ps -axo 로 정상 감지
- tailscale.up: true — 절대경로로 정상 감지
- netspeed: 캐시에 stale 0 잔류 (dry-run 전 별도 `networkQuality -s -c` 직접 실행으로 절대경로 동작 확인함). iMac에서는 캐시 없으므로 정상 측정 예정.

**미검증 항목**: launchd 완전 동일 환경(`env -i HOME=$HOME PATH=…`) 재현 테스트 미실시.

---

## 아이맥 반영 명령

아이맥에서 아래 명령을 순서대로 실행. launchd 재설치 불필요(스크립트 직접 pull만으로 다음 tick부터 반영).

```bash
ssh KyuLee@100.82.115.70
git -C ~/projects/curiocity-relay-heartbeat pull --ff-only
bash ~/projects/curiocity-relay-heartbeat/scripts/ci-box/health.sh --dry-run
bash ~/projects/curiocity-relay-heartbeat/scripts/ci-box/install-health.sh --status
```

---

## 이연 순증감

이연 없음. 본 태스크 범위 내 완결.
