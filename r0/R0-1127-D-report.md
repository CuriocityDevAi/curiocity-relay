# R0-1127-D 리뷰 리포트

storeport#472: APPROVE (CI 전체 초록 · actionlint 직접 실행 exit 0)
storeport#470 사후: 문제 없음

---

## storeport#472 — workflow-lint.yml 검사

### CI 현황 (gh pr checks 472 실행)
```
heavy-mac             pass  2m34s
heavy-cloud           skipping
actionlint            pass  18s
changes-filter        pass  17s
check                 pass  25s
markers-and-forbidden pass  22s
route                 pass  18s
```
모든 체크 실제 실행 후 성공. not started / pending 없음.

### REQ 1a — ci.yml 독립성
`workflow-lint.yml` 은 완전히 별도 파일. ci.yml 과 공유하는 `needs:` 없음.
ci.yml 이 깨져도 workflow-lint 는 독립 실행된다. ✅

### REQ 1b — 트리거 · 러너
- 트리거: `push: [main] paths: .github/**` + `pull_request paths: .github/**` + `workflow_dispatch` ✅
- 러너: `runs-on: [self-hosted, curiocity-mac-light]` 고정. ubuntu-latest 0 ✅

### REQ 1c — actionlint 설치 재현성
- 1순위: `command -v actionlint` → PATH 의 Homebrew 사용. 로컬 확인: `/opt/homebrew/bin/actionlint 1.7.12` 상주 ✅
- 폴백: 고정 버전 1.7.12 직접 다운로드 → `/tmp/actionlint` (darwin/arm64 · amd64 분기) ✅
- `/tmp/` 는 런 간 비영속 → 폴백 시 매 실행 재다운로드. iMac runner Homebrew 상주로 실질 문제 없음.
  차후 runner 교체·초기화 시 `brew install actionlint` 를 셋업 절차에 포함 권고.

### REQ 1d — 검증의 검증 실행 기록 (gh pr checks 471 실행)
```
actionlint  fail  18s  → https://github.com/CuriocityDevAi/storeport/actions/runs/45943799349/job/140323791792
check       pass  23s
```
PR #471 (broken expression `${{ 5173 + (github.run_id % 1000) }}` 되살림) → actionlint 빨강 ✅
검증의 검증 직접 Actions 기록 확인 완료.

### REQ 1e — 현재 main 워크플로 전체 lint (직접 실행)
```
# PR #472 head 체크아웃 후 실행
actionlint -shellcheck "" .github/workflows/*.yml
EXIT_CODE=0
```
경고 0건, 오류 0건. 추가로 잡히는 경고 없음. ✅

### REQ 1f — 필수 체크 등록 권고
**등록 권고.** 단 `.github/**` path filter 로 인해 비-github PR 에서 체크가 미발동 →
GitHub 기본 "Required status checks" 설정 시 non-.github PR blocking 발생.

권장: **Repository Rulesets → "Require status checks to pass" + "Status check is required only when present"**
→ `.github/**` PR 에서만 필수, 나머지 PR 은 blocking 없음.

### PR 코멘트
https://github.com/CuriocityDevAi/storeport/pull/472#issuecomment-7210528835
(자기 PR APPROVE API 차단 → 코멘트로 APPROVE 판정 기록)

---

## storeport#470 사후 확인 (머지 d5248b4)

### REQ 2a — OrderListScreen `#N` 칩

**컴포넌트**: `PosChipBadge` — 다른 CD 화면(CartScreen, QrisScreen, KeypadScreen) 과 동일 컴포넌트 ✅

**위치 비교** (`grep -rn "PosChipBadge" apps/customer-display/src/` 실행):
```
CartScreen.tsx:71       <PosChipBadge orderNum={snapshot.pos_order_num} />
QrisScreen.tsx:171      <PosChipBadge orderNum={snapshot.pos_order_num} />
OrderListScreen.tsx:53  <PosChipBadge orderNum={snapshot?.pos_order_num} />
KeypadScreen.tsx:135    <PosChipBadge orderNum={summary?.pos_order_num} />
KeypadScreen.tsx:320    <PosChipBadge orderNum={summary?.pos_order_num} />
```
OrderListScreen 과 Cart/Qris 모두 root View 직속 첫 자식 위치에 삽입. PosChipBadge 는 `position: "absolute", top: 12, right: 12, zIndex: 20` → 절대 위치 배지이므로 DOM 순서는 무관. 위치 동일 ✅

**pos_order_num 없을 때**: `PosChipBadge` 컴포넌트 내부: `if (orderNum == null) return null` — 렌더 없음. 다른 화면과 완전 동일 동작 ✅

**다른 요소 폰트 크기** (`git show origin/main:apps/customer-display/src/screens/OrderListScreen.tsx` 확인):
- 품목(itemTitle/qtyText/itemPrice): 22px ✅ 변경 없음
- 소계 라벨: 20px ✅ 변경 없음
- 합계(totalText): 45px ✅ 변경 없음
- diff 에서 삭제된 것: `orderNo` 스타일(fontSize: 18, 구 `Order #display_id` 텍스트용)만 삭제됨. 다른 요소 그대로 ✅

### REQ 2b — `Set CI_VITE_PORT` 스텝 (M2-1126-U 목적 유지)

변경 전:
```yaml
env:
  CI_VITE_PORT: ${{ 5173 + (github.run_id % 1000) }}   # GitHub 표현식 산술 미지원 → 항상 오류
```
변경 후:
```yaml
- name: Set CI_VITE_PORT
  shell: bash
  run: echo "CI_VITE_PORT=$((5173 + (GITHUB_RUN_ID % 1000)))" >> "$GITHUB_ENV"
```
bash `$(( ))` 산술로 `CI_VITE_PORT` 를 `$GITHUB_ENV` 에 등록 → 이후 heavy-steps 에 환경변수 전달.
포트 충돌 방지 목적(M2-1126-U) 완전 유지. 이전 `env:` 블록 방식은 GitHub 표현식 파서 오류로 실제 작동 안 했음; 이 수정으로 목적이 처음으로 올바르게 달성됨 ✅

### REQ 2c — 사후 수정 필요 항목
없음. 문제 없음.

---

## 실행 명령 목록

| 명령 | 결과 |
|------|------|
| `gh pr checks 471` | actionlint fail 18s / check pass 23s 확인 |
| `gh pr checks 472` | 전체 7개 체크 pass/skipping 확인 |
| `git fetch origin refs/pull/472/head:pr-472-head` | PR head 취득 |
| `actionlint -shellcheck "" .github/workflows/*.yml` | EXIT_CODE=0 · 경고 0건 |
| `grep -rn "PosChipBadge" apps/customer-display/src/` | 5개 사용처 위치 확인 |
| `git show origin/main:apps/customer-display/src/components/PosChipBadge.tsx` | null 처리 확인 |
| `git show origin/main:apps/customer-display/src/screens/OrderListScreen.tsx` | 폰트 크기 확인 |
| GitHub MCP `pull_request_read` (#472, #470) | PR 본문·diff 확인 |
| GitHub MCP `add_issue_comment` (#472) | APPROVE 코멘트 게시 |
