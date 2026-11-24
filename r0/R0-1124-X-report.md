FOLLOWUP

# R0-1124-X 사후 리뷰 — PR #24 (ci-watch 복사→심링크)

날짜: 2026-11-24 · 검토 대상: CuriocityDevAi/curiocity-relay PR #24 (머지 완료)

---

## 1. ensureSymlink — 기존 일반 파일 처리 안전성

**판정: 안전 (정상 경로), 에러 처리 갭 존재**

`ensureSymlink` 흐름 (기존 일반 파일이 있을 때):
1. `readlinkSync(linkPath)` → 일반 파일이므로 throw → `current = null`
2. `current === targetPath`? No
3. `existsSync(linkPath)` → `true`
4. `rmSync(linkPath, { force: true })` → 일반 파일 삭제
5. `symlinkSync(targetPath, linkPath)` → 심링크 생성

정상 경로에서는 기존 복사본을 안전하게 제거하고 심링크로 교체한다.

**갭**: `rmSync` catch 블록이 noop이므로 삭제 실패 시 silently 넘어가고, 이후 `symlinkSync`가 EEXIST로 throw한다. `deployCiWatch`는 `ensureSymlink` 호출을 try-catch하지 않으므로 이 오류가 호출자로 전파된다. 러너 자체 업데이트 흐름에서 이 오류가 처리되는지 확인 필요.

롤백 메커니즘 없음 (실패 시 이전 복사본도 없고 심링크도 미생성 상태 가능).

---

## 2. REPO_ROOT 판정 · 자기 파일 변화 감지 — 심링크 실행 적합성

**판정: 기능 정상, 단 CI_WATCH_IS_DEPLOYED 분기가 dead code화됨**

Node.js ESM 기본 동작: 엔트리 포인트가 심링크일 때 `import.meta.url`은 **실제 경로(realpath)** 를 반환한다 (`--preserve-symlinks-main` 없는 기본값).

결과:
- `import.meta.url` = `file:///Users/kyu.lee/projects/curiocity-relay/scripts/ci-watch.mjs`
- `HERE` = `~/projects/curiocity-relay/scripts`
- `CI_WATCH_IS_DEPLOYED` = **false** (← 심링크 배포임에도)
- `REPO_ROOT` = `resolve(HERE, '..')` = `~/projects/curiocity-relay` ✓

기능상 REPO_ROOT는 올바르게 판정된다. 그러나 `CI_WATCH_IS_DEPLOYED = true` 분기 (하드코딩된 경로)는 심링크 배포 이후 도달 불가능한 dead code가 됐다. 이 분기는 복사본 배포 시대에 맞게 설계된 것으로, 심링크 배포와 함께 역할이 소멸됐다.

**자기 파일 변화 감지**:
- `THIS_FILE` = 실제 경로 (`scripts/ci-watch.mjs`)
- `runningCodeHash` = 소스 파일 해시 (기동 시 1회)
- `getDiskFileHash()` = 소스 파일 현재 해시 (동일 경로)
- 소스 변경 → 해시 불일치 → `exit(0)` → 래퍼 재기동 ✓

단, `CI_WATCH_IS_DEPLOYED = false`이면 `exitIfSelfChanged`에서 `if (!CI_WATCH_IS_DEPLOYED) return` 로 **자동 재기동이 차단된다**. 코드 확인:

```js
function exitIfSelfChanged(tag = 'tick') {
  if (!runningCodeHash) return;
  const now = getDiskFileHash();
  if (!now || now === runningCodeHash) return;
  if (!CI_WATCH_IS_DEPLOYED) return;   // ← 심링크 배포 시 항상 return!
  ...
  process.exit(0);
}
```

**CI_WATCH_IS_DEPLOYED가 항상 false이므로 심링크 배포 시 자동 재기동이 동작하지 않는다.** ci-watch.sh 래퍼는 종료 후에만 재기동하는데, 파일 변화를 감지해도 exit(0)를 하지 않으면 래퍼도 재기동하지 않는다. 소스 갱신이 반영되지 않는 버그.

