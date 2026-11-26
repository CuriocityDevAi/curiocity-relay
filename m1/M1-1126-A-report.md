# M1-1126-A Report

판정: **수정 완료**  
PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/40  
원인: 심링크 배포 시 `import.meta.url`(resolve 완료) ≠ `pathToFileURL(argv[1])`(심링크 경로) → main 블록 미진입 → 즉시 `exit(0)` → 래퍼 무한 재기동.

---

## 원인 상세

### ① 주원인: main 블록 가드 실패

```js
// 수정 전 (버그)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
// → 심링크 실행 시: import.meta.url = file:///scripts/ci-watch.mjs
//                   pathToFileURL(argv[1]) = file:///.hub-runner/bin/ci-watch.mjs
//                   불일치 → main 블록 미진입 → exit(0)

// 수정 후
const _argv1Real = realpathSync(process.argv[1]);  // 심링크 → 실제 경로 resolve
if (_argv1 && (
  import.meta.url === pathToFileURL(_argv1).href ||
  import.meta.url === pathToFileURL(_argv1Real).href  // ← 추가
)) {
```

화면이 한 번도 뜨지 않고 (`[ci-watch:boot]` 미출력) 즉시 exit(0) 반복된 것이 이 원인과 일치.  
`[ci-watch:self-update]` stderr 가 없었던 이유도 동일 — main 블록 자체가 실행 안 됐기 때문.

### ② 보조: 래퍼 exit(0) 카운터 누락

기존 래퍼에서 `exit(0)` 는 crash 카운터에서 제외돼 무한 루프 중단 불가.  
→ exit(0) 도 동일 60초/5회 카운터에 포함, 초과 시 `"자가 업데이트 재기동이 60초에 5회 넘음 · 중단 — <마지막 stderr 3줄>"` 출력.

---

## 수정 파일

| 파일 | 주요 변경 |
|---|---|
| `scripts/ci-watch.mjs` | argv[1] realpath 비교 추가 · `THIS_FILE_REAL` 해시 통일 · v1.4→1.5 |
| `scripts/lib/self-update.mjs` | WRAPPER_BODY — exit(0) crash 카운터 포함 · stderr tee 캡처 |
| `scripts/test/ci-watch-restart-loop.test.mjs` | S1/S2/S3 어설션 (신규) |
| `docs/ci-watch.md` | v1.5 반영 |

---

## 자기 검증 결과

`node --test scripts/test/ci-watch-restart-loop.test.mjs`:

| 케이스 | 내용 | 결과 |
|---|---|---|
| S1 | exit(0) 5회 → 래퍼 exit(1) + 중단 메시지 | ✅ pass |
| S2 | 심링크에서 `--once` → `[ci-watch:once]` | ✅ pass |
| S3 | 심링크에서 실행 → `[ci-watch:boot]` (main 블록 진입 확인) | ✅ pass |

기존 T1-T6, K-1a~K-4d (21건) 전부 통과.

---

## 래퍼 갱신 여부

**재설치 불필요.** 러너의 `deployCiWatchWrapper()` 가 매 tick `WRAPPER_BODY` 변경을 감지해 `ci-watch.sh` 를 자동 덮어씀. PR 머지 후 러너의 다음 self-update tick 완료를 기다린 뒤 `ci-watch.sh` 재기동.  
(현재 무한 루프 중이면 먼저 `ci-watch.sh stop` 으로 종료 후, 러너 배포 완료 뒤 재기동.)

---

## 이연 순증감

이연 없음.
