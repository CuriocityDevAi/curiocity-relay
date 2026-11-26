# M1-1126-F 리포트

판정: ✅ DONE — `docs/ci-box-heartbeat.md` 수정 커밋 push · PR #42 본문 업데이트 완료.

PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/42

커밋: `486635365` — fix(ci-box): M1-1126-F — install 명령 && || → if/then/else/fi

## 변경 내용

`[ -d .../.git ] && git pull --ff-only || git clone ...` 패턴은 pull이 실패(예: fast-forward 불가)할 때 `|| git clone`이 기존 폴더 위에 clone을 시도해 오류를 유발함. `if...then...else...fi` 로 교체하여 두 경로를 명확히 분리.

변경 위치: `docs/ci-box-heartbeat.md` · PR #42 본문 모두.

## 최종 Kyu 설치 명령 (if 블록은 한 번에 붙여넣기)

```bash
ssh KyuLee@100.82.115.70
if [ -d ~/projects/curiocity-relay-heartbeat/.git ]
then
  git -C ~/projects/curiocity-relay-heartbeat pull --ff-only
else
  git clone --depth=1 https://github.com/CuriocityDevAi/curiocity-relay.git ~/projects/curiocity-relay-heartbeat
fi
gh auth status || gh auth login
bash ~/projects/curiocity-relay-heartbeat/scripts/ci-box/install-health.sh
bash ~/projects/curiocity-relay-heartbeat/scripts/ci-box/health.sh --dry-run
bash ~/projects/curiocity-relay-heartbeat/scripts/ci-box/install-health.sh --status
```
