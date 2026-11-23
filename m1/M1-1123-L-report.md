M1-1123-L · 판정: 완료 · commit 7101182 · 재현 테스트 3종 통과 · node --check OK

## 커밋

`7101182` feat(runner): M1-1123-L — hub-runner v7.8 · 충돌 판정 기준 수정 + 로그 폭주 방지

변경 파일:
- `scripts/hub-runner-v7.8.mjs` (신규 · v7.7 복사 후 수정)
- `scripts/hub-runner-install.sh` TARGET=v7.8 · FALLBACK=v7.7
- `docs/hub-runner.md` 버전 절

## 핵심 변경 요약

**REQ1 — autoRecoverDivergence() 판정 기준 변경**
허브 리포트(`m0/`·`m1/`·`m2/`·`m3/`·`r0/`)·`queue/`·`ledger/` 를 `HUB_REPORT_PREFIXES` 로 분리.
ahead 커밋에 허브 리포트만 있으면 `status: 'ok'` 반환 → pull --rebase 에 위임.
실제 코드/설정 변경만 `status: 'manual'` 로 중단.
"자동 복구 중단 · 사람/허브 파일 혼입" 이 허브 리포트 때문에 발동되는 현상 해소.

**REQ2 — tryAutoMergeConflicts() 유지**
충돌 파일에 허브 리포트·queue·ledger·코드가 하나라도 있으면 지금처럼 `needs_human=true` + 중단.

**REQ3 — 연속 merge 실패 3회 → 1줄 요약**
`_trackMergeFailure()` / `_resetMergeFailCount()` 추가.
`mergeFailKey` · `mergeFailCount` · `mergeFailSummarized` 모듈 변수로 추적.
3회 도달 시 `log('git', 'merge 연속 N회 실패 · needs_human=true · ...')` 1회만 기록.
이후 추가 발동 시 `mergeFailSummarized=true` → 반복 억제.

**REQ4 — 침범 감지 반복 억제**
`lastIntruderLogKey` 모듈 변수 추가.
`safePull()` 내 intruder 감지 블록: `intruderKey !== lastIntruderLogKey` 일 때만 1회 로그.
intruder 소멸 시 key 초기화.

## 재현 테스트 3종 로그

```
① --selftest-merge-conflict-auto
[selftest-merge-conflict-auto] OK · auto 파일 충돌(status/hubs.json) + 허브 리포트 로컬 커밋 → 자동 해결·push 성공

② --selftest-merge-conflict-human
[selftest-merge-conflict-human] OK · 허브 리포트 충돌 감지 · human=m0/M0-shared-report.md → needs_human=true 발동

③ --selftest-merge-fail3
[hub-runner-v7.8:git ...] merge 연속 3회 실패 · needs_human=true · conflicted=status/hubs.json · human=(auto-only)
[selftest-merge-fail3] OK · 연속 3회 → summarized=true · 4회 반복 억제 · 키 변경 시 리셋
```

## Kyu 설치 명령

```bash
bash ~/projects/curiocity-relay/scripts/hub-runner-install.sh
```
