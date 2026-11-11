M2-1105-AL report · hub-runner-v6.8 (멈춤 오탐 · 상태 보고 · 업데이트 가드)

## 커밋 sha
6b536fd

## 변경 파일 목록 (줄 수)
- scripts/hub-runner-v6.8.mjs (신규 · ~3300줄 — v6.7 복사 후 수정)
- scripts/lib/detect-stuck.mjs (신규 · 28줄)
- scripts/lib/queue-update.mjs (신규 · 8줄)
- scripts/test/hub-runner-stuck.test.mjs (신규 · 89줄)
- scripts/test/hub-runner-queue-update.test.mjs (신규 · 38줄)
- scripts/hub-runner-install.sh (수정 · +2 / -2 — TARGET·FALLBACK 두 줄)

## 이연 순증감
없음

## 오탐 원인 결론

기존 `idle_no_landing` 판정이 "shell 상태 AND startedAt 으로부터 10분 경과" 만으로 발동했다. 이 조건은 pane 스냅샷 변화를 추적하지 않았으므로, 긴 도구 실행 중 출력이 잠깐 멎어 pane 상태 판정이 `shell`로 미스 판정됐을 때(또는 DNS 순단으로 pane 읽기가 오작동했을 때) 오탐 가능했다. 화면이 계속 바뀌는 중에도 순간 `shell` 판정이 10분 조건과 맞으면 로그가 나왔다. 또한 같은 판정이 반복됐어도 매 폴링마다 로그가 찍혀 연속 출력됐다.

v6.8 수정: "shell 상태 AND 스냅샷이 5분+ 연속 불변 AND 진행 표식(스피너·esc to interrupt·tokens)이 없을 때"만 판정. 같은 `kind` 가 반복돼도 상태 변화 시 1회만 로그.

## 테스트 통과 로그 (node --test · 22개)

```
TAP version 13
ok 1  - 모델: Opus → opus
ok 2  - 모델: Sonnet → sonnet
ok 3  - model: opus → opus (소문자)
ok 4  - MODEL： Opus (전각 콜론) → opus
ok 5  - 모델 줄 없음 → null (기본값 사용)
ok 6  - 11번째 줄 이후 모델 줄은 무시
ok 7  - 알 수 없는 값 → null (기본값 사용)
ok 8  - 앞뒤 공백이 있어도 파싱
ok 9  - 대소문자 혼용 MODEL: OPUS → opus
ok 10 - outOfScope 파일 있으면 queue checkout 필요
ok 11 - outOfScope 파일 없으면 queue checkout 불필요
ok 12 - 같은 파일 집합 → 동일 key (1회만 로그)
ok 13 - 다른 파일 집합 → 다른 key (재로그 허용)
ok 14 - 정렬 순서 무관하게 동일 key
ok 15 - 활발 출력 — 화면 변화 있으면 미판정
ok 16 - 불변 4분 — 아직 미판정
ok 17 - 불변 5분+스피너 있음 — 미판정
ok 18 - 불변 5분+스피너 없음 — 판정 1회
ok 19 - 같은 상태 재폴링 — history 유지되어 반복 true 반환
ok 20 - 상태 해제 후 재판정 — 화면 바뀌면 history 리셋
ok 21 - claude 상태이면 미판정
ok 22 - hasProgressMarkers — 스피너 감지
1..22
# tests 22
# pass 22
# fail 0
```

## 검증 로그
```
node --check scripts/hub-runner-v6.8.mjs → OK
bash -n scripts/hub-runner-install.sh → OK
node --test (22개) → pass 22 / fail 0
```

## Kyu 용 Mac 설치 명령 — 가동 중 허브 없을 때 실행

**이 작업이 착지 완료된 후 Kyu 가 직접 실행해야 한다.**
실행 시점: 현재 실행 중인 허브(M0·M3 등)가 모두 idle 상태일 때.

배경 모드(bg) 자식 프로세스: `spawn` 에 `detached` 없음 → bootout 시 러너와 함께 **종료됨**.
cmux-tab/split 모드 Claude: cmux 별도 세션 → 러너 종료 후에도 **계속 실행됨** (착지 폴링만 끊김).

```
cd ~/projects/curiocity-relay
git pull
bash scripts/hub-runner-install.sh
```

성공 확인:
```
launchctl list | grep com.curiocity.hub-runner
```
pid 열이 숫자(0 초과)이면 OK.

```
tail -20 ~/.hub-runner/launchd.err.log
```
`hub-runner-v6.8` 를 포함한 `시작 · v6.8 · mode=` 줄이 보이면 OK.

```
cat ~/projects/curiocity-relay/status/runners/all.json | grep runner
```
`"runner": "v6.8"` 이면 최종 확인.
