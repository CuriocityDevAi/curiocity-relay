# M0-1105-CJ — #261 머지 충돌 해소 + #271 CI 초록 (Opus · 45분 상한)

**첫 줄**: #261 **MERGEABLE/CLEAN** · #271 **CI 초록** (pos-integration 7m16s pass · 적립 통합 pass) · **draft 해제 완료**.

## 결과 요약
- **#261** `feat/m0-1105-cd-loyalty-expiry`: main(29ea759) rebase 완료 → force-with-lease push (9f623f8) → CI 전원 초록 → **MERGEABLE/CLEAN**. 머지 대기.
- **#271** `feat/m0-1105-ci-s1b-r4`: 재돌림 없이도 CI 초록 (pos-integration pass · unit pass · markers pass) → **draft 해제** → **MERGEABLE/CLEAN**. 머지 대기.
- **tsc `loyalty-info/route.ts:79`**: 기존 에러 (`TS18046: 'storeCreditModule' is of type 'unknown'`) 확인. **#271 diff 범위에 그 파일 없음** → 범위 이탈 → **이연** (스펙 지시: "#271 범위에서 한 줄로 고쳐지면 고침(아니면 이연)").

## 수행 명령·로그
1. `git worktree list` — CD 작업트리 `/private/tmp/CD-work` · CI 작업트리 `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1105-CI-wt` 확인. 메인 체크아웃(~/projects/storeport · BM 브랜치 점유) 는 브랜치 전환 금지라 손대지 않음.
2. `gh pr view 261/271 --json mergeable,mergeStateStatus,headRefName,baseRefName,headRefOid,baseRefOid`
   - **#261 사전**: `mergeStateStatus=DIRTY · mergeable=CONFLICTING · baseRefOid=febd998` (main 이 29ea759 로 5커밋 앞섬)
   - **#271 사전**: `isDraft=true · mergeStateStatus=UNSTABLE · mergeable=MERGEABLE · baseRefOid=29ea759` — base 는 이미 최신
3. `cd /private/tmp/CD-work && git fetch origin main --prune && git rebase origin/main`
   - 충돌 1건: `docs/feature-map.yaml` 라인 290~338 (양쪽이 새 process 추가 · HEAD 쪽 customer-display 3종 + 62cf280 쪽 loyalty-expiry-r7). 둘 다 살려 **loyalty-expiry-r7 를 loyalty-store-credit 바로 뒤에 두고**, customer-display 3종은 그 뒤에 유지 (도메인 그룹핑 보존). 다른 3커밋(b779747·13c5003·b00fc82) 은 자동 적용.
   - 최종 4 커밋 (10fabdb·4ac7df7·b106764·9f623f8) · 9 파일 1245+ 삽입 · 코드 파일(expire/route.ts · jobs/loyalty-expiry.ts · lib/loyalty/expiry*.ts) 전부 PR 범위 그대로.
4. `git push origin feat/m0-1105-cd-loyalty-expiry --force-with-lease` → `+ b00fc82...9f623f8 (forced update)` (lease 수락).
5. 폴링 (gh --watch 금지 · 10분 상한 준수 · 25s 간격): 약 6분 뒤 두 PR 모두 pending 소진.
   - **#261 최종 jobs**: pos-integration **pass** 6m48s · unit-commerce-core **pass** 1m7s · check pass · markers-and-forbidden pass · changes-filter pass · docker-smoke-{anchor,commerce-core,wing} skipping · wrangler-check-care-agent skipping.
   - **#271 최종 jobs**: pos-integration **pass** 7m16s · unit-commerce-core **pass** 1m8s · check pass · markers-and-forbidden pass · changes-filter pass · 동일 스킵 세트.
6. `gh pr ready 271` → "ready for review" · `isDraft=false · mergeStateStatus=CLEAN · mergeable=MERGEABLE` 재확인.
7. tsc(`npx tsc -p apps/commerce-core --noEmit`) in CI 작업트리 — 보고된 에러:
   `src/api/admin/pos/orders/[id]/loyalty-info/route.ts(79,26): error TS18046: 'storeCreditModule' is of type 'unknown'.`
   → #271 diff (`git diff --stat origin/main...HEAD`) 에 해당 파일 **미포함** → 범위 이탈 → 미수정.

## 리뷰 스레드
- #261: 지시문 상 "리뷰 스레드는 이미 resolved" — 별도 조치 없음.

## PR 본문 확인(실기)
- 본 세션에서 **PR 본문/description 갱신 없음**. 두 PR 다 기존 설명 유지. #261 은 rebase 만, #271 은 draft→ready 전환.

## 미검증
- 두 PR 의 **머지 자체는 수행 금지** (상시 금지 "PR 머지 금지") — 본 세션 범위 밖. 다음 세션의 착지 소관.
- pos-integration 이 **main 에서 기존 빨강** 이었는지 교차확인은 미실측 — 두 PR 다 **pass** 이므로 M2-1105-BR 영향 없음 판단 (원인 기록 불요).
- `apps/commerce-core/src/api/admin/pos/orders/[id]/loyalty-info/route.ts:79` tsc 에러는 **잔존** — 별 티켓에서 다뤄야.

## 이연 순증감
- **+1 신규 이연**: loyalty-info route.ts:79 `TS18046` (사유: #271 범위 이탈 · 한 줄 수정 가능 · 다음 R4 후속 라운드에서 주울 것).
- **−0 해소**.

## 상시 금지 준수
- 메인 체크아웃 브랜치 전환 없음 · 자기 워크트리(CD-work·CI-wt) 외 파일 손대지 않음 · POS 결제 라우트/Admin UI/customer-display 소스 무수정 · PR 머지 안 함 · /loop·Monitor·예약깨우기·gh --watch 미사용 · 폴링 ~6분 (10분 상한 내).
