# M1-1124-E Report — 러너 v8 격리 구조 계획서

판정: **DONE (plan-only, 구현 금지 준수)** — PR #18 docs-only, Kyu 승인 대기.

## PR
- https://github.com/CuriocityDevAi/curiocity-relay/pull/18
- 브랜치: `docs/M1-1124-E-runner-v8-plan` (origin/main 기반, worktree `/tmp/relay-M1-1124-E-plan` 에서 작업)
- 산출물: `docs/plans/runner-v8-isolation.md` 1 파일 (+239 라인)

## 작업 격리 확인
- `~/projects/curiocity-relay` 작업 트리 브랜치 변경 **없음** (지시 준수).
- 로컬 main 이 origin 과 5/5 갈라진 상태였기 때문에, 리포트 push 도 **fresh clone `/tmp/relay-E-report`** 에서 수행 (사용자 작업 트리를 건드리지 않기 위함).
- 플랜 worktree 는 **origin/main 기반 신규 브랜치**로 생성 → 로컬 main 의 미커밋 삭제(⑥ 원인)와 완전 분리.

## 요약
오늘 하루 사고 6건 (①~⑥) 의 공통 뿌리를 "러너·허브·사람이 같은 git 폴더를 서로 다른 전제로 공유" 로 식별. v8 설계는:

- **A**: 허브가 relay git 을 안 만짐 (REPORT_PATH 격리)
- **B**: 러너 전용 `~/.hub-runner/relay` clone
- **C**: relay 코드 작업은 ephemeral worktree
- **D**: launchd KeepAlive 자가 업데이트
- **E**: 자가 복구 표 (stray·drift·divergence·no-report·queue-path·ci-busy)
- **F**: 메모리/CI 부하 — 아이맥 M1 CI 전용 전환 등

11 라운드 (R1~R11) 로 분할, 각 30~45분. 혼재 안전은 feature flag + 디스크 상 완전 별도 clone 으로 보장. Kyu 손작업 총 2회 (plist 1회, 아이맥 러너 등록 1회) 로 축소.

## Kyu 결정 필요 (최대 3)
1. **A + B + C 격리 방향 전체 승인?** — v8 의 가장 큰 패러다임 변경. "예" 면 R1~R4 바로 착수.
2. **F-ⓐ 아이맥 M1(8GB) CI 전용 러너 전환 승인?** — 맥북 16GB 포화 해소의 유일한 비-과금 안.
3. **D launchd KeepAlive + 자가 업데이트 승인?** — Kyu 1회 plist 설치 비용으로 'install pending' 반복 제거. 거부 시 R8 생략해도 E 만으로 사고 대부분 커버 가능.

## 소요
- 상한 45분 · 실 소요 ~20분 (계획서 작성·PR·report).
- 코드 변경 0 라인.
