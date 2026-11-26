# 아이맥 확장 결정 (Kyu 11-26 14:56~14:58 WIB)

## Kyu 원문
- (14:56) "지금테스트할게 없으니, 아이맥쪽에 추가 테스틩 구성을 진행해볼까?"
- (14:58) "A 하고 C 계획에 동의해. 그런데 C 는 아이맥에서 하는 CI테스트와 무엇이 다른거야?"

## 결정
| # | 내용 | 소유 | 상태 |
|---|---|---|---|
| A | 맥북 CI 러너 4개 off → CI = 아이맥 + 클라우드 overflow | 오케 + Kyu 명령 | ✅ 15:01 WIB off · GitHub: 맥북 4 offline · 아이맥 4 online |
| B | 아이맥 러너 증설 | — | 보류 (A 후 대기 쌓이면 재검토) |
| C | 아이맥 POS↔손님화면 시나리오 자동 실기 — 계획서 먼저 | M1 | M1-1126-M 발부 |

## A 확인 근거
- 라벨 대응: curiocity-mac ↔ ci-box-storeport-heavy-imac · curiocity-mac-light ↔ ci-box-storeport-light-imac · curiocity-mac-fork ↔ ci-box-fork-heavy-imac (fork ci-summary runs-on 포함) · curiocity-mac-fork-light ↔ ci-box-fork-light-imac. 맥북 전용 라벨 macOS·ARM64 는 워크플로 미사용.
- fork route-fork.sh busy 판정 = 라벨 기준(이름 아님) → 아이맥으로 자연 이전.

## A 끄기 (실행됨 · 맥북)
```
for L in actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork-light actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork actions.runner.CuriocityDevAi-storeport.curiocity-mac-light actions.runner.CuriocityDevAi-storeport.Youngkyus-MacBook-Pro-M1; do launchctl bootout gui/$(id -u)/$L; launchctl disable gui/$(id -u)/$L; echo "stopped $L"; done
```

## A 되돌리기 (맥북)
```
for L in actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork-light actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork actions.runner.CuriocityDevAi-storeport.curiocity-mac-light actions.runner.CuriocityDevAi-storeport.Youngkyus-MacBook-Pro-M1; do launchctl enable gui/$(id -u)/$L; launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/$L.plist; echo "started $L"; done
```

## 감시 항목 (오케)
- 다음 PR CI 가 아이맥에서 도는지 · CI 대기 시간 · 클라우드 overflow 횟수 · 아이맥 heartbeat health
