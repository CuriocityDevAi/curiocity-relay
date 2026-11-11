# M2-1105-AJ Report

## 커밋 SHA

`0e1b461` — docs(methodology): v1.3 허브별 감시 규칙 + 병렬 시작 패턴 반영 (MP-009)

## 변경 파일 목록

| 파일 | 변경 줄 |
|---|---|
| `06-operating-rules.md` | +13 / -7 |
| `03-cycle.md` | +25 / -1 |
| `CHANGELOG.md` | +6 / -3 |
| `proposals/MP-009-watch-hub.md` | +42 / 0 (신규) |
| `proposals/README.md` | +2 / -1 |

## 이연 순증감

없음 (모두 완료).

## 작업 요약

### (a) 06-operating-rules.md — 감시 규칙 교체
- 비용 규칙 테이블의 감시 행: "15분 조용·20분 간격" → "발부마다 10분 첫 확인 → 2분×5회 → 10분 간격 → 30분 자동 꺼짐"
- 감시 규칙 절 전면 교체: 전체 20분 일괄 틱 폐지, 허브별 감시 전환, 상한(2분×5회·10분 간격·30분 꺼짐) 명시

### (b) 03-cycle.md — 감시 단계 + 병렬 시작 패턴 추가
- 2.5 · 감시 (오케) 절 신설: 발부 직후 10분 첫 확인 → 착지 없으면 2분×5회 → 10분 간격 → 30분 중단
- 병렬 시작 패턴 절 신설: 클라이언트 UI 허브 서버와 병렬 시작 가능, 머지는 서버 PR 머지 후에만

### (c) CHANGELOG.md + proposals/
- CHANGELOG v1.3 항목 추가 (MP-009 채택 내용)
- proposals/MP-009-watch-hub.md 신규 생성 (채택 · 2026-11-11 · 근거 = relay ledger/decision-watch-20261111.md)
- proposals/README.md MP-009 행 추가

## 자기 검증

- 링크 형식: Markdown 링크 문법으로 작성. 실 브라우저 렌더링은 미실행(미검증).
- 표 렌더링: Markdown 표 문법 준수. 실 브라우저 렌더링은 미실행(미검증).
- 커밋 push: `git push` 성공 확인.
