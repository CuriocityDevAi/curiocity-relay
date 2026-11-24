PASS

# M1-1124-J: ci-watch 심링크 배포 fix 리포트

## 근본 원인 확인

`scripts/lib/self-update.mjs` 의 `deployCiWatch()` 함수가 `copyFileSync` 를 사용하여
`~/.hub-runner/bin/ci-watch.mjs` 를 단독 복사본으로 배포했다.

`ci-watch.mjs` 는 아래와 같은 상대 경로 import 를 포함한다:
- `import { getWibDateStr, readJsonlFile } from './lib/ci-history.mjs';`
- `import { readAllLocalRunnerStates } from './lib/local-ci.mjs';`
- `import { computeRunnerAlerts } from './watch/runner-alerts.mjs';`
- `import { isMarkerJob, ... } from './watch/ci-watch-render.mjs';`

복사본(~/.hub-runner/bin/ci-watch.mjs)에서는 lib/ 와 watch/ 가 ~/.hub-runner/bin/ 아래에 없으므로
Node 가 ERR_MODULE_NOT_FOUND 를 던진다. ci-watch.sh 래퍼가 2초 간격으로 재기동 루프를 반복.

동일 증거:
  ls -la ~/.hub-runner/bin/
  -rwxr-xr-x  ci-watch.mjs   # 복사본 38788 bytes
  lrwxr-xr-x  hub-runner.mjs -> .../scripts/hub-runner-v8.1.mjs  # 심링크
hub-runner.mjs 는 심링크인데 ci-watch.mjs 만 복사본이었음.

## 적용한 수정

1. scripts/lib/self-update.mjs — deployCiWatch()
   - 변경 전: copyFileSync(src, dst)
   - 변경 후: ensureSymlink({ linkPath: dst, targetPath: src })

2. scripts/hub-runner-install.sh
   - 변경 전: cp "$CI_WATCH_SRC" "$CI_WATCH_DST"
   - 변경 후: ln -s "$CI_WATCH_SRC" "$CI_WATCH_DST"

3. scripts/hub-runner-v8.1.mjs — --selftest-selfupdate-ciwatch
   - 심링크 검증 로직으로 갱신 (lstatSync.isSymbolicLink + readlinkSync target 확인)

4. scripts/test/ci-watch-deploy.test.mjs (신규)
   - T1–T6 테스트 추가

## 실제 테스트 실행 결과

TAP version 13
ok 1 - T1 deployCiWatch 는 심링크를 생성한다 (파일 복사본 아님)
ok 2 - T2 심링크 target 이 scripts/ci-watch.mjs 절대경로인지
ok 3 - T3 2nd deployCiWatch call → no-op (changed:false)
ok 4 - T4 소스 파일 변경 후 심링크 통해 최신 내용이 보임 (추가 deploy 불필요)
ok 5 - T5 실제 ci-watch.mjs 심링크 배포 후 node --check 통과 (ERR_MODULE_NOT_FOUND 없음)
ok 6 - T6 install.sh ci-watch 배포 라인이 ln -s 를 사용하고 cp 를 사용하지 않음 (정적 검사)
# tests 6 · pass 6 · fail 0

selftest: [selftest-selfupdate-ciwatch] OK · symlink·no-op·소스갱신투명·래퍼 4 분기 정상

node --check via symlink:
  $ ln -s ~/projects/curiocity-relay/scripts/ci-watch.mjs /tmp/test/bin/ci-watch.mjs
  $ node --check /tmp/test/bin/ci-watch.mjs → exit 0 (no ERR_MODULE_NOT_FOUND)

## PR 링크

https://github.com/CuriocityDevAi/curiocity-relay/pull/24

## 머지 후 적용 방식 (Kyu 수동 작업 없음)

머지 후 v8.1 runner 의 self-update tick 이 deployCiWatch 를 호출 →
~/.hub-runner/bin/ci-watch.mjs 를 복사본에서 심링크로 자동 교체.
ci-watch.sh 가 재기동될 때 새 심링크로 실행 → 루프 없이 정상 화면 표시.

## 미검증 항목

- 머지 후 실제 Kyu 터미널에서 ci-watch.sh 가 재기동 루프 없이 화면 표시
  → 미검증 (머지 후 self-update tick 대기 필요, 자동 처리됨)