---

## 3. T5 테스트 — node --check import 해석 검증 여부

**판정: 검증 불충분 · 테스트 설명이 오해의 소지**

`node --check`는 **구문(syntax)만 검사**하고 import 문을 실제로 resolve/실행하지 않는다. 따라서 T5는:
- ci-watch.mjs 파일 자체의 문법 오류 여부만 확인
- `./lib/ci-history.mjs`, `./lib/local-ci.mjs`, `./watch/runner-alerts.mjs` 등 상대 경로 import의 존재 여부는 검증하지 않음
- 테스트 이름 "ERR_MODULE_NOT_FOUND 없음"은 사실상 거짓 주장

원래 버그(복사본에서 ERR_MODULE_NOT_FOUND 발생)를 T5로는 재현도, 해소 확인도 할 수 없다.

**실제 import 해석 검증 방법**:
```js
// 옵션 A: 짧은 timeout으로 실제 실행 — import 로드 단계에서 실패하면 즉시 종료
const res = spawnSync(process.execPath, [deployedPath], {
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 3_000,
  env: { ...process.env, CI_WATCH_NO_TERM: '1' },   // 화면 출력 억제 플래그 추가 필요
});
// ERR_MODULE_NOT_FOUND 는 import 로드 단계에서 발생 → timeout 전에 status != 0
assert.ok(
  res.status === 0 || res.signal === 'SIGTERM',  // 정상 로드 후 timeout kill 은 OK
  `ERR_MODULE_NOT_FOUND 의심 · status=${res.status}`
);

// 옵션 B: 개별 lib 파일 node --check (import 해석 아니지만 lib 존재 확인)
for (const lib of ['./lib/ci-history.mjs', './lib/local-ci.mjs', './watch/runner-alerts.mjs']) {
  const libPath = join(REPO_ROOT, 'scripts', lib);
  assert.ok(existsSync(libPath), `lib 파일 없음: ${libPath}`);
}
```

---

## 4. 수정 필요 목록

| # | 위치 | 문제 | 심각도 |
|---|------|------|--------|
| **F1** | `ci-watch.mjs` `exitIfSelfChanged()` | `CI_WATCH_IS_DEPLOYED` dead code화로 심링크 배포 시 파일 변화 감지 후 자동 재기동 불가 | **중** (기능 회귀) |
| F2 | `scripts/test/ci-watch-deploy.test.mjs` T5 | `node --check`는 import를 resolve하지 않으므로 ERR_MODULE_NOT_FOUND 검증 불가 — 실제 실행 테스트로 교체 필요 | 중 (오해 소지) |
| F3 | `ci-watch.mjs` `CI_WATCH_IS_DEPLOYED` 분기 | 심링크 배포 이후 dead code — ci-watch 다음 버전 업에서 정리 필요 | 경미 |
| F4 | `scripts/lib/self-update.mjs` `ensureSymlink` | `rmSync` 실패를 noop 처리 → `symlinkSync` EEXIST 가능성, `deployCiWatch`에 에러 처리 없음 | 경미 |

**F1이 가장 중요**: 심링크 배포 후 자동 재기동이 동작하지 않으면 ci-watch 소스 갱신 시 Kyu가 수동 재기동해야 한다. 이는 PR 체크리스트 "머지 후 10분 내 ci-watch.sh 가 재기동 루프 없이 화면 표시" 를 통과하더라도 이후 셀프업데이트 시 드러날 버그.

---

## 종합

PR의 핵심 수정(copy → symlink로 ERR_MODULE_NOT_FOUND 해소)은 올바른 방향이다. 단, 심링크 배포 시 `CI_WATCH_IS_DEPLOYED`가 항상 `false`가 되면서 자동 재기동 로직이 무력화된 점(F1)은 후속 수정이 필요하다.
