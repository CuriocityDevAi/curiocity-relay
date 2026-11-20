fork #216 Mac 우선 O · 합산 한도 5 O · 초과 라벨+코멘트 O · 오프라인 대기 O · storeport #407 · 테스트 38/38

## fork PR #216 — agilo-medusa-pos-fork

- Mac 우선 (`curiocity-mac-fork`): route job + heavy-cloud 마커 + 모든 job runs-on 변경
- 합산 한도 5: `_cloud_today()` REPO + PARTNER_REPO 카운트 합산
- 초과 라벨+코멘트: `ci-cloud-quota-exceeded` 라벨 + "클라우드 추가 승인 필요" PR 코멘트
- 오프라인 대기: 러너 오프라인/미등록 → busy=false → self-hosted queued (클라우드 미사용)
- 테스트: `route-fork.sh --test` 17 통과 / 17 전체

## storeport PR #407

- PARTNER_REPO 합산: `_cloud_today()` 에 partner repo (fork) heavy-cloud 카운트 추가
- 테스트: `route-heavy.sh --test` 21 통과 / 21 전체 (기존 18 + 신규 3)
- ci.yml route job에 `PARTNER_REPO: ${{ vars.PARTNER_REPO }}` 추가

## 단위 확인 항목

| 항목 | 결과 |
|------|------|
| 두 리포 합산 카운트 (fork=2+partner=1=3→cloud) | ✅ |
| 한도 초과 (fork=3+partner=2=5→self-hosted) | ✅ |
| 오프라인 대기 (busy=false→self-hosted queued) | ✅ |
| force_cloud · draft · API 실패 · extra 비정수 | ✅ |
