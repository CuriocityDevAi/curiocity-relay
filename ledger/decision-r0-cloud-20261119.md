# 결정: R0 리뷰 허브 클라우드 전환 — storeport 부터 (2026-11-19)

## Kyu 원문
- 09:07 "R0를 클라우드로 바꿔보는거 해보자."
- 09:10 "로컬 cmux 에서 r0 를 돌리려면 … relay 로 결과를 올리고 … 러너가 집어가서 … 비효율적이여서, 클라우드에서 돌리는걸로 바꾸자고 너가 제안했던거" (출처 제안 = 11-16 "클로드 앱 활용 방식" 하이브리드안)
- 09:16 "기존방식 vs 제안방식 … 시간 · 메모리 · 토큰 … 비교해줬으면 해"
- 10:22 선택 = **"storeport부터 클라우드 전환 (추천)"**

## 실측 비교 (11-19)
| 항목 | Mac R0 | 클라우드 R0 |
|---|---|---|
| 리뷰 1건 (시작→판정) | 평균 ~7분 (7.6 · 9.7 · 6.9 · 6.7 · 4.9) | 3~4분 (R0C-B 3분 · R0C-C 3.5분) |
| 단계별 | 기록 없음 | clone 2초 · install 26~30초 · unit 29~31초 · build 33초 · PG 3초 · 통합 spec 13~14초 |
| Mac 메모리 | 미측정 (Mac 전체 15.7/16GB + 스왑 7GB) | 0 |
| 토큰 (ccusage · Sonnet) | 오늘 9건 합 $8.10 · **건당 평균 $0.90**(범위 $0.48~$1.98) · 건당 ~1.25M 토큰(대부분 cache read) + 시간 초과 1건 낭비 $0.85(R0-1118-AH) | 측정 불가(세션 안에서 사용량 조회 수단 없음) · 모델 Opus 고정(예약 작업은 모델 지정 불가) → 건당 비용 Mac 보다 높을 가능성 |
| 품질 | #385 APPROVE("기존 문제") | #385 CHANGES(eslint error 7건 실행으로 확인 · 정답) · #389 CHANGES(probe 실행으로 paid→expired 발견) |
| 고장 | 11-19 아침 러너 멈춤 → 3시간 공백 · AH 60분 시간 초과 | 러너·relay·Mac 무관 |

## 운영 방식 (오케)
- storeport PR 착지 → 오케가 이 오케 세션(storeport·relay·fork 리포 연결됨)에서 1회성 예약 작업 `R0C-<월일>-<알파벳>` 생성 → 클라우드 세션이 clone·install·unit·통합(Postgres 내장)·eslint 실행 → PR 에 리뷰 코멘트(같은 계정 PR 이라 APPROVE/REQUEST_CHANGES 이벤트 불가 → COMMENT + 첫 줄 판정) → relay `r0-cloud/<ID>-report.md`.
- POS 앱(fork) PR 은 리포 연결 완료(11-19) · 시험 1회 뒤 전환 · 그때까지 Mac R0.
- Mac R0 = 백업(클라우드 실패 시).
- 남은 과제: 클라우드 토큰 측정 수단 · 모델 지정(Sonnet) 가능 여부 · 같은 계정 리뷰 이벤트 제약.

## 11:03 WIB 추가 — POS 앱(fork)도 클라우드 R0 전환
- R0C-1119-F(fork #199 첫 시험): 설치 27초(sentry-cli 다운로드 차단 → `SENTRYCLI_SKIP_DOWNLOAD=1` 필요) · lint · assertions 47/47(ImageMagick 대체 필요) · vitest · flow-tests 전부 클라우드에서 돎 · 총 약 4분 · 가드 탐지 실험까지 수행
- 클라우드 불가 = iOS 시뮬레이터/Maestro · Metro 실기 → 이건 원래 Kyu 실기 몫
- 결정(오케 · Kyu "시험 1회 뒤 전환" 범위 안): **POS 앱 PR 리뷰도 오늘부터 클라우드 R0** · Mac R0 = 백업
- 클라우드 R0 프롬프트 고정 문구: fork 설치 시 `SENTRYCLI_SKIP_DOWNLOAD=1` · assertions 의 ImageMagick 의존 처리
