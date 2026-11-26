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

---

## A 임팩트 측정 (M1-1126-N · Kyu 15:13 WIB)

원문: "ci 를 아이맥 전용으로 사용하고나서, 내 맥북만 쓸때에 비해서 어떤점이 좋아졌는지 판단해봐줘"

> ⚠️  **표본 부족 — 판단 보류** (후 구간 20분 < 2시간 · 수치는 참고용)

컷오버: `2026-11-26T08:01:00Z` / 전 32h(2026-11-25~) / 후 20min

### 맥북 자원 (mem-log · 1시간 간격 샘플)

| 항목 | 전(맥북 CI 포함) n=27 | 후(iMac 전용) |
|---|---|---|
| used_gb | avg 15.41 / max 15.85 | 아직 샘플 없음 |
| swap_used_gb | avg 3.83 / max 6.30 | 아직 샘플 없음 |
| compressed_gb | avg 4.08 / max 6.23 | 아직 샘플 없음 |

### CI 지표 (W2 필터 · marker·skipped·cancelled 제외)

| 항목 | 전 n=564 | 후 n=8 |
|---|---|---|
| 대기시간 평균 | 1.5min | 0.8min |
| 대기시간 p90 | 4.0min | 3.0min |
| 잡 실행시간 평균 | 2.0min | 1.2min |
| MBP 처리 수 | 442 | 0 |
| iMac 처리 수 | 56 | 7 |
| cloud overflow 수 | 66 | 1 |

### 프롬프트 처리량 (pipeline + claims)

| 항목 | 전 n=157 | 후 n=1 |
|---|---|---|
| started→done 평균 | 13.2min | 11.7min |
| started→done 중앙값 | 9.9min | 11.7min |
| 시간당 완료 PT/h | 4.90 | 3.01 |

### 판단

8잡 CI에서 대기·실행 시간 모두 단축(대기 −47%, p90 −25%), MBP 처리 0 확인(완전 오프로드). cloud overflow도 66→1. 맥북 메모리·PT는 표본 부족으로 판단 보류.  
재측정: `node scripts/metrics/ci-offload-impact.mjs --cutover 2026-11-26T08:01:00Z`
