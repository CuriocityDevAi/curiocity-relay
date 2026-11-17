v7.4 · 감지 테스트 통과 · 설치 명령 2줄

# M1-1117-K — hub-runner-v7.4 Kyu 폴더 침범 감지

## 커밋

`4853bddb` — feat(runner): M1-1117-K — hub-runner-v7.4 Kyu 폴더 침범 감지

## 구현 내용

- `scripts/hub-runner-v7.4.mjs` (v7.3 복사 후 수정)
- 감시 목록: `~/projects/agilo-fork-test` · `~/projects/kyu-display` · `~/projects/storeport-kyu` (runner-config.json `kyu_watch_dirs` 로 덮어쓰기 가능)
- 지문 = `git status --porcelain` SHA1 해시(12자) + `HEAD` + `node_modules` mtime + `package-lock.json` mtime (stat 만, 쓰기 없음)
- 허브 `spawnClaudeForItem` 직전/직후 `captureKyuFingerprint` → `compareKyuFingerprints`
- 변화 감지 시 → `lastKyuIntrusion = { hub, prompt_id, folder, changed, at }` 저장 + 로그 1줄
- `writeHeartbeat` 가 `kyu_folder_intrusion` 를 `status/runners/all.json` 에 포함
- `--selftest-kyu-intrusion`: 임시 git 폴더에서 파일 추가 → git-status 변화 감지 · 무변화 false 확인

## 테스트 결과

```
[selftest-kyu-intrusion] OK · 변화 감지=git-status · 무변화=false
[selftest-folder-guard] OK · (v7.3 회귀 없음)
[selftest-recovery-empty-pane] OK · (v7.3 회귀 없음)
[selftest-stale-lock] OK · (v7.3 회귀 없음)
[selftest-state-dirty] OK · (v7.3 회귀 없음)
```

## 설치 명령 (Kyu용 2줄)

```bash
cp ~/projects/curiocity-relay/scripts/hub-runner-v7.4.mjs ~/projects/curiocity-relay/scripts/hub-runner-v7.4.mjs
launchctl unload ~/Library/LaunchAgents/com.curiocity.hub-runner.plist && sed -i '' 's/hub-runner-v7\.3/hub-runner-v7.4/g' ~/Library/LaunchAgents/com.curiocity.hub-runner.plist && launchctl load ~/Library/LaunchAgents/com.curiocity.hub-runner.plist
```
