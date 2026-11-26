# 스택 PR retarget 시 CI 규약 (오케 결정 2026-11-26)

## 배경
- storeport #457·#458 이 스택 PR(base=feat/M0-1126-I)로 열렸다가 base 를 main 으로 바꿨는데 `ci` 가 안 돌아 30분+ 머지 지연(R0-1126-AE).
- 워크플로로 해결 시도(storeport #460):
  - `edited` 트리거 → 본문 수정 시 gate 잡 skipped = 필수 체크 통과 → **빨간 CI 위 머지 구멍**(R0-1126-AH 실측).
  - `ci-on-retarget` + workflow_dispatch → dispatch run 은 **PR 체크에 안 붙음**(R0-1126-AJ 실측).
  - 워크플로 안에서 GITHUB_TOKEN 으로 빈 커밋 push → GitHub 규칙상 GITHUB_TOKEN push 는 새 워크플로를 트리거하지 않음.
- 결론: #460 닫음. 워크플로 변경 없음.

## 규약
1. 스택 PR 은 가급적 만들지 않는다 — 앞 PR 머지 후 main 에서 새 브랜치.
2. 불가피하게 스택했고 base 를 main 으로 바꿨으면, 그 허브가 **로컬에서** `git commit --allow-empty -m "ci: retarget to main"` → push (사용자 토큰 → synchronize → ci 실행).
3. 저장소는 squash 머지만 허용 → 스택 위아래를 각각 squash 하면 충돌. 아래 PR 내용이 위 PR 에 포함돼 있으면 **위 PR 하나만 squash 머지하고 아래 PR 은 닫는다**(#457 → #458 사례).
4. 오케는 프롬프트에 "스택 금지(예외 시 2번)" 를 넣는다.
