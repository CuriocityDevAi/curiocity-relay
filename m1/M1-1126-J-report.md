PASS https://github.com/CuriocityDevAi/curiocity-relay/pull/46
원인: 아이맥 launchd 환경에서 `/usr/bin/networkQuality -s -c` 가 Ethernet 인터페이스 미지원 또는 잠금화면 네트워크 확장 제한으로 `dl_throughput=0` 반환 → 기존 null+unknown_netspeed 로 떨어짐.

## 진단 로그 (MacBook launchctl asuser 재현)

MacBook 에서 `launchctl asuser $(id -u) bash <script>` 로 networkQuality 실행:
```
PATH=...  HOME=/Users/kyu.lee  USER=kyu.lee
dl_throughput=85168256  EXIT=0
```
→ MacBook launchd 에서는 networkQuality 정상 작동 (dl≈85 Mbps).
→ 아이맥 CI 박스만 0/0 반환 — Ethernet 또는 잠금화면 네트워크 확장 제한이 원인.

## curl 폴백 실행 결과 (NQ 비활성 시뮬레이션 --dry-run)

```
dl_mbps=75.8, ul_mbps=None, rpm=None
health=ok, reasons=[]
```
curl `https://speed.cloudflare.com/__down?bytes=10000000` 로 `dl_mbps=75.8 Mbps` 측정 성공.

## 테스트

기존 21 PASS + E-시리즈 6 추가 = **27 PASS, 0 FAIL**

## 아이맥 반영

```bash
ssh KyuLee@100.82.115.70 'git -C ~/projects/curiocity-relay-heartbeat pull --ff-only'
```

plist 재설치 불필요 — health.sh 만 변경. pull 후 다음 launchd tick(5분 이내) 자동 반영.
