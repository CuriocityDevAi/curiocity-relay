#32 CHANGES · #33 APPROVE

## PR #32 (M2-1125-H) — ci-watch EAW 폭 계산

### 테스트
`node --test scripts/test/ci-watch-v2.test.mjs` → **33/33 PASS**

```
# tests 33
# pass 33
# fail 0
# duration_ms 130.784208
```

### 검증 표

| 항목 | 결과 |
|---|---|
| render-v2.mjs `.padEnd`/`.slice` 미사용 | ✅ 전부 `padEndWidth`/`truncateWidth` 경유 |
| hr 줄 폭 80/100/140 | ✅ 각각 정확 |
| 한글·CJK·●■▲ 2칸 | ✅ |
| ANSI 코드 0칸 | ✅ stripAnsi 경유 |
| FE0F 변형선택자 (경계 케이스) | ❌ 버그 — 1 반환 (expected 0) |
| ZWJ U+200D (경계 케이스) | ❌ 버그 — 1 반환 (expected 0) |
| 결합문자 U+0300-036F (경계 케이스) | ❌ 버그 — 1 반환 (expected 0) |
| 피부 색 수식어 U+1F3FB-1F3FF (경계 케이스) | ❌ 버그 — 2 반환 (expected 0) |

### 발견된 버그 (직접 실행 결과)

```
displayWidth('☎️')       → 3   (expected 2)   # U+260E(2) + U+FE0F(1)
displayWidth('è')         → 2   (expected 1)   # U+0065(1) + U+0300(1)
displayWidth('‍')    → 1   (expected 0)   # ZWJ
displayWidth('\u{1F3FB}') → 2   (expected 0)   # 피부 색 수식어
```

U+FE0F(=65039) 가 `cp < 0xFE10(=65040)` 패스스루로 1을 반환하는 off-by-one.
ZWJ·결합문자는 `cp < 0x1100` fast-path 에서 1 반환.

### 판정: REQUEST_CHANGES (자기 PR 제한 → COMMENT 게시)

---

## PR #33 (M1-1125-G) — watchdog fork 러너 + sleep 복귀

### 테스트
`node --test scripts/test/hub-runner-gh-watchdog.test.mjs` → **25/25 PASS**

```
# tests 25
# pass 25
# fail 0
# duration_ms 112.94225
```

`node scripts/hub-runner-v8.3.mjs --selftest-watchdog-fork-wake` → **PASS · 4 checks**

### 검증 표

| 항목 | 결과 |
|---|---|
| fork 러너 POOL_MAP 제외 (storeport 풀 오용 없음) | ✅ `POOL_MAP` = mac-heavy/light 만, fork → `no-pool` 반환 |
| kickstart 시 Runner.Worker alive → skip | ✅ sleep-wake·partial-but-safe 양쪽 모두 `hasRunningWorker` 체크 |
| kickstart 후 쿨다운 등록 → 중복 재시작 방지 | ✅ `state.lastRestartAt[kind] = now` → stuck 경로 차단 |
| fetchRunnerStatusesFn 미주입 partial → 기존 skip-all | ✅ `else` 분기 전체 skip 유지 |
| selftest preflight 배열 등록 | ✅ line 205, 실패 시 self-update 롤백 |
| GH API 같은 repo 1회 캐싱 | ✅ `_repoCache` Map |
| T14 기존 동작 유지 | ✅ |

### 판정: APPROVE (자기 PR 제한 → COMMENT 게시)

---

## 비고
두 PR 모두 GitHub "자기 PR APPROVE/REQUEST_CHANGES 불가" 제한으로 인해 동등한 내용을 COMMENT로 게시함.
