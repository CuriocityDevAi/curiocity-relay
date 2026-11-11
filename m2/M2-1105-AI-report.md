# M2-1105-AI Report

## 커밋 SHA

`1e50afa` — docs(methodology): v1.2 — 오케 검토 4건 반영 (MP-008)

---

## 변경 파일 목록

| 파일 | 변경 줄 수 |
|---|---|
| `README.md` | +2 |
| `02-roles.md` | +9, -2 |
| `06-operating-rules.md` | +31, -3 |
| `CHANGELOG.md` | +6 |
| `proposals/README.md` | +1 |
| `proposals/MP-008-oke-review-v1-refinements.md` | +45 (신규) |

총: 6 파일, +94줄, -5줄

---

## 반영 내용 요약

| 항목 | 변경 |
|---|---|
| (a) 오케 메인 창 vs 백그라운드 작업자 | README 한 장 요약에 callout 추가 / 02-roles 오케 절에 메인 창·백그라운드 작업자 분리 명시 / fork 금지(1회 ≈ 590k 토큰) |
| (b) 상태판 "Kyu 할 일" 패널 규칙 | 06 에 패널 규칙 절 신설: 최상단 고정·접기·자동 펼침·self-contained 카드·복사 버튼·정상/비정상 화면·무엇을 보고할지 |
| (c) 감시 규칙 완결 | 06 에 감시 규칙 절 신설: 오케 창 작업 중·15분·20분 간격·30분 무응답 꺼짐·수동 켜/꺼·원장 파일 정본 연결(머지 규칙에 cross-ref) |
| (d) 모델 표 모순 수정 | 02-roles 허브 종류 표: M1·M3 Opus → Sonnet (오케가 Opus 지정 가능 주석 추가) / 06 비용 규칙: M0·M1·M3→Opus 행 → M0 Opus·M1·M2·M3·R0 Sonnet 으로 분리 + 오케 창 Opus 행 추가 |

---

## 이연 순증감

없음 (신규 파일 1개 제외 모두 기존 파일 수정)

---

## 착지 명령

```
cp /tmp/M2-1105-AI-report.md ~/projects/curiocity-relay/m2/ && cd ~/projects/curiocity-relay && git add m2/M2-1105-AI-report.md && git commit -m "m2: M2-1105-AI" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M2-1105-AI done "v1.2 오케 검토 4건 반영: 메인창 분리·상태판 패널·감시 규칙·모델표 통일"
```

---

## 자기 검증

- 링크: proposals/README.md 의 decision-mp006 링크는 기존 파일 그대로 — 미검증(브라우저 미실행)
- 표 렌더링: Markdown 문법 확인 완료, 실제 GitHub 렌더링은 미검증
- 커밋·push: `git push` 성공 확인 (`1e50afa` → origin/main)
