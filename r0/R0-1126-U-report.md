#49 CHANGES

리뷰어: R0-1126-U · 2026-11-26

---

## 판정 근거

### REQ1 · appendMemLog 충돌 마커 정리 로직

**정상 파일 줄 손실·순서 변경**: `hasMarkers` 분기는 충돌 마커가 있을 때만 진입.
마커가 없으면 `existing = raw` 그대로 유지되므로 정상 파일 줄 손실·순서 변경 없음. ✓

**동시 쓰기 위험**: 원본 코드도 전체 read → 전체 write 패턴이었고 PR 이 이를 바꾸지 않는다.
cleanup 경로는 조건부 추가에 불과하며 `writeFileSync` 한 번으로 원자 기록. 새로운 동시 쓰기 위험 없음. ✓

**self-update 경로 안전성**: `maybeSelfUpdate`(hub-runner-v8.3.mjs:3686)에
`if (busy.size > 0 || claimQueue.length > 0 || processingClaim)` idle 가드 존재.
러너 본체 교체는 idle 때만 수행됨. appendMemLog 변경이 self-update 경로에 영향을 주지 않음. ✓

---

### REQ2 · mem-log.ndjson 충돌 정리

충돌 전: `<<<<<<< Updated upstream` ... `=======` ... `>>>>>>> Stashed changes`
- Updated upstream 쪽: 2026-11-19 12:51 ~ 16:36 줄 6개
- Stashed changes 쪽: 2026-11-19 10:51:02 줄 1개

수정 후: 10:51:02 줄이 12:51 앞에 삽입 → 양쪽 보존·시각순. ✓

---

### REQ3 · ci-offload-impact.mjs — **CHANGES 필요 사항**

#### ❌ W2 규칙 복사 (import 아님)

`ci-offload-impact.mjs`는 `isMarkerJob` / `isCountableJob` / `MARKER_JOBS`를
`scripts/watch/ci-watch-render.mjs`에서 import 하지 않고 **로컬에 복사**해 정의함.

```js
// ci-offload-impact.mjs (복사본)
const MARKER_JOBS = new Set(['route', 'heavy-cloud', 'ci-summary', 'feature-map-route',
  'changes-filter', 'markers-and-forbidden']);   // ← 추가 2개

// ci-watch-render.mjs (W2 원본)
export const MARKER_JOBS = new Set(['route', 'heavy-cloud', 'ci-summary', 'feature-map-route']);
```

W2 원본에 없는 `'changes-filter'`, `'markers-and-forbidden'` 가 복사본에만 존재.
`ci-watch-render.mjs` 에서 `export` 되므로 import 가능하다.
복사본을 유지하면 W2 원본이 바뀌어도 ci-offload-impact 집계에 반영되지 않아 수치가 달라짐.

**요청**: `isMarkerJob` / `isCountableJob` 를 `ci-watch-render.mjs`에서 import 하고,
추가된 두 잡(`changes-filter`, `markers-and-forbidden`)이 실제 W2 규칙인지 확인 후
필요하면 원본에 추가하고 함께 export.

#### ✓ 전/후 구간 분리

`collectCiJobs`, `collectMemLog`, `collectPipeline` 모두 `fromMs`/`toMs` 경계로
올바르게 분리. ✓

#### ✓ 표본 부족 경고

`afterDurationMs < 2 * 60 * 60 * 1000` 조건으로 2시간 미만 시 경고 출력. ✓

#### ✓ 직접 실행 결과

```
$ node scripts/metrics/ci-offload-impact.mjs --cutover 2026-11-26T08:01:00Z

## CI 아이맥 오프로드 임팩트 비교

- 전 구간: 2026-11-26T07:33:39.704Z → 2026-11-26T08:01:00.000Z (0.46h)
- 후 구간: 2026-11-26T08:01:00.000Z → 2026-11-26T08:28:20.296Z (0.46h)

> ⚠️  **표본 부족 — 판단 보류** (후 구간 27분 < 2시간 · 수치는 참고용)

### 맥북 자원 (mem-log)
| 항목   | 전(맥북 CI 포함)  | 후(iMac 전용) |
| used_gb | avg 15.27GB / max 15.27GB (n=1) | N/A |
| swap_used_gb | avg 3.95GB / max 3.95GB (n=1) | N/A |
| compressed_gb | avg 3.19GB / max 3.19GB (n=1) | N/A |

### CI (W2 · 전 16잡 / 후 8잡)
| 대기시간 평균 | 0.2min | 0.8min |
| 대기시간 p90  | 1.0min | 3.0min |
| 잡 실행시간 평균 | 2.4min | 1.2min |
| MBP 처리 수  | 7 | 0 |
| iMac 처리 수 | 8 | 7 |
| cloud overflow 수 | 1 | 1 |

### 프롬프트 (전 4건 / 후 1건)
| started→done 평균 | 8.1min | 11.7min |
| started→done 중앙값 | 8.5min | 11.7min |
| PT/h | 8.78 | 2.19 |
```

---

### REQ4 · 테스트 실행

**신규 테스트 (OI-1~5, 20건)**
```
$ node --test scripts/test/ci-offload-impact.test.mjs
# tests 20 / pass 20 / fail 0
```

**기존 relay 테스트**
```
$ node --test scripts/test/hub-runner-mem.test.mjs scripts/test/ci-watch-v2.test.mjs
  scripts/test/ci-watch-w.test.mjs scripts/test/ci-watch-s.test.mjs scripts/test/ci-watch-t.test.mjs
# tests 105 / pass 105 / fail 0

$ node --test scripts/test/hub-runner-version.test.mjs scripts/test/hub-runner-queue-update.test.mjs
  scripts/test/hub-runner-pipeline-log.test.mjs scripts/test/hub-runner-stuck.test.mjs
  scripts/test/hub-runner-recovery.test.mjs
# tests 27 / pass 27 / fail 0

$ node --test scripts/test/runner-alerts.test.mjs scripts/test/ci-watch-deploy.test.mjs
  scripts/test/ci-watch-machines.test.mjs
# tests 56 / pass 56 / fail 0
```

전체 188건 all PASS. 기존 테스트 회귀 없음. ✓

---

## 요약

| 항목 | 결과 |
|---|---|
| appendMemLog 정상 파일 줄 손실 | 없음 ✓ |
| appendMemLog 동시 쓰기 위험 | 신규 없음 ✓ |
| self-update idle 가드 | 존재 ✓ |
| mem-log 양쪽 보존·시각순 | ✓ |
| ci-offload 전/후 분리 | ✓ |
| W2 규칙 import vs 복사 | **복사 + MARKER_JOBS 불일치 ❌** |
| 표본 부족 경고 | ✓ |
| 테스트 20건 | 20/20 PASS ✓ |
| 기존 relay 테스트 | 188/188 PASS ✓ |

**CHANGES 이유**: `isMarkerJob`/`MARKER_JOBS`가 `ci-watch-render.mjs` import 없이 복사되어 있으며,
복사본에만 `changes-filter`·`markers-and-forbidden` 2개가 추가돼 W2 원본과 불일치.
ci-watch-render.mjs 에서 import 하거나, 추가 잡을 W2 원본에 반영 후 export 로 통일 요청.
