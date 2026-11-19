#394 CHANGES · 맥 바쁨 감지가 항상 false(러너 이름 불일치·gh --jq --arg 오류)라 클라우드 넘기기·runner-watch 가 죽은 기능 · 클라우드 pos-int 실행 가능 O(로컬 재현)

# R0C-1119-Q 리포트 (2026-11-19 · R0 클라우드)

머지·코드 수정 없음. #394 에 리뷰 COMMENT 1건 게시 (HEAD 0ad7dd9).
읽음: ledger/decision-ci-cloud-overflow-20261118.md · r0-cloud/R0C-1119-N-report.md · m1/M1-1119-K-report.md

## ① 이전 A~D
- A ✅ heavy-mac/heavy-cloud 분리 · 둘 다 실측 초록.
- B ✅ 충돌 해소 · ci-summary 가 heavy-mac/heavy-cloud 실패 annotation 읽음.
- C △ API 실패·extra 비정수 → 로컬 ✅. 새 버그 C2: 건너뛴(skipped) heavy-cloud job 도 1건으로 셈 → 오늘 ci 5번만 돌아도 한도 소진 착각.
- D ❌ busy 항상 false:
  - 맥 heavy 러너 runner_name = `Youngkyus-MacBook-Pro-M1` (jobs API 실측) · `curiocity-mac` 은 라벨.
  - `gh api --jq --arg ...` 는 문법 오류(로컬 재현) → 항상 0.
  - runners API 는 GITHUB_TOKEN 403.
  - route 로그(run 44484168632) `runner_busy=false`.
  - M1 리포트의 "D busy 정확 O" 는 실측 아님.

## ② 클라우드 pos-int 실행 가능 → O (로컬 재현)
- 이 세션: Linux · PostgreSQL 16 · `service postgresql start` · pnpm 9.15.0 install · commerce-core build OK.
- `bash scripts/it.sh tenders` → **96/96 통과** (Node 22 · CI 는 Node 20).
- it.sh / test-integration-pos.sh 에 맥 전용 경로·명령 없음. heavy-cloud env(localhost:5432 · postgres/postgres) = services 포트와 맞음. psql 은 ubuntu 이미지에 있음. 마이그레이션은 medusa test runner 가 함.
- GitHub ubuntu 실측은 여전히 0.

## ③ 비용 안전
- draft · main push · dispatch → 로컬 ✅ · API 실패 → 로컬 ✅ · --test 11/11 직접 확인.
- force_cloud: 한도 검사 없이 무조건 클라우드 (설명엔 "할당 포함"). 수동만 가능 → 작은 위험.
- 동시 몰림: 재확인 1회로는 못 막음 → 몇 건 초과 가능(소액).
- 지금은 busy 가 늘 false 라 실제로 클라우드로 갈 일 자체가 없음 → 돈 0.

## ④ ci-summary
- heavy-mac/heavy-cloud/heavy 이름 모두 인식 · 실패 시 annotations 로 "heavy 실패 단계" 표. PR 댓글 표 실측은 △.

## ⑤ cancel-on-close · runner-watch
- cancel-on-close: 자기 run 제외·pull_request 만·branch 필터 ✅ (실동작 미확인).
- runner-watch ❌: busy 판정 D 와 같은 버그 + stall 을 `name == "heavy"` 로 찾음 → job 이름이 heavy-mac 이라 영원히 감지 0.

## ⑥ 머지 후 위험 · 되돌리기
- 브랜치 보호 없음(PR 본문) → job 이름 변경으로 머지 막힘 없음.
- 맥 경로 초록 → 첫 PR 들 깨질 위험 낮음. heavy-cloud 는 GitHub 실측 0.
- 되돌리기: `git revert -m 1 <머지 SHA>` 1개.
- 머지해도 돈은 안 쓰지만 넘기기·멈춤 알림은 동작 안 함.

## 고칠 것 (M1 에)
1. busy: `.name == "heavy-mac" and .status == "in_progress"` 만 보기 (또는 labels). jq 변수는 `gh api ... | jq --arg`. route-heavy.sh · runner-watch.yml 둘 다.
2. 카운트: `.name=="heavy-cloud" and .conclusion != "skipped"`.
3. runner-watch stall: `heavy` → `heavy-mac`.
4. (참고) force_cloud 설명/한도 · docs/ci-heavy-job.md 의 `heavy` 표현.
