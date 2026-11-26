# M3-1126-A 리포트

판정: **완료** ✓  
PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/41  
원인: `scripts/ci-box/lib/runner.sh` 의 `_configure_runner` 에 `--no-default-labels` 플래그가 있어 아이맥 러너 4개에 `self-hosted`·`macOS`·`ARM64` 기본 라벨이 없었음 → `runs-on: [self-hosted, curiocity-mac*]` 불일치로 CI 잡 0건 처리.

## 변경 요약

| 파일 | 변경 |
|------|------|
| `scripts/ci-box/lib/runner.sh` | `--no-default-labels` 제거 (dry-run 출력 + 실제 호출 모두) |
| `scripts/ci-box/lib/runner.sh` | `_gh_runner_label_names`, `_gh_runner_id` (stub-able wrapper) 추가 |
| `scripts/ci-box/lib/runner.sh` | `verify_runner_labels` 추가 — `gh api --jq` 로 등록 후 라벨 확인, 누락 시 빨간 경고 + 수동 추가 명령 |
| `scripts/ci-box/setup.sh` | dry-run 요약 라벨 표기 `self-hosted,macOS,ARM64,<custom>` 으로 수정 |
| `scripts/ci-box/setup.sh` | PID 검증 뒤 "러너 라벨 검증 (GitHub API)" 섹션 추가 |
| `scripts/test/ci-box-labels.test.sh` | 신규 — 단위 테스트 5케이스 |

## 자기 검증

### dry-run 출력 (주요 발췌)

```
[DRY] storeport heavy runner: ci-box-storeport-heavy-mbp-m1  labels=self-hosted,macOS,ARM64,curiocity-mac
[DRY] storeport light runner: ci-box-storeport-light-mbp-m1  labels=self-hosted,macOS,ARM64,curiocity-mac-light
[DRY] fork heavy runner:      ci-box-fork-heavy-mbp-m1       labels=self-hosted,macOS,ARM64,curiocity-mac-fork
[DRY] fork light runner:      ci-box-fork-light-mbp-m1       labels=self-hosted,macOS,ARM64,curiocity-mac-fork-light
...
[DRY]   gh api repos/CuriocityDevAi/storeport/actions/runners # verify ci-box-storeport-heavy-mbp-m1: self-hosted + curiocity-mac
[DRY]   gh api repos/CuriocityDevAi/storeport/actions/runners # verify ci-box-storeport-light-mbp-m1: self-hosted + curiocity-mac-light
[DRY]   gh api repos/CuriocityDevAi/agilo-medusa-pos-fork/actions/runners # verify ci-box-fork-heavy-mbp-m1: self-hosted + curiocity-mac-fork
[DRY]   gh api repos/CuriocityDevAi/agilo-medusa-pos-fork/actions/runners # verify ci-box-fork-light-mbp-m1: self-hosted + curiocity-mac-fork-light
```

`--no-default-labels` 미존재 확인 ✓

### 라벨 검증 함수 단위 테스트

```
=== verify_runner_labels 단위 테스트 (가짜 gh 응답) ===

PASS: 정상 — self-hosted + curiocity-mac 있음
PASS: 누락 — self-hosted 없음
PASS: 누락 — custom 라벨 없음
PASS: 누락 — self-hosted + custom 모두 없음
PASS: 오프라인 — 러너 미발견 (빈 응답)

=== 결과: PASS=5 FAIL=0 ===
```

실제 아이맥 러너 접속·재등록은 미실행 (SSH 접속 금지 조건) — 라이브 `gh api` 응답 검증은 미완.

## PR 본문 확인 항목

- [x] "아이맥 재설치 시 러너 4개 라벨에 self-hosted 포함" ← PR 체크리스트 첫 항목으로 포함

## 이연 순증감

이연 없음.
