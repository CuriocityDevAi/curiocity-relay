#44 CHANGES

**검토 대상**: PR #44 `fix/M1-1126-G-heartbeat-launchd-env`  
**판정 근거**: 항목 2 (실패값 캐시 금지) 미충족

---

## 항목 1: launchd 동일 환경 재현 ✓

```bash
$ env -i HOME="$HOME" PATH=/usr/bin:/bin:/usr/sbin:/sbin bash scripts/ci-box/health.sh --dry-run
```

```json
{
  "memory": { "free_pct": 37, "swap_used_mb": 3525.19, "swap_free_mb": 1594.81 },
  "runners": { "listener_count": 4, "worker_count": 0 },
  "tailscale": { "up": true, "ip": "100.108.58.112" },
  "netspeed": { "dl_mbps": 0, "ul_mbps": 0, "rpm": 0, "cached": true },
  "health": "ok",
  "reasons": []
}
```

memory 37%, runners 4, tailscale true, health ok — 주요 5개 버그 모두 수정 확인.  
단, netspeed는 stale 0 캐시 반환(다음 항목 참조).

---

## 항목 2: 실패값 캐시 금지 ✗ **CHANGES**

**실제 캐시 파일**:
```json
{"dl_mbps":0,"ul_mbps":0,"rpm":0,"_ts":1795664605}
```

**문제**: `collect_netspeed` (health.sh L191–195)에서 측정 결과가 0/0/0 이어도 캐시에 그대로 저장함. 캐시 읽기 로직(L155–175)에서도 dl_mbps=0 여부를 확인하지 않고 그대로 반환함.

```bash
# 현재 코드 (L191–195) — 0 값 체크 없음
printf '{"dl_mbps":%s,"ul_mbps":%s,"rpm":%s,"_ts":%d}' \
    "$dl" "$ul" "$rpm" "$now_epoch" > "$NETSPEED_CACHE"
```

```python
# 현재 캐시 읽기 (L159–165) — dl=0 무시 로직 없음
age = now - int(d.get('_ts', 0))
if age < 3600:
    d['cached'] = True
    ...
    print(json.dumps(d))
```

dry-run 실행 결과 `"dl_mbps":0,"ul_mbps":0,"rpm":0,"cached":true` 반환 확인.  
아이맥에서 첫 실행 시 networkQuality 실패 → 0/0/0 캐시 저장 → 1시간 동안 null/unknown_netspeed 아닌 0 반환 가능.

**필요 수정**:
1. `collect_netspeed` 캐시 쓰기 전: `dl==0 and ul==0` 이면 캐시 저장 않고 `null + unknown_netspeed` 반환
2. 캐시 읽기: `d.get('dl_mbps',0)==0 and d.get('ul_mbps',0)==0` 이면 `"miss"` 처리
3. 테스트 케이스 추가 (B-3: netspeed 0 캐시 → null/unknown 반환)

---

## 항목 3: 메모리 공식 vs memory_pressure ✓

| 출처 | 값 |
|------|----|
| health.sh (vm_stat, inactive 포함) | **37%** |
| `memory_pressure` System-wide free% | **49%** |
| 차이 | 12%p (±15%p 이내) |

---

## 항목 4: 러너 감지 오탐 ✓

`grep -c "Runner\.Listener"` — `\.` 는 BRE에서 literal dot, 아래 프로세스 오탐 없음:

| 프로세스 | 매칭 여부 |
|----------|-----------|
| `./externals/node24/bin/node ./bin/RunnerService.js` | 불일치 ✓ |
| `/opt/homebrew/.../node .hub-runner/bin/hub-runner.mjs` | 불일치 ✓ |
| `node .hub-runner/bin/ci-watch.mjs` | 불일치 ✓ |
| `bin/Runner.Listener run --startuptype service` × 4 | 정상 감지 ✓ |

---

## 항목 5: 테스트 실행 ✓

```
=== 결과: PASS=18 FAIL=0 ===
```

단, 테스트에 "netspeed 0 캐시 → null 반환" 케이스 없음(항목 2 수정 시 함께 추가 필요).
