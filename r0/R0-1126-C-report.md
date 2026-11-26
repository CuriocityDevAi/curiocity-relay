#41 APPROVE

## 검증 결과

### 1. `--no-default-labels` grep

```
grep -rn "no-default-labels" scripts/
```

- `runner.sh` 실제 호출 (line 79-84): `--no-default-labels` 없음 ✓  
- `runner.sh` dry-run 출력 (line 75): `--no-default-labels` 없음 ✓  
- `setup.sh`: 없음 ✓  
- 나머지 경로: test 주석(line 44 — 케이스 설명용) · queue 파일에만 존재, 기능 코드 미포함 ✓

### 2. `verify_runner_labels` 실패 모드

setup.sh 호출 패턴 (lines 127-134):
```bash
verify_runner_labels ... || _label_all_ok=1
```
`return 1` 이 `||` 로 흡수 → setup 미중단, 경고만 출력.

케이스별:
- gh 미로그인 / 네트워크 실패: `_gh_runner_label_names` 내부 `|| true` → 빈 문자열 반환 → 오프라인 경로(오렌지 경고) → `return 1` → `||` 흡수 ✓  
- 러너 미발견: 동일 경로 ✓  
- 라벨 누락: `missing[]` 배열 → `_gh_runner_id` 조회 후 수동 명령 출력 → `return 1` → `||` 흡수 ✓

수동 복구 명령 형태:
```
gh api repos/<org>/<repo>/actions/runners/<id>/labels -X POST -f "labels[]=<lbl>"
```
Kyu가 쓴 `gh api -X POST .../runners/<id>/labels -f 'labels[]=self-hosted'` 와 일치 (플래그 순서 차이만, gh API 동일 동작) ✓

### 3. PR #39 `_install_launchd` skip 충돌

`_configure_runner` (line 68): `.runner` 파일 존재 시 config.sh 호출 없이 return.  
`_install_launchd` (line 99): `launchctl list "$label"` 성공 시 svc.sh 호출 없이 return.  
두 체크 독립적, 직렬 호출 → 이미 등록·실행 중인 러너에 재실행 시 config.sh · svc.sh 모두 호출되지 않음. PR #39 충돌 없음 ✓

### 4. hostname 변경 시 중복 등록 위험

```bash
SHORT_HOST=$(hostname -s | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g' | cut -c1-16)
```

`imac` → `IMAC-M1` 변경 시 SHORT_HOST: `imac` → `imac-m1`  
러너 디렉토리는 slot 고정(`~/actions-runner-ci-box-sp-heavy` 등) → `.runner` 파일 유지.  
재실행 시 `_configure_runner` 가 `.runner` 파일 감지 → config.sh 미호출 → **GitHub 러너 중복 등록 없음** ✓

부작용(비치명적): `verify_runner_pid` / `verify_runner_labels` 는 새 이름(`ci-box-*-imac-m1`)으로 조회 → 기존 `ci-box-*-imac` 미발견 → 경고 출력. 경고는 `|| _*_all_ok=1` 로 흡수되어 setup 완료. 실제 러너는 구 이름으로 정상 동작. CHANGES 불필요.

### 5. 직접 실행

**단위 테스트** (`bash scripts/test/ci-box-labels.test.sh`):
```
=== verify_runner_labels 단위 테스트 (가짜 gh 응답) ===

PASS: 정상 — self-hosted + curiocity-mac 있음
PASS: 누락 — self-hosted 없음
PASS: 누락 — custom 라벨 없음
PASS: 누락 — self-hosted + custom 모두 없음
PASS: 오프라인 — 러너 미발견 (빈 응답)

=== 결과: PASS=5 FAIL=0 ===
```

**setup.sh dry-run** (발췌):
```
[DRY] storeport heavy runner: ci-box-storeport-heavy-mbp-m1  labels=self-hosted,macOS,ARM64,curiocity-mac
[DRY] storeport light runner: ci-box-storeport-light-mbp-m1  labels=self-hosted,macOS,ARM64,curiocity-mac-light
[DRY] fork heavy runner:      ci-box-fork-heavy-mbp-m1       labels=self-hosted,macOS,ARM64,curiocity-mac-fork
[DRY] fork light runner:      ci-box-fork-light-mbp-m1       labels=self-hosted,macOS,ARM64,curiocity-mac-fork-light
```
`--no-default-labels` 미존재 ✓ · 라벨 `self-hosted,macOS,ARM64,<custom>` 포함 ✓

## 미검증

아이맥 SSH 접속 금지 조건 → 실제 아이맥에서의 라이브 `gh api` 응답 · launchd PID 확인 미수행.
