PASS
`ln -sf ~/projects/curiocity-relay/scripts/ci-watch-v2.mjs ~/.hub-runner/bin/ci-watch-v2.mjs && node ~/.hub-runner/bin/ci-watch-v2.mjs`

## 작업 요약

- **브랜치**: `feat/M1-1124-P-ci-watch-v2` (PR #28)
- **worktree**: `~/projects/curiocity-relay-wts/M2-1125-A`
- **push SHA**: `df0a40e7e`

## 충돌 해소

`scripts/hub-runner-install.sh` → 자동 병합 성공 (충돌 없음)
- main: `TARGET=hub-runner-v8.2.mjs` · `FALLBACK=hub-runner-v8.1.mjs` · ci-watch 심링크·래퍼 유지 ✓
- PR: `--v2` 분기·ci-watch-v2 심링크 추가 살림 ✓

`status/` 충돌 파일 6개 (자동생성 파일) → main 버전 채택
- `status/ci/2026-11-24.jsonl`
- `status/claims/M1-1124-P.json`, `M2-1124-S.json`, `R0-1124-AI.json`
- `status/hubs.json`
- `status/runners/all.json`

## 검증 결과

| 검사 | 결과 |
|------|------|
| `bash -n scripts/hub-runner-install.sh` | PASS |
| `node --test scripts/test/ci-watch-v2.test.mjs` | 27/27 PASS |
| `node --test scripts/test/hub-runner-install.test.mjs` | 4/4 PASS |

## 러너 install.sh 직접 실행 여부

`hub-runner-v8.2.mjs` 내부에서 `install.sh`를 `exec/spawn/execSync` 하는 코드 없음.
install.sh 참조는 테스트 코드 내 `writeFileSync` (임시 git repo 셋업) 뿐.
→ **머지 후 러너 재설치 불필요** 확인.

## 현재 배포 상태 (머지 전 기준)

- `~/.hub-runner/bin/ci-watch.mjs` → 심링크 존재 (v1)
- `~/.hub-runner/bin/ci-watch.sh` → 존재하나 `--v2` 미지원 (M1-1124-K 버전)
- `~/.hub-runner/bin/ci-watch-v2.mjs` → **미존재** (install.sh 미실행이므로)

## Kyu 아침 실행 명령 (러너 재설치 없이 v2 띄우기)

```bash
ln -sf ~/projects/curiocity-relay/scripts/ci-watch-v2.mjs ~/.hub-runner/bin/ci-watch-v2.mjs && node ~/.hub-runner/bin/ci-watch-v2.mjs
```

- `-sf`: 심링크가 이미 있어도 안전하게 덮어씀
- 러너 launchd 프로세스 무영향
- `ci-watch.sh --v2` 대신 직접 `node`로 기동하므로 ci-watch.sh 갱신 불필요
