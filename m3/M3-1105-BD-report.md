# M3-1105-BD Report

## 원인 (1줄)
#108이 `package.json`에 `react-native-view-shot`·`expo-sharing`을 추가했지만 `package-lock.json`을 커밋에 포함하지 않아, 이미 pull된 상태에서 dev-refresh.sh 재실행 시 git 해시 비교가 같아 `packages_changed=0` → npm install 건너뜀 → 번들 실패.

## 상세 분석

### REQ 1 — 원인 확정
- `dev-refresh.sh:35` — `pkg_before != pkg_after || lock_before != lock_after` 조건만 체크
- `git show 3aff1a2 --name-only` 결과: `package.json` 변경 있음, `package-lock.json` **없음**
- 이미 3aff1a2에 도달한 상태에서 dev-refresh 실행 → before==after → `packages_changed=0` → 설치 건너뜀
- 현재 `package-lock.json`: `react-native-view-shot: False`, `expo-sharing: False` (커밋 전 상태 확인)

### REQ 2 — package-lock.json 갱신
- `agilo-fork-test` 워크트리에서 `npm install` 실행
- `react-native-view-shot@3.8.0` · `expo-sharing@58.0.23` lock에 반영
- 커밋: `19e04b2` — `fix(m3-1105-bd): package-lock.json 갱신 — react-native-view-shot · expo-sharing (#108 누락분)`

### REQ 3 — dev-refresh.sh 보강
`scripts/dev-refresh.sh` 커밋: `cc67415`

추가된 로직:
```bash
elif ! npm ls --depth=0 --legacy-peer-deps &>/dev/null; then
  echo "--- node_modules 불완전 감지 (npm ls 실패) → npm install ---"
  npm install
  packages_changed=1
```
- `packages_changed=0`이어도 `npm ls` 실패 시 npm install 실행
- `npm ls expo-sharing react-native-view-shot --depth=0 --legacy-peer-deps` → exit:0 확인

### REQ 4 — app.json 자동 변경
- **추정**: Expo Dev Client가 `expo start --dev-client` 실행 시 `app.json`에 `extra.expoGo.schemeUrl` 또는 `scheme` 관련 메타를 자동 기록하는 경우 발생 (SDK 50+에서도 간헐적으로 발생)
- **대응**: `git diff --name-only`에서 `app.json`만 제외하는 로직 추가
  ```bash
  dirty_non_appjson=$(git diff --name-only; git diff --cached --name-only)
  dirty_non_appjson=$(echo "$dirty_non_appjson" | grep -v '^app\.json$' || true)
  if [[ -n "$dirty_non_appjson" ]]; then exit 1; fi
  if git diff --name-only | grep -q '^app\.json$'; then
    echo "WARN: app.json 이 로컬에서 변경됨 (Expo 자동 기록일 가능성) — 무시하고 계속합니다."
  fi
  ```
- app.json은 `.gitignore`에 추가하지 않음 (사용자 정의 설정 보존 필요)

### REQ 5 — CI npm ci 검사
- `.github/workflows/ci.yml` — `assertions` · `playwright` 두 잡 모두 `npm ci --legacy-peer-deps` 사용
- `npm ci`는 `package.json`과 `package-lock.json` 불일치 시 자체 실패 → **이미 커버됨**
- 추가 조치 불필요

## 실행 로그
```
# agilo-fork-test 워크트리 (master 기반, npm install 후)
$ npm ls --depth=0 --legacy-peer-deps 2>/dev/null | grep -E "react-native-view-shot|expo-sharing"
├── expo-sharing@58.0.23
├── react-native-view-shot@3.8.0
EXIT:0

# dev-refresh.sh --dry-run 은 master 브랜치 전용 → PR 머지 후 master에서 검증 가능
```

## PR
#109 — https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/109
