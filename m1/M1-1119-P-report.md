storeport PR #394 · cloud 집계 O · 라벨 자동해제 O · 실측 진행중(queued) https://github.com/CuriocityDevAi/storeport/actions/runs/44516367083

## 작업 요약

### REQ 1 — _cloud_today 집계 + 라벨 자동 제거
- `_cloud_today`: `select(.name == "heavy-cloud")` 로 name 한정 + `select(.status != "completed" or .conclusion != "skipped")` skipped 제외 (remote에서 이미 적용, pull 시 반영)
- **라벨 자동 제거 추가 (M1-1119-P 커밋)**: `CLOUD_TODAY < QUOTA` 분기에서 `gh pr edit --remove-label ci-cloud-quota-exceeded` 추가
- 단위 확인: `bash .github/scripts/route-heavy.sh --test` → **14/14 통과** (신규 케이스: "busy + quota_ok PR#1 → ubuntu (label auto-remove)")

### REQ 2 — 커밋·push
- 커밋: `f7f956c fix(ci): M1-1119-P — ci-cloud-quota-exceeded 라벨 자동 제거 · 테스트 13/13`
- 브랜치: `ci/M2-1119-J-one-heavy` → `CuriocityDevAi/storeport`
- workflow_dispatch 발동: https://github.com/CuriocityDevAi/storeport/actions/runs/44516367083

### REQ 3 — 실측 1회 (20분 한도)
- run URL: https://github.com/CuriocityDevAi/storeport/actions/runs/44516367083
- sha: f7f956cd (최신 커밋 반영)
- force_cloud=true 로 발동 → 상태: **queued** (11:36Z 발동, 11:56Z 까지 완료 불가)
- 미완료 원인: `curiocity-mac-light` 러너 offline → markers-and-forbidden/route/changes-filter 대기 중
- 결론: **진행 중(queued)** · 20분 한도로 중단 (실패 아님)

### REQ 4 — PR 본문 업데이트
- PR #394 본문에 overflow 흐름 3줄 (busy 판정 · 한도 5 · 라벨 자동 제거 → Kyu 에게 묻기) 추가
- 실측용 빈 커밋 squash 머지 정리 1줄 추가
- 단위 확인 현황 14/14 로 갱신
