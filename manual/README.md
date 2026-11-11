# manual/ — 수동 투입 프롬프트 규약

러너가 집지 않는 프롬프트(러너 자신 수정 등). Kyu 가 상태판 [복사] → 허브 칸에 붙여넣기.

## 왜 이 파일이 있나 (11-11)
상태판은 relay **커밋 메시지**로 카드 상태를 옮긴다: `claim(<hub>): <ID> started|done|blocked` · `<hub>: <ID>`(리포트). 러너 프롬프트(queue/)는 착지 명령을 그대로 주지만, manual 프롬프트는 "claim done" 만 적어 허브가 손으로 JSON 을 쓰고 `done(m2): …` 같은 문구로 커밋 → M2-1105-AC 가 끝났는데 상태판에서 '투입됨'으로 남음. 상태판 v2.4 가 비표준 문구도 느슨하게 읽지만, 정본은 아래 블록.

## 모든 manual 프롬프트에 오케가 반드시 넣는 블록
```
시작(첫 명령): cd <relay 작업 폴더> && node scripts/claim.mjs <ID> started "manual"
착지(마지막 명령): 리포트 <hub>/<ID>-report.md 커밋 메시지는 정확히 "<hub>: <ID>" → git push origin HEAD:main
                  → node scripts/claim.mjs <ID> done "<한 줄 요약>"
막힘: node scripts/claim.mjs <ID> blocked --blocked-by kyu "<이유>"
claim JSON 을 손으로 쓰지 말 것(스키마: id·hub·state·at·note — claim.mjs 가 씀).
```
- relay 작업 폴더 = 러너 수정이면 `~/projects/relay-m1`(러너 폴더 침범 금지) · 그 외는 `~/projects/curiocity-relay`.
- claim.mjs 는 `HEAD:main` 으로 push 하므로 detached worktree 에서도 됨.
