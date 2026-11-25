PASS

#35 head sha: f362eb208452616611f5b2cc94981904cea2df6e

git log --oneline -5:
f362eb208 fix(ci-watch): M2-1125-W — --once sha @(unknown) 수정 · readLocalOriginSha 추가
02451d15e feat(ci-watch): M2-1125-T — 비동기 수집 (스피너 멈춤 해소) · sha 변경 재수집
c686e5073 fix(ci-watch): M2-1125-S — 스피너·릴레이CI·리포접두어·주의사유·프롬프트ID·머지후CI 6건 수정
ea158bcc2 perf(ci-watch): M2-1125-Q — 부팅 가속 (63s→<1s) · git 배치 읽기 · 날짜 필터 · 비동기 fetch
951b0e9b1 feat(ci-watch): M2-1125-O — 풀 배정 수정 (runner_name·job 기반) + 잡 레이블 사람 말로

테스트 꼬리:
1..332
# tests 332
# suites 0
# pass 332
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 20642.7935

작업 요약:
- fix/M2-1125-W-once-sha worktree: 3파일 stage→커밋 (ci-watch-v2.mjs, sources-git.mjs, test/ci-watch-w.test.mjs)
- feat/M2-1125-Q (PR #35 head) 에 --force-with-lease push: 02451d1→f362eb2
- PR #35 base: feat/M2-1125-I-ci-watch-layout → main 으로 변경 완료
- PR #35 제목·본문 W 항목 추가
- node --test scripts/test/*.mjs: 332/332 PASS
