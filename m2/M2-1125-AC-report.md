PASS · PR #39 · https://github.com/CuriocityDevAi/curiocity-relay/pull/39

## 원인 분석

`lib/runner.sh` `_install_launchd` 가 plist를 수동 작성했으나
`ProgramArguments` 가 가리키는 `${dir}/runsvc.sh` 가 존재하지 않았다.
공식 `./svc.sh install` 만이 `bin/runsvc.sh` → 러너 루트 복사를 수행한다.
기존 코드는 이 단계를 건너뛰어 launchd exit 78 발생.

## 변경 파일

- `scripts/ci-box/lib/runner.sh`
  - `_install_launchd`: 수동 plist 작성 제거 → `(cd $dir && ./svc.sh install && ./svc.sh start)` 위임
  - `UserName` 키 제거 (LaunchAgent 에 불필요 · svc.sh 도 쓰지 않음)
  - `verify_runner_pid(org_repo, runner_name)` 신규: `launchctl list` awk PID 추출,
    숫자 아니면 빨간 경고 + stderr.log 꼬리 10줄 출력
- `scripts/ci-box/setup.sh`
  - 러너 등록 완료 후 `verify_runner_pid x4` 검증 블록 추가
  - dry-run 요약 메시지 → svc.sh 반영

## 검증 로그

```
shellcheck -x setup.sh          → PASS (no warnings)
shellcheck lib/runner.sh        → PASS (no warnings)
bash setup.sh --dry-run         → 정상 출력 (svc.sh install/start · verify 블록 포함)
awk PID 파싱 단위 테스트         → PASS (숫자 12345 OK · '-' 비숫자 OK)
runsvc.sh cp 경로 단위 검증     → PASS (더미 폴더 bin/runsvc.sh → runsvc.sh)
```

## 브랜치 · 커밋

브랜치: `fix/M2-1125-AC-runner-runsvc`
커밋: `90597b328`
워크트리: `~/projects/curiocity-relay-wts/M2-1125-AC`
