PASS — PR #44 커밋 추가 완료
PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/44

## 변경 요약

커밋: `874963490` → `fix/M1-1126-G-heartbeat-launchd-env`

### REQ 1: 측정값 0/0 → 캐시 미저장 + null/unknown_netspeed 반환

`scripts/ci-box/health.sh` `collect_netspeed` — 측정 후 캐시 쓰기 전에 dl==0 && ul==0 체크 추가:

```bash
# dl==0 && ul==0 → networkQuality 실패: 캐시 없이 null 반환
if python3 -c "import sys; sys.exit(0 if float('${dl:-0}')==0 and float('${ul:-0}')==0 else 1)" 2>/dev/null; then
    printf '{"dl_mbps":null,"ul_mbps":null,"rpm":null,"_unknown":"unknown_netspeed"}'
    return
fi
```

### REQ 2: 캐시 읽기 — dl_mbps==0 && ul_mbps==0 → miss 처리

캐시 읽기 Python 블록에 조건 추가:

```python
if age < 3600 and not (d.get('dl_mbps', 0) == 0 and d.get('ul_mbps', 0) == 0):
```

### REQ 3: 테스트 B-3 추가

`scripts/test/ci-box-health.test.sh` — B-3 (3개 assertion):
- B-3: 0 캐시 → cache-read miss
- B-3: 측정값 0/0 → null 반환
- B-3: 측정값 0/0 → unknown_netspeed

## dry-run 결과 (0 캐시 미리 심은 상태)

```
$ printf '{"dl_mbps":0,"ul_mbps":0,"rpm":0,"_ts":<now>}' > ~/.ci-box-health-netspeed.json
$ env -i HOME="$HOME" PATH=/usr/bin:/bin:/usr/sbin:/sbin bash scripts/ci-box/health.sh --dry-run
```

```
netspeed: {"dl_mbps": null, "ul_mbps": null, "rpm": null}
reasons: ['unknown_netspeed']
health: ok
```

0 캐시 → miss 재측정 → networkQuality 실패(0/0) → `netspeed:null` + `unknown_netspeed` reason 추가, health 판정 미영향 확인.

## 테스트 결과

```
=== 결과: PASS=21 FAIL=0 ===
```

(기존 18 → 21: B-3 3개 추가)
