#394 CHANGES · Mac 기본 경로가 services: 때문에 깨질 위험 + PR 충돌로 새 HEAD 에서 PR CI 실측 0 · 건수 세기가 한도 넘길 수 있음

# R0C-1119-N 리포트 (2026-11-19 · R0 클라우드)

머지·코드 수정 없음. #394 에 리뷰 COMMENT 1건 게시 (HEAD 9456e90).
기준 문서: ledger/decision-ci-cloud-overflow-20261118.md 읽음.

## 이전 3건
1. cancel-on-close 자기 취소 — 해소(코드). run_id 제외 + event=pull_request + branch 필터. 실동작 미확인.
2. 실패 단계 표 — 코드 해소(annotations API). 실측 없음: L 커밋들에서 PR run 0건. ci-summary.yml 이 main 과 충돌.
3. feature-map — 미확인. yaml 등록은 됨. 새 HEAD 에서 feature-map-check run 없음.

## 막는 것
- A. `services: postgres` 는 Linux 러너 전용. Mac 러너에서는 무시가 아니라 job 실패 → 기본 경로 heavy 매번 빨강 위험. job 2개로 나누거나 docker run step 으로.
- B. PR mergeable_state=dirty (ci-summary.yml 충돌) → pull_request run 안 생김. 해소 후 Mac heavy·feature-map·실패 표 실측 필요.
- C. 오늘 건수 = completed run 만 셈 → 동시에 몰리면 5건 초과. API/python3 실패 → 0 → 클라우드 허용 (돈 쓰는 쪽 실패).
- D. busy 판정: runners API 는 GITHUB_TOKEN 으로 불가 → 항상 대체 경로. 대체 경로가 ubuntu heavy 도 Mac busy 로 셈.

## 좋음 / 참고
- draft·main push → 로컬, ci 에 schedule 없음, force_cloud 도 한도 적용. 라벨 repo 에 존재, 권한 OK. relay raw 공개(200).
- WIB 날짜: TZ=Asia/Jakarta + python +7 → 맞음.
- extra 가 정수 아니면 스크립트 exit 1 → route 실패 → heavy 건너뜀 (직접 재현).
- 재실행은 최신 attempt 만 셈. 라벨 떼는 주체 없음. route 88초.
- --test 10/10 통과 (직접 실행).
- run #761 (2m25s) 은 workflow_dispatch → 경로 필터 전부 false → pos-integration 등 skipped. ubuntu+postgres pos-int 실측 없음.
- runner-watch 도 D 와 같은 busy 문제.
