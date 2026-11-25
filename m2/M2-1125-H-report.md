PASS

# M2-1125-H — ci-watch EAW 폭 계산 + 줄형 보기 + 박스 테두리 정렬

PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/32
Branch: fix/M2-1125-H-ci-watch-width

## 변경 내역

### scripts/watch/text-width.mjs (신규)
East Asian Width 기준 표시 폭 함수 — 외부 의존성 없음.
- `displayWidth(s)`: 한글·CJK·●■▲·…·이모지 = 2칸, ANSI 코드 = 0칸
- `truncateWidth(s, maxCols)`: EAW 기준 자르기 (초과 시 … 대체)
- `padEndWidth(s, targetCols)`: EAW 기준 오른쪽 공백 채움
- `stripAnsi(s)`: ANSI 이스케이프 제거

### scripts/watch/render-v2.mjs
- 모든 pad/truncate → EAW 함수 사용 (박스 테두리 정렬 수정)
- ansiOverhead 패턴 제거 — displayWidth 가 ANSI 처리
- renderLine() 추가: 기본 줄형 보기 (단계→카드 한 줄씩)
- renderV2() 에 `opts.board` 플래그: false(기본)=줄형, true=9칸 박스 칸반

### scripts/test/ci-watch-v2.test.mjs
- T-6b: board:true 조건 추가 (줄형 기본값 변경에 따른 수정)
- T-W1: displayWidth — 한글/이모지/●■▲/… 폭 계산
- T-W2: truncateWidth — 한글 포함 자르기
- T-W3: padEndWidth — EAW 기준 패딩
- T-W4: renderV2 board — 한글 카드 포함 시 각 줄 표시 폭 동일
- T-9a: --once 줄형 출력 캐처 (한글/이모지 카드)
- T-9b: --once 박스 출력 캐처 (한글 카드, 테두리 정렬 검증)

## 테스트 로그 (캐처 2개)

### 줄형 출력 (T-9a — terminalWidth=100)
```
ci-watch v2.0  t  ● 정상  | 작업 1건  완료(오늘) 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
● M1-1124-QA     큐       [m1]  2분   🎉 한글 제목 테스트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
경보 없음
```

### 박스 출력 (T-9b — terminalWidth=100, board=true)
```
[ 큐(1) ]           [ 허브작업(0) ]     [ 리포트(0) ]       [ PR(0) ]           [ CI대기(0) ]
┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐
│●M1-1124-QB     │  │                │  │                │  │                │  │                  │
│ 한글박스테스트  │  │  (비어있음)    │  │  (비어있음)    │  │  (비어있음)    │  │  (비어있음)      │
│   2분 ●        │  │                │  │                │  │                │  │                  │
└────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘  └──────────────────┘
```
(각 줄 표시 폭 동일 — 테두리 정렬 ✓)

## 테스트 결과
```
# tests 33
# pass 33
# fail 0
```
