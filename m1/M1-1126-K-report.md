PASS a689dff90

## 작업 내역

**브랜치**: `feat/M2-1126-C-ci-watch-table`  
**커밋**: `a689dff90`

### 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `scripts/ci-watch.mjs` | `renderDiff`에 `{ write, termWidth }` 옵션 추가 (기본값 `process.stdout` · 동작 불변) · `resetRenderPrevLines()` export · 버전 1.8→1.9 |
| `scripts/test/ci-watch-machines.test.mjs` | `simulateRenderDiff` 삭제 → 실제 `renderDiff` + `fakeWrite` 스트림으로 PTY-1 재작성 · 외부 쓰기 시뮬레이션으로 `\x1b[J` 회귀 감지 경로 추가 |

---

## REQ 4: \x1b[J 제거 시 PTY-1 FAIL 로그

```
# Subtest: PTY-1: 잔상 자기 검증 ② — 실제 renderDiff + 가짜 스트림
not ok 49 - PTY-1: 잔상 자기 검증 ② — 실제 renderDiff + 가짜 스트림
  ---
  duration_ms: 3.484083
  type: 'test'
  location: '/Users/kyu.lee/projects/curiocity-relay-wts/M2-1126-C/scripts/test/ci-watch-machines.test.mjs:638:1'
  failureType: 'testCodeFailure'
  error: |-
    행 21: 최종 렌더(20행) 밖 잔상
    "잔상"
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
```

**감지 메커니즘**: `\x1b[J` 없으면 외부 쓰기(countdownTimer 잔상 시뮬레이션)가 row 21에 남아 `row < 20` 어설션 실패.

---

## 최종 PASS 로그

```
# [PTY-1] write=71 총 프레임=5 (120→90(SIGWINCH)→90→120(SIGWINCH)→120) 최종행=20/20 최대폭=120
ok 49 - PTY-1: 잔상 자기 검증 ② — 실제 renderDiff + 가짜 스트림
# tests 49
# pass 49
# fail 0
```

전체 suite (`.mjs`):
```
# tests 384
# pass 384
# fail 0
```
