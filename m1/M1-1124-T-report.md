PASS
M1-1124-T — review predicted=true + extractReportTitle 일반헤딩 제외

branch: feat/M1-1124-P-ci-watch-v2  commit: a2e1fe112
PR #28  2026-11-25 00:28 WIB

## 변경 요약

### REQ 1: review 칸 predicted=true (가짜 ■ 제거)

pipeline-view.mjs step 6에서 모든 review 카드에 `predicted = true` 설정.
step 8에서 predicted review 카드 분기 처리:
- APPROVE + ageMin >= 90분 → `doneToday += 1; continue` (머지 추정 숨김)
- 그 외 → `level = 'green', mark = '●', reason = '예측·머지 여부 모름'`

기존 `renderAlertsSection`은 `c.level !== 'green'` 조건으로 필터하므로
predicted review 카드는 경보 집계 자동 제외됨.

### REQ 2: extractReportTitle 일반헤딩 건너뜀

sources-local.mjs:
- `GENERIC_HEADINGS` Set 추가 (요약, 결과, 개요 등 15개 + 영문 5개)
- `# heading` 파싱 시 GENERIC_HEADINGS에 해당하면 `continue` (다음 헤딩 탐색)
- `##` 이상 멀티-레벨 헤딩도 `s.startsWith('#')` 하나로 처리
- fallback 루프에서도 `!s.startsWith('#')` 조건 추가 (헤딩 줄 완전 제외)
- `readQueueTitle`: `원장 대사:` 줄에서 따옴표 텍스트 우선 추출

## 테스트 결과

```
# tests 27
# pass 27
# fail 0
```

추가된 케이스:
- T-8a: review predicted=true → level green, reason='예측·머지 여부 모름'
- T-8b: APPROVE 95분(>90) → 카드 숨김, doneToday=1

T-5c 사전 존재 버그(total cards=0 비교가 실제 홈 디렉터리 오염으로 실패) 수정:
old ID가 출현하지 않음을 직접 검증하는 단언으로 교체.

## --once 화면 캡처 (가짜 ■ 0건 확인)

```
ci-watch v2.0.0-mvp  11/25/2026 00:27:15  ■ 경보 1건  | 작업 14건  완료(오늘) 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ 큐(0) ]   [ 허브작업(1) ]             [ 리포트(9) ]        [ PR(0) ] [ CI대기(1) ]
...
[ CI실행(0) ]       [ CI결과(1) ]       [ 리뷰(2) ]              [ 머지(0) ]
                                     │●M1-1124-N                │
                                     │ 산출물                    │
                                     │ [m1]  2분 ●               │
                                     │●M1-1124-R                │
                                     │ PS Location을 Admin에서…  │
                                     │ [m1]  2분 ●               │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ M0-1124-N  리포트 19분 · 리포트 체류 19분
```

관찰:
- 리뷰 칸 M1-1124-N, M1-1124-R → ● green (경보 집계 제외) ✓
- 경보 목록: M0-1124-N 리포트 19분만 (실제 경보) ✓
- 가짜 ■ 0건 ✓
- 허브 M1-1124-T 제목 "ci-watch 도 개발해놔줘. 그…" (원장 대사: 따옴표 추출) ✓
