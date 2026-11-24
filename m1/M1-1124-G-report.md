# M1-1124-G

판정: OK — v8 R1 (REPORT_PATH 격리, 제안 A) 구현 완료 · PR 열림 · 셀프테스트 3종 PASS · 머지 전 · 러너 재시작 전.

## PR
- https://github.com/CuriocityDevAi/curiocity-relay/pull/21
- 브랜치: `feat/M1-1124-G-v8-r1-report-path` · 베이스 `main` · 1 commit (`scripts/hub-runner-v8.0.mjs` · +5023 LOC)
- 작업 worktree: `~/curiocity-live/relay-wts/M1-1124-G-wt` (relay main 미변경)

## 구현 요약 (v7.8 대비 5건)
1. **REPORT_PATH 격리**: 세션 시작 시 러너가 `~/.hub-runner/reports/<hub>/<ID>/report.md` 를 준비하고(디렉터리 생성 · 이전 run 잔재 삭제) 자식 env `REPORT_PATH` 전달 + 프롬프트 맨 앞에 고정 문구 자동 삽입 (`${ABS_PATH}` 치환). 세 spawn 경로(background `-p` · cmux-interactive · cmux-split pane) 전부 커버.
2. **러너 수거**: `collectIsolatedReport()` — polling 중 `reportExists` 콜백에서 격리 파일 발견 시 relay `<hub>/<ID>-report.md` 로 copy → `git add` → `commit` → `pull --rebase` → `push`. 성공 뒤엔 기존 waitForLanding origin 감지로 자연스럽게 done.
3. **shim(전환기 안전)**:
   - a) relay 루트 `<hub>/<ID>-report.md` — 기존 그대로
   - b) `queue/<hub>/<ID>-report.md` → `relocateMisplacedReports` 로 mv (v7.6 로직 유지, 소스 추적만 추가)
   - c) `recoverReportFromBranch()` 신규 — `git show origin/<br>:<hub>/<ID>-report.md` 로 wrong-branch 회수 (최근 25 브랜치만)
   - 사용 경로는 `lastReportSource` Map 에 저장, claim done note 뒤에 `report_src=isolated|legacy-root|legacy-queue|branch:<name>` 로 자동 append.
4. **feature flag**: `status/runner-config.json` 의 `reportPath: { enabled, prompt_prefix, home }` 블록. 기본 on. off 이면 `prepareIsolatedReport` 가 호출되지 않고 preamble·env·수거 모두 bypass (=v7.8 레거시).
5. **버전 표기**: `RUNNER_VERSION='v8.0'` — 로그·all.json `runner` 필드·commit note 전부 자동. all.json 공개 필드 추가: `isolated_reports_collected`, `branch_reports_recovered`.

## 대상 사고 / 리포트 오류
- 사고 ③⑤ (허브가 relay git 을 만지면서 발생하는 side-effect)
- R0-1124-E fork push — 허브가 relay 리포에 접근 안 하면 원천 차단
- M2-1124-I 브랜치-only 커밋 — shim c) 가 자동 회수
- queue/ 오경로 누출 다수 — v7.6 로직 그대로 + 소스 추적

## 자기 검증 (dry-run · 임시 디렉터리 only · relay main 미건드림)
```
$ node --check scripts/hub-runner-v8.0.mjs
(ok)

$ node scripts/hub-runner-v8.0.mjs --selftest-report-path-off
[selftest-report-path-off] OK · flag off → false · 기본 on · ${ABS_PATH} 치환 정상

$ node scripts/hub-runner-v8.0.mjs --selftest-report-path-collect
[selftest-report-path-collect] OK · m1/M1-1124-G-SELFTEST-COLLECT-report.md
  격리→copy→commit→push → origin 착지 · lastReportSource=isolated

$ node scripts/hub-runner-v8.0.mjs --selftest-report-path-shim
[selftest-report-path-shim] OK · a) 루트 · b) queue/ mv · c) wrong-branch show
  3경로 모두 작동

(regression · v7.8 셀프테스트)
$ node scripts/hub-runner-v8.0.mjs --selftest-merge-fail3
[selftest-merge-fail3] OK · 연속 3회 → summarized=true · 4회 반복 억제 · 키 변경 시 리셋

$ node scripts/hub-runner-v8.0.mjs --selftest-merge-conflict-auto
[selftest-merge-conflict-auto] OK · auto 파일 충돌 + 허브 리포트 로컬 커밋 → 자동 해결·push 성공

$ node scripts/hub-runner-v8.0.mjs --selftest-report-relocate
[selftest-report-relocate] ALL OK
```

## 영향 범위 · 안 건드린 것
- `scripts/hub-runner-v8.0.mjs` 신규 1 파일. 기존 `v7.8.mjs`·`claim.mjs`·`install.sh`·`runner-config.json` **무변경**.
- `scripts/ci-watch.mjs` · `scripts/watch/*` 금지 지시 준수 (M2 진행 중).
- Fallback 논리: `install.sh` 의 `FALLBACK=hub-runner-v7.7.mjs` 는 머지 후 Kyu 가 `FALLBACK=hub-runner-v7.8.mjs` 로 교체 권장.

## Kyu 설치 명령 (머지 뒤 1줄)
```
cd ~/projects/curiocity-relay && git pull && TARGET=hub-runner-v8.0.mjs FALLBACK=hub-runner-v7.8.mjs bash scripts/hub-runner-install.sh
```

## 열어 둔 것 · 다음 라운드
- runner-config.json 에 `reportPath` 블록을 추가하는 커밋은 포함하지 않음 — 기본값이 on 이라 불필요하지만, off 가능성을 알리려면 `{ "reportPath": { "enabled": true } }` 를 명시 가능.
- 일부 셀프테스트(SELFTEST_REPORT_PATH_COLLECT)는 상수 `ISOLATED_REPORT_HOME` 를 바꿀 수 없어 실제 수거 경로는 쉘 레벨에서 흉내만 함. 실제 `collectIsolatedReport()` 커버는 머지 후 운영 러너가 첫 세션으로 확인 (R2 에 end-to-end 셀프테스트 추가 권장).
- 상한 45분 안에 완료.

판정 요약: **OK** · PR #21 · 셀프테스트 6종(v8 신규 3 + v7.8 regression 3) PASS · 머지·러너 재시작은 Kyu.
