#394 · 자기취소 차단 O · 실패단계 표 실측 X(CI runner stall) · feature-map 초록 O · stall 오탐 차단 O · heavy 실측 X(CI 미실행)

## HEAD 커밋
e2b9659 (브랜치: ci/M2-1119-J-one-heavy)

## REQ 1 · cancel-on-close 자기취소 차단 ✅ O
head_sha → head_branch + event=pull_request 필터. github.run_id 제외.
inline mock 단위 테스트 (workflow 실행마다 검증):
  mock: 자기run(99999)·ci-summary(workflow_run)·push(main)·다른PR·completed 포함
  → 취소 대상 1002만 출력 확인

## REQ 2 · ci-summary 실패단계 표 실측 ❌ X
코드 변경: steps[].conclusion → check annotations API (check_run_url → annotations)
ci.yml: ::error:: → ::error title=${step}::heavy step failed
임시 temp-fail step 커밋 후 runner stall 로 CI 실행 불가 → 되돌림
annotation API 접근법은 코드 분석 정상 — runner 복구 후 재실측 필요

## REQ 3 · feature-map 초록 ✅ O
docs/ci-heavy-job.md → infra.ci-workflows files 등록
.github/scripts/** 패턴 추가
로컬 feature-map-check: unmatched=0 / exit 0

## REQ 4 · runner-watch stall 오탐 차단 ✅ O
schedule: */10 → */20
stall = heavy runner not busy + queued heavy job >15m
runners API .busy 체크 (curiocity-mac, not -light)
권한 없으면 in_progress heavy job 유무로 대체

## REQ 5 · PR 본문 소요 수정 ✅ 완료
"최악 wall-clock ~60-70m" → "실측 중 (heavy job 1개)" 교체
processes: [ci-workflows] → [infra.ci-workflows] 정정

## CI 현황 (실측 X 사유)
heavy runner 가 05:17부터 ~50분 째 실행 중 (timeout 90분)
7개 CI run queued (05:18부터) · light runner online 이지만 미소화
내 모든 push (6724ab1 · 704803a · e2b9659) CI 미트리거 (paths-ignore 외 원인 미확인)
