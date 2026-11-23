# M1-1123-K 판정: ✅ 완료

커밋: `17da6dd3a`  
push: `main` ← `17da6dd3a` (2026-11-23 20:52 WIB)

---

## A. git 쓰기 제거 — relay 충돌 원인 차단

**grep 결과 (ci-watch.mjs git 쓰기 0건):**
```
$ grep -c "execFileSync|git.*commit|git.*push|gitPush|writeAlerts|detectAndRecord|appendFileSync|ledger|ci-daily|ci-alerts" scripts/ci-watch.mjs
0
```

제거된 함수:
- `gitPush()` (353~366행) — relay git commit/pull --rebase/push
- `detectAndRecordCompleted()` — ledger/ci-history.jsonl 쓰기
- `updateDailyMd()` — ledger/ci-daily.md 쓰기
- `writeAlerts()` — status/ci-alerts.json 쓰기
- `loadHistSeenIds()` — 위 연동 초기화

화면 표시 전용으로 전환. relay 기록은 러너 v7.7의 `status/ci/*.jsonl`·`all.json`만 사용.

---

## B. 실행 화면 캡처 (29줄)

```
 1| ● 정상  11/23/2026 20:51:52 WIB
 2| ─────────────────────────────────────────────────────────────────────────────
 3|   m0  M0-1123-G  23분
 4|   m1  M1-1123-K  7분
 5|   m2  idle
 6|   m3  idle
 7|   r0  R0-1123-L  6분
 8|   heartbeat 0분전  v7.7 pid=52163  git: ahead=0 behind=0
 9| ─────────────────────────────────────────────────────────────────────────────
10|   storeport-heavy  Youngkyus-MacBook-Pro-M1 ●BUSY  storeport:#414 heavy-mac 6분
11|   storeport-light  curiocity-mac-light      ●OK    —
12|   fork-heavy       curiocity-mac-fork       ●BUSY  —
13|   fork-light       curiocity-mac-fork-light ●OK    —
14| ─────────────────────────────────────────────────────────────────────────────
15|   storeport-heavy      0건
16|   fork-heavy           0건
17|   storeport-light      0건
18|   fork-light           0건
19| ─────────────────────────────────────────────────────────────────────────────
20|   cloud 오늘  33/5건  총 79.7분  잔여: 0
21|     playwright  0.0분  ✗
22|     assertions  0.0분  ✗
23|     flow-tests  0.0분  ✗
24| ─────────────────────────────────────────────────────────────────────────────
25|   경보 없음
26| ─────────────────────────────────────────────────────────────────────────────
27|   [dim] blocked: runner-folder change...
28|   [dim] [gh-runner-watchdog] skip restart: data-p...
29|   갱신 30초 | Ctrl+C 종료  --full: 전체 목록
```

**→ 29줄 (≤ 40줄 ✅)**

---

## C. 클라우드 건수 대조 — `status/ci/2026-11-23.jsonl` 기준

| 항목 | 건수 |
|---|---|
| 전체 cloud runner_kind 행 | **93건** |
| 마커 잡 (route·heavy-cloud 등) | **60건** |
| **실제 검사 잡 (마커 제외)** | **33건** |

기존 all.json `today.cloud.jobs=85`는 route·heavy-cloud 마커까지 포함한 잘못된 숫자.  
현재 ci-watch는 `status/ci/2026-11-23.jsonl`을 직접 읽어 마커 제외 후 33건 표시.

---

## 단위 테스트 15개 (all pass)

```
$ node --test scripts/test/ci-watch-k.test.mjs
# tests 15
# pass 15
# fail 0
# duration_ms 102ms
```

테스트 항목:
- **K-1** (3개): 마커 잡 제외 (isMarkerJob · countRealCloud)
- **K-2** (3개): 오래된 큐 제외 (filterFreshUnclaimed · 24h 경계)
- **K-3** (5개): 러너 4대 / fork-light offline / 새 이름 / 잡 연결
- **K-4** (4개): 40줄 이내 렌더 / 필수 섹션 / 경보없음 / allJson null

---

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `scripts/ci-watch.mjs` | git 쓰기 전부 제거 · `readRealCloudData()` 신규 · `filterFreshUnclaimed()` 연동 |
| `scripts/watch/ci-watch-render.mjs` | **신규** — 압축 렌더 모듈 (순수 함수 · 테스트 가능) |
| `scripts/test/ci-watch-k.test.mjs` | **신규** — 단위 테스트 15개 |

---

## Kyu 실행 명령

```bash
node ~/projects/curiocity-relay/scripts/ci-watch.mjs
# 전체 목록 보기:
node ~/projects/curiocity-relay/scripts/ci-watch.mjs --full
```
