PASS https://github.com/CuriocityDevAi/storeport/pull/453
원인: get-port v5.1.1 (bootstrapApp) 이 port 0 소켓 닫은 직후 Express 바인드 전 TOCTOU 창에서 두 번째 러너가 같은 포트를 "사용 가능"으로 획득 → listen EADDRINUSE :::PORT (HTTP 서버 포트 충돌; DB 이름은 ULID로 이미 고유 분리됨).

---

## 원인 분석

`@medusajs/test-utils` v2.17.2 의 `bootstrapApp` (bootstrap-app.js):

```javascript
const PORT = process.env.PORT ? parseInt(process.env.PORT) : await get_port_1.default();
```

`get-port` v5.1.1 동작:
1. `net.createServer().listen(0)` → OS 가 임시 포트 P 할당
2. `server.address().port` → P 기록
3. `server.close()` → 소켓 닫힘
4. P 반환

단일 프로세스 내에서는 `lockedPorts` Set 으로 중복 방지하지만, **다른 프로세스** 사이에는 공유가 없음. 같은 Mac에 두 runner 가 동시에 `get-port()` 를 호출하면 3→4 사이 창에서 둘 다 P 를 "사용 가능" 으로 획득 → 두 번째 프로세스가 `app.listen(P)` 시 `EADDRINUSE`.

DB 이름은 `medusa-<ULID>-integration-1` 으로 각 실행마다 고유 → DB 충돌 없음.

## 수정 내용

**파일**: `apps/commerce-core/scripts/test-integration-pos.sh`

```bash
# M2-1126-E · Runner-unique Medusa HTTP port.
if [ -z "${PORT:-}" ]; then
  _seed="${RUNNER_NAME:-$(hostname)}"
  _cksum=$(printf '%s' "$_seed" | cksum | cut -d' ' -f1)
  PORT=$(( (_cksum % 5000) + 20000 ))
  export PORT
  echo "[test:integration:pos] Medusa HTTP port pinned to ${PORT} (runner: ${_seed})"
fi
```

- `RUNNER_NAME` (GitHub Actions 자동 설정) 의 `cksum` 해시로 PORT 20000–24999 범위에서 결정론적 값 선택
- 같은 Mac 에 다른 이름의 러너가 동시 실행돼도 PORT 가 다름
- 같은 러너 내 spec 들은 직렬 실행 (`afterAll` cleanup 완료 후 다음 jest 시작) → 포트 재사용 문제 없음
- 충돌 확률: 2개 러너 기준 ≈ 1/5000

## 자기 검증 로그

### BEFORE (수정 전) — 같은 PORT=20001 동시 2개

```
$ PORT=20001 ... npx jest .../checkout-handover-smoke.spec ... &
$ PORT=20001 ... npx jest .../checkout-handover-smoke.spec ... &
$ wait

=== BEFORE: same PORT=20001 ===
Run 1 exit: 0
Run 2 exit: 1
--- EADDRINUSE in logs: ---
{"level":"error","message":"Error starting server:: listen EADDRINUSE: address already in use :::20001",...}
{"level":"error","message":"Error in startApp:: listen EADDRINUSE: address already in use :::20001",...}
{"level":"error","message":"Error starting the app: listen EADDRINUSE: address already in use :::20001",...}
    listen EADDRINUSE: address already in use :::20001
    listen EADDRINUSE: address already in use :::20001
```

Run 1 exit 0, Run 2 exit 1 → EADDRINUSE 재현 확인.

### AFTER (수정 후) — 다른 PORT 동시 2개

**checkout-handover-smoke** (PORT=20001 / PORT=20002):
```
=== AFTER: PORT=20001 and PORT=20002 ===
Run 1 exit: 0
Run 2 exit: 0
PASS integration-tests/pos/checkout-handover-smoke.spec.ts (12.081 s)
PASS integration-tests/pos/checkout-handover-smoke.spec.ts (12.009 s)
```

**refund-qris-tender** (PORT=20003 / PORT=20004):
```
=== AFTER: refund-qris-tender PORT=20003 and PORT=20004 ===
Run 1 exit: 0
Run 2 exit: 0
PASS integration-tests/pos/refund-qris-tender.spec.ts (14.135 s)
PASS integration-tests/pos/refund-qris-tender.spec.ts (14.053 s)
```

### 단위 테스트 (pre-push hook)
- commerce-core: 860 passed, 0 failed
- packages/event-contracts: 21 passed
- packages/receipt-view-model: 4 passed
- apps/customer-display: 313 passed
