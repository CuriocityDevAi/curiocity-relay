M2-1105-AK report · hub-runner-v6.7 queue-line model 지원

## 커밋 sha
2f8cabe

## 변경 파일 목록 (줄 수)
- scripts/hub-runner-v6.7.mjs (신규 · 3287줄 — v6.6 복사 후 수정)
- scripts/lib/parse-model-line.mjs (신규 · 13줄)
- scripts/test/hub-runner-model.test.mjs (신규 · 41줄)
- scripts/hub-runner-install.sh (수정 · +2 / -2 — TARGET·FALLBACK 두 줄)

## 이연 순증감
없음

## 구현 요약

### (a) v6.6 모델 결정 지점
- `spawnClaudeForItem()` 내 `const model = item.hubCfg?.model || config.model;` (구 v6.6 1790번 줄)
- `item.hubCfg` 는 메인 루프가 `runner-config.json` 허브 설정을 `item.hubCfg = cfg` 로 주입.
- `config.model` 은 `loadConfig()` 에서 `raw.model || 'opus'` 로 `status/runner-config.json` 읽음.

### (b) parseModelLine
- `scripts/lib/parse-model-line.mjs` 에 순수 함수로 분리.
- 정규식: `/^\s*(?:모델|model)\s*[:：]\s*(\S+)/iu` (전각 콜론·대소문자 무시·공백 허용).
- 첫 10줄만 검사(`slice(0, 10)`), 알 수 없는 값은 경고 후 `null` 반환.
- v6.7 에서 `import { parseModelLine } from './lib/parse-model-line.mjs'` 로 import 후 `export { parseModelLine }` 재내보냄.

### (c) 로그·claim 출처 기록
- 로그 헤더에 `model_source: queue-line|hub-default` 줄 추가 (기존 `model:` 줄 바로 뒤).
- 세 경로 claim note 에 `· source=${modelSource}` 추가 (기존 `model=` 필드 직후):
  - cmux-split: `runner-v6.7 · cmux-split · model=... · source=... · pane ...`
  - cmux-tab: `runner-v6.7 · cmux-tab · model=... · source=... · workspace=...`
  - bg: `runner-v6.7 · bg · model=... · source=... · 로그 ...`

## 테스트 통과 로그 (node --test)

```
TAP version 13
# [parseModelLine] 알 수 없는 모델 값 "gpt" · 기본값 사용
ok 1 - 모델: Opus → opus
ok 2 - 모델: Sonnet → sonnet
ok 3 - model: opus → opus (소문자)
ok 4 - MODEL： Opus (전각 콜론) → opus
ok 5 - 모델 줄 없음 → null (기본값 사용)
ok 6 - 11번째 줄 이후 모델 줄은 무시
ok 7 - 알 수 없는 값 → null (기본값 사용)
ok 8 - 앞뒤 공백이 있어도 파싱
ok 9 - 대소문자 혼용 MODEL: OPUS → opus
1..9
# tests 9
# pass 9
# fail 0
```

## 검증 로그
```
node --check scripts/hub-runner-v6.7.mjs → OK
bash -n scripts/hub-runner-install.sh → OK
node --test scripts/test/hub-runner-model.test.mjs → 9/9 pass
```

## (f) Kyu 용 Mac 명령 — 가동 중 허브 없을 때 실행

아래 명령은 **허브가 모두 idle 상태(running Claude 없음)일 때** 실행한다.
cmux-split/tab 창에서 Claude가 작업 중이면 해당 세션이 종료될 수 있으므로 주의.

배경 모드(bg) 자식 프로세스: `spawn` 에 `detached` 옵션 없음 → bootout 시 러너와 함께 **종료됨**.
cmux-tab/split 모드 Claude: cmux 터미널 별도 세션 → 러너 종료 후에도 **계속 실행됨** (착지 폴링만 끊김).

```
bash ~/projects/curiocity-relay/scripts/hub-runner-install.sh
```

성공 기준:
```
launchctl list | grep com.curiocity.hub-runner
```
pid 열이 숫자(0 초과)이면 OK.

```
tail -20 ~/.hub-runner/launchd.err.log
```
`hub-runner-v6.7` 를 포함한 `시작 · v6.7 · mode=` 줄이 보이면 OK.

다음 큐 프롬프트의 started claim 에서 `source=queue-line` (큐 파일에 모델 줄 있을 때) 또는 `source=hub-default` 가 찍히면 최종 확인.
