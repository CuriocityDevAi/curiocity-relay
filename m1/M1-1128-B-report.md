PASS · PR #76 · 가장 많은 허브=m0($522/4일) · 모델=opus-4-7(80건/$744) · 최고 단일 프롬프트=M1-1127-D 코딩 $64

## 작업 요약

**PR**: https://github.com/CuriocityDevAi/curiocity-relay/pull/76  
**브랜치**: M1-1128-B (worktree: `~/projects/curiocity-relay-wts/M1-1128-B`)

## 구현 내용

### REQ 1 — 출처 확인
- `~/.claude/projects/**/*.jsonl` 의 usage 필드 파싱
- ccusage(npx) 우선: `ccusage session --json` 으로 세션 UUID별 비용 가져옴
- 매칭 키: 러너 로그 `started_at` + 허브 cwd → claude project 디렉터리 → jsonl 파일의 첫 `timestamp` 가 `[started_at − 3min, done_at + 3min]` 에 들어오는 파일 선택
- fallback: ccusage 미매칭 시 jsonl 직접 집계 + 가격표 계산

### REQ 2 — 출력 형식
- `status/tokens/<날짜>.jsonl` · 1줄/프롬프트
- 필드: `{id, hub, model, started, done, input, output, cache_read, cache_write, cost_usd_est, prompt_type}`
- 오케 창(claude.ai) 세션은 측정 불가 → note: "oke-cloud: 측정 불가" 명시

### REQ 3 — 기준선 백필 (11-25~11-28)
| 날짜 | 건수 | Opus 건/$합 | Sonnet 건/$합 | 일합계 |
|---|---|---|---|---|
| 11-25 | 146 | 25건 / $178.73 | 121건 / $245.65 | $424.38 |
| 11-26 | 126 | 36건 / $321.46 | 90건 / $188.35 | $509.81 |
| 11-27 | 96 | 19건 / $248.42 | 77건 / $172.45 | $420.87 |
| 11-28(부분) | 5 | 2건 / $8.57 | 3건 / $2.30 | $10.87 |

토큰 상위 10 (전부 opus·코딩):
1. M1-1127-D $64.16 · 2. M3-1126-K $26.28 · 3. M0-1125-R $21.03 · 4. M0-1127-M $19.81 · 5. M0-1126-D $18.71
6. M0-1126-N $18.64 · 7. M0-1126-P $17.42 · 8. M0-1126-K $16.15 · 9. M0-1126-F $15.89 · 10. M0-1125-B $15.48

종류별: 코딩 237건/$1175 · 리뷰 126건/$173 · 진단 5건/$13 · 재작업 4건/$5

### REQ 4 — launchd 자동 실행
- `scripts/token-meter/com.curiocity.token-meter.plist` — 30분 주기
- 작업 폴더: `~/projects/curiocity-relay-tokens` (별도 clone · 러너와 완전 분리)
- run.sh: git fetch → rebase → 오늘 추출 → commit → push (충돌 시 rebase 1회 후 다음 주기)

**설치 명령**:
```bash
git clone https://github.com/CuriocityDevAi/curiocity-relay.git ~/projects/curiocity-relay-tokens
cp ~/projects/curiocity-relay-tokens/scripts/token-meter/com.curiocity.token-meter.plist \
   ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.curiocity.token-meter.plist
```

**제거 명령**:
```bash
launchctl unload ~/Library/LaunchAgents/com.curiocity.token-meter.plist
rm ~/Library/LaunchAgents/com.curiocity.token-meter.plist
```

## 자기 검증 (실제 jsonl 1건 손계산 대조)

**대상**: M1-1127-D (m1 · opus-4-7 · 2026-11-27T03:29~04:16)  
**extract 출력**: input=479, output=151400, cache_read=112098950, cache_write=431987, cost_usd_est=$64.15674  
**ccusage session(period=f598cddc) 직접 조회**: totalCost=$64.15674000000004, input=479, output=151400, cacheRead=112098950, cacheWrite=431987  
**결론**: 완전 일치 ✓

## PR 본문 확인 항목
- [x] 러너 파일(`scripts/hub-runner*.mjs`) 미수정
- [x] 러너 폴더(`~/projects/curiocity-relay`) 미수정
- [x] 비밀값·대화 내용 미포함 (숫자만)
- [x] 오케 창(claude.ai) 측정 불가 명시
- [x] 11-27 전체 96건 100% 매칭 성공 (session-not-found 0건)
- [x] metrics.md ④절 기준선 표 추가

## 상시 조항 ⓒ

이 허브 작업은 worktree `~/projects/curiocity-relay-wts/M1-1128-B` 에서만 수행하였으며, 러너 폴더(`~/projects/curiocity-relay`) 에는 브랜치 생성·커밋·rebase·stash·reset 을 하지 않았습니다. 리포트는 작업·커밋·PR 완료 후 최종 1회 작성하였습니다.
