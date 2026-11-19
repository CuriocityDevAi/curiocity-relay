relay PR #8 갱신 · partial 커서 min O · Y 회귀 O · 테스트 176/176 · --once 19.5s

# M0-1119-P — relay #8 R0 3차 CHANGES (partial 커서 activeMin clamp)

- 대상: PR #8 `fix/M0-1119-K-ci-deadline` · HEAD `d0ca182ef`
- 지적 리포트: `r0-cloud/R0C-1119-Y-report.md` (§2 새로 찾은 누락 경로)
- 머지 금지 (허브 T0 몫)

## 1. 수정 (REQ1)

파일: `scripts/lib/ci-health.mjs` (†618–637)

```diff
-        if (partial && earliestUnprocessed) {
-          setHistoryCursor(root, r, earliestUnprocessed);
-        } else {
-          const activeMinIso = minActiveByRepo.get(r) || null;
-          const candidates = [];
-          if (latestProcessedRunCreatedAt) candidates.push(latestProcessedRunCreatedAt);
-          if (activeMinIso) candidates.push(activeMinIso);
-          ...
-        }
+        const activeMinIso = minActiveByRepo.get(r) || null;
+        const candidates = [];
+        if (partial && earliestUnprocessed) {
+          candidates.push(earliestUnprocessed);
+        } else if (latestProcessedRunCreatedAt) {
+          candidates.push(latestProcessedRunCreatedAt);
+        }
+        if (activeMinIso) candidates.push(activeMinIso);
+        if (candidates.length > 0) {
+          const chosen = candidates.reduce((a, b) =>
+            new Date(a).getTime() <= new Date(b).getTime() ? a : b);
+          setHistoryCursor(root, r, chosen);
+        }
```

핵심: partial 경로도 비-partial 경로와 동일한 activeMin clamp 로직을 공유. 두 경로가 하나의 min-reduce 로 통합.

- partial + earliestUnprocessed: 후보 = [earliestUnprocessed, activeMin?] → min
- 비-partial: 후보 = [latestProcessedRunCreatedAt, activeMin?] → min
- activeMin 없으면 기존 동작 그대로 (M-2c 등 기존 테스트 영향 없음)

상단에 M0-1119-P 블록 (주석) 추가해 재발 차단 근거 명시.

## 2. 회귀 테스트 (P-1)

파일: `scripts/test/ci-health-k.test.mjs` (†766 이하 추가)

시나리오 = Y 리포 §2 재현:
- long run: id=110001 · in_progress · T-40m 생성
- short run × 12: T-35m~T-24m 생성, 모두 completed
- maxRuns = 10 → tick1 은 processed=10, unprocessed=2 (earliestUnprocessed=T-25m)

tick1 어서션:
- partial=true · jsonl_added=10
- cursor[MAIN_REPO] ≤ long.created_at(T-40m) ← 직전 구현은 T-25m 이 됨

tick2 (long completed · `created>=cursor` 필터 모의):
- jsonl_added=3 = long + 남은 short 2개 (이미 기록한 10개는 seen-set 으로 skip)
- 직전 구현이었다면 long 영구 누락(기록 0)

## 3. 네거티브 확인 (테스트가 버그를 실제로 잡는지)

```
git stash push scripts/lib/ci-health.mjs → node --test ...
✖ P-1: partial + active 겹침 (1.83ms)
ℹ tests 22 · pass 21 · fail 1
```

fix 복원 후 전체 통과.

## 4. 테스트·스모크

```
node --test scripts/test/*.test.mjs
ℹ tests 176 · pass 176 · fail 0 · duration_ms 7115
```

(기존 175 + P-1 1개)

```
time node scripts/lib/ci-health.mjs --once
jsonl_added=11 · partial=true (history split)
real 19.507s
```

background 30s 마감 전 종료. partial=true 는 history 여분 → 다음 tick 에 이어 조회 (의도대로).

## 5. 나머지 Y 리포 항목 처리

- §3 부차 (state 10s 넘겨 뒤쪽 repo state 못 봄 → 비-partial 커서 전진 생략): **스킵.** 메인 루프의 `break` 와 `collectHistoryForRepo` 호출 분기 모두 바꿔야 해서 "1줄 수정" 범위 초과. 다음 티켓 권장.
- §3 nit (clamp kill 된 gh 호출이 partial 이 아닌 error): **스킵.** execFn 래퍼를 try/catch 로 감싸 partial 로 변환해야 함 → 범위 초과.
- §3 참고 (per_page=100 첫 페이지): **스킵.** Y 리포도 범위 밖으로 둠.

## 6. 변경 파일 (허브 승인 의도대로)

- scripts/lib/ci-health.mjs (고정 지점 1곳 + 상단 주석)
- scripts/test/ci-health-k.test.mjs (P-1 1개 + 헤더 커버리지 주석)

러너 본체 / ci-background / hub-runner-v7.5 / status/ 등 Kyu 폴더 무변동. .gitignore 미변경.

## 7. push

```
To https://github.com/CuriocityDevAi/curiocity-relay.git
   a173efe17..d0ca182ef  fix/M0-1119-K-ci-deadline -> fix/M0-1119-K-ci-deadline
```

머지·PR 코멘트·main push 없음 (T0/허브 몫).
