#45 APPROVE

## 검토 대상
- PR #45 · 브랜치 feat/M2-1126-C-ci-watch-table · 최종 커밋 a689dff90 (M1-1126-K)
- 검토 기준: R0-1126-K CHANGES 항목(PTY-1 미러 복사본) 반영 여부 · 4개 REQ

---

## REQ 1 — PTY-1이 실제 renderDiff를 import해 호출하는지 · 복사본 잔재 없는지

**통과**

```
# scripts/test/ci-watch-machines.test.mjs:28
import { renderDiff, resetRenderPrevLines } from '../ci-watch.mjs';
```

PTY-1(638행) 에서 `renderDiff(renderLayout(...), { write: fakeWrite, termWidth: ... })` 형태로 직접 호출.
`simulateRenderDiff` 문자열 grep 결과 0건 — 복사본 잔재 없음.

---

## REQ 2 — write/termWidth 옵션 추가가 실제 실행 동작을 바꾸지 않는지

**통과**

```js
// ci-watch.mjs:875-878
export function renderDiff(lines, { write, termWidth } = {}) {
  const tw = termWidth ?? detectTerminalWidth();
  const writeFn = write ?? (s => process.stdout.write(s));
```

옵션 미전달 시 `??` 연산자로 기존 기본값(`process.stdout.write` / `detectTerminalWidth()`) 그대로 사용.
실제 실행(기본 process.stdout) 동작 불변.

---

## REQ 3 — \x1b[J 임시 제거 → PTY-1 FAIL 확인 → 원복

**회귀 감지 경로 동작 확인**

① ci-watch.mjs:899 `writeFn('\x1b[J');` 주석처리 후 PTY-1 단독 실행:

```
not ok 1 - PTY-1: 잔상 자기 검증 ② — 실제 renderDiff + 가짜 스트림
  error: 행 21: 최종 렌더(20행) 밖 잔상
         "잔상"
  code: ERR_ASSERTION
# tests 1 · pass 0 · fail 1
```

② 원복 후 PTY-1:

```
# tests 1 · pass 1 · fail 0
```

회귀 감지 경로 정상 작동 확인.

---

## REQ 4 — 전체 테스트 직접 실행

```
node --test scripts/test/ci-watch-*.test.mjs
# tests 175
# pass 175
# fail 0
# duration_ms 20482
```

175/175 전부 통과.

---

## 이전 R0-1126-K 나머지 항목 (통과 판정 유지)

- 주의 위치(맨 아래) · 오늘 처리 열 정렬 · Q-1~Q-4: 테스트 포함 175/175 통과로 재확인.

---

## 결론

4개 REQ 모두 통과. `simulateRenderDiff` 복사본 완전 제거 확인. `\x1b[J` 회귀 감지 경로 직접 재현 성공.
#45 APPROVE.
