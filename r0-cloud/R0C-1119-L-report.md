#392 APPROVE · fork #205 CHANGES · #394 CHANGES · (#392 지적 2건 원복·넓은 창 변화 0 / #205 새 lint error 1건으로 CI lint 빨강 / #394 cancel-on-close 자기 취소 위험·실패 단계 표 오작동 가능·feature-map 빨강)

# R0C-1119-L 리포트 (2026-11-19 · R0 클라우드)

머지·코드 수정 없음. 리뷰 COMMENT 3건 게시.

## ① storeport #392 — APPROVE (HEAD 3038d33)
- 타이머 넓은 창 16px 원복 확인 (실측 16px) · orientation `landscape` 원복 (main 대비 diff 0).
- 1194×834: main vs PR 8화면 픽셀 비교 → 8/8 차이 0.
- 507×834: 가로 넘침 0. 바뀐 곳은 keypad-after 타이머 16→14px 뿐 (의도).
- vitest 195/195 · typecheck 0 · playwright responsive spec 16/16.
- 참고: receipt 경계값 계산은 폭 420 미만에서만 작동 → 400px 케이스 추가 권장.

## ② fork #205 — CHANGES (HEAD 98b6452)
- 고칠 것: `[draftOrderId].tsx:269` prettier error 1건 (기준 0 → PR 1). CI lint 실패와 일치.
- 507×500: Cancel 처음엔 화면 밖 → 스크롤로 닿음. QR 전체 보임. 1194×600 도 OK.
- 1194×834: 요소 좌표 기준과 완전히 같음 (차이는 카운트다운 숫자뿐).
- `if (svgBox)` 건너뛰기 제거 확인.
- assertions 47/47 · playwright 4/4 · vitest 763 pass (실패 1파일 docs/plans/splitview-capture.spec.ts 는 기존 실패).
- 참고: 새 507×500 테스트는 기준 코드에서도 통과 (웹은 바깥이 대신 스크롤) → 네이티브 실기 확인 1회 권장.

## ③ storeport #394 — CHANGES (HEAD aea0569)
- 고칠 것 1: cancel-on-close 가 head_sha 만으로 거름 → 자기 run·ci-summary run 까지 취소 대상. `github.run_id` 제외 + event/head_branch 로 좁히기.
- 고칠 것 2: ci-summary "heavy 실패 단계" 표가 `steps[].conclusion` 을 봄 → continue-on-error 단계는 success 로 나올 가능성 높음 (집계 step 한 줄만 표시). annotation API 로 읽기 + 일부러 실패시켜 실측.
- 고칠 것 3: feature-map-check 빨강 (`docs/ci-heavy-job.md` 미분류). processes id 도 `infra.ci-workflows` 와 불일치.
- OK: 경로 필터 의미 보존 · 가짜 초록 없음 (집계 exit 1) · light 러너만 사용 · 10분 schedule 은 하루 ~30~50분 점유로 과하지 않음 (15~30분 권장).
- 참고: runner-watch 는 heavy 러너 1대라 줄 서기를 stall 로 오탐 가능.
- 소요 주장 사실 아님: 기존 heavy 6개도 러너 1대(id 21)가 차례로 처리 → "병렬 ~20분" 아님. 실측 build 24~29s · unit ~25s · install ~22s · pos-int 테스트 ~11.5분 · 옛 Setup Node 4~12분은 #393 이 제거. 추정 heavy 1개 보통 ~15분, 최악 25~30분 → "60~70분" 은 과대.
