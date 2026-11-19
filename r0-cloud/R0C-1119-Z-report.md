storeport #399 CHANGES · fork #210 CHANGES · storeport #394 CHANGES

# R0C-1119-Z 클라우드 리뷰 보고 (2026-11-19)

push·머지 안 함. 각 PR 에 판정 코멘트 1개씩 남김.

## A. storeport #399 — CD iOS 아이콘 M 축소 → CHANGES
https://github.com/CuriocityDevAi/storeport/pull/399#issuecomment-7008390435

| 확인 | 결과 |
|---|---|
| icon.png M 높이 | 361px = 캔버스 35.3% ✅ (CUSTOMER 글자 75px 따로) |
| POS 대비 | 현재 fork master POS M 513px 기준 **70.4%** ❌ (스크립트 기준 480px = 옛 주황 POS 아이콘) |
| app.config 경로 | icon / adaptiveIcon / bg #3B2A1F 일관 ✅ |
| 다른 앱 영향 | 없음 (apps/customer-display 만) ✅ |
| 범위 밖 변경 | receipt-anim.png (앱 안 SplashAnimation) · splash.png 색 뒤집힘 ❌ |
| CI | 3개 queued (light 러너 대기) — 초록 미확인 |

고칠 것: splash/receipt 원래 색 복원 · POS 기준값 512 로 바꾸거나 현재 POS 아이콘으로 비교 이미지 다시 만들어 Kyu 재확인 · 리포 밖 형제 경로 의존 제거 · iOS 다시 빌드.

## B. fork #210 — Android adaptive icon M 축소 → CHANGES
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/210#issuecomment-7008392964

| 확인 | 결과 |
|---|---|
| foreground / mono M | 313 / 312px = 66dp 안전 영역(626px)의 50% ✅ |
| iOS icon.png | 미변경 ✅ |
| base | 오래된 27fb8e1 위 — master #162 (A안 M · gen-icons.mjs · bg #FFE58A) 를 옛 M·#E8A33D 로 되돌림 ❌ · mergeable dirty |
| foreground 투명 | 아님 (주황 배경 칠해짐) ❌ |
| 범위 | 이미 머지된 cart 커밋 M1-1116-AJ(#161) 다시 포함 ❌ |
| 참고 | 현재 master M = 641px = 안전 영역 102% (넘침) → 축소 자체는 필요 |

고칠 것: master 로 rebase · gen-icons.mjs 에서 M_POS 축소해 투명 foreground + mono 생성 · bg #FFE58A 유지.

## C. storeport #394 — CI cloud overflow → CHANGES
https://github.com/CuriocityDevAi/storeport/pull/394#issuecomment-7008396366

| 확인 | 결과 |
|---|---|
| composite action 공유 | heavy-mac / heavy-cloud 같은 heavy-steps ✅ |
| quota 집계 | heavy-cloud 이면서 skipped 아닌 것만 · relay ci/cloud-quota/<WIB>.json .extra (relay public 확인) ✅ |
| busy 판정 | runners API 는 GITHUB_TOKEN 으로 못 읽음 → 실제로는 heavy-mac in_progress 폴백만 씀 (동작은 맞음 · 문서화 필요) |
| main 머지 | store-day-rehearsal.spec.ts add/add 충돌 · CI 와 상관없는 파일 섞임 ❌ |
| 실측 run 44516367083 | 3개 job 모두 queued (light 러너 offline) — ubuntu pos-integration 초록 0회 ❌ |
| PR 닫힘 취소 | 구현됨 · 다만 light 러너에서 돌아 offline 이면 cloud run 계속 과금 → ubuntu-latest 로 옮기기 권장 |
| 보안 | secrets 노출 없음 · pull-requests: write 가 최상위라 heavy job 까지 감 → route 에만 주기 |

고칠 것: main 으로 rebase(CI·docs 파일만) · force_cloud 초록 run 1회 · cancel-on-close 를 ubuntu 로 · 권한 최소화.
