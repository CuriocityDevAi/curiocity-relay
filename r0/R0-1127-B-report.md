relay#62: CHANGES (필수 1건) · CI 없음(relay no-CI 리포)
storeport#470: APPROVE (필수 수정 0건) · CI feature-map-check ✅ · ci.yml ⏳ pending(미시작)

---

## relay#62 (M0-1127-B — ci-watch v1.19)

### CI 요약
relay는 no-CI 리포 — check runs 0건. `get_status` 결과: `state: 'pending'`, `total_count: 0` (정상).

### 판정: CHANGES (필수 1건)

#### a. 실제 렌더 확인
실행: `buildExtendedView({ repoRoot, skipFetch:true, skipGh:true })` — worktree R0-1127-B(bb25dd01f)

- M2-1127-A: `m2 review` 칸 — 줄 제목 "방법론 리포 HISTORY.md 채우기 — 만난 오류 → 원인 → 고친 규칙 역추적" ✅ (M2-1127-A.md 첫 줄 괄호 요지 일치)
- M2-1127-B: `m2 review` 칸 — 줄 제목 "방법론 리포 01~09 본문을 11-27 현재 운영에 맞게 갱신" ✅ (M2-1127-B.md 첫 줄 괄호 요지 일치)
- 두 카드 모두 `ci_pending` 아님 → 거짓 경보 없음 ✅
- 조회 실패 빨강 없음 ✅

#### b. 미등록 리포 부작용 — ❌ 필수 수정

`scripts/watch/ci-watch-render.mjs` (line ~1012):
```javascript
if (level === 'red' && c.reason) {  // reason은 red일 때만 표시
```
미등록 리포 카드 `card.reason = '미등록 리포(CI 건너뜀)'` 는 `yellow`/normal level로 `review` 칸 표시 — **화면에 visual indicator 없음**.

새 제품 리포를 `search_repos`에 추가하지 않으면 CI가 조용히 건너뜀. 명세 기준 "조용히 건너뛰면 위험 · 표시가 있어야 함" 위반.

수정: 진행 중 줄 렌더(~line 985~1016)에서 `c.predicted && c.reason?.includes('미등록')` 조건으로 `(?)` 접미사 또는 색 표시 — `no_ci_repos` 명시 등록과 unregistered 실수 누락을 시각 구분.

#### c. runner-config.json `ci_watch` 섹션 — 러너 동작 무영향 확인
실행: `grep -n "CONFIG_FILE\|loadConfig\|ci_watch" scripts/hub-runner-v8.3.mjs`

`loadConfig()` (line 1090)는 `raw.hubs`, `raw.reportPath`, `raw.selfUpdate`, `raw.model`, `raw.claude_bin`, `raw.display`, `raw.cmux_bin`, `raw.run_timeout_min`, `raw.heartbeat_min`, `raw.kyu_watch_dirs` 만 읽음. `ci_watch` 키 완전 무시 ✅

#### d. 테스트 실행
```
$ cd ~/projects/curiocity-relay-wts/R0-1127-B
$ node --test scripts/test/ci-watch-spec-guard.test.mjs
  7 passed · 0 failed

$ node --test scripts/test/ci-watch-w119.test.mjs
  12 passed · 0 failed

$ node --test scripts/test/*.test.mjs
  494 passed · 0 failed
```
CW-HEAD · CW-HUBQ · CW-CIQ · CW-PROG · CW-DONE · CW-ALERT · CW-RENDER · CW-VERSION 보존 요소 모두 일치 ✅

#### e. relay#60 충돌 지점
- `scripts/watch/sources-local.mjs`: relay#60(`runnersAll` 경로 line ~36) vs 이 PR(`readQueueTitle` line ~188 · `readCiWatchConfig` line ~335) → **git 충돌 없음** (다른 위치)
- `scripts/ci-watch.mjs`: **충돌 위험** — relay#60은 `1.15 → 1.17` 변경, main은 현재 `1.18/1.19`. relay#60 rebase 시 `CI_WATCH_VERSION` 상수 충돌 발생 (이 PR과 무관, relay#60 독립 처리)
- `scripts/hub-runner-v8.3.mjs`, `sources-git.mjs`: 이 PR 미수정 → 충돌 없음

PR 코멘트: https://github.com/CuriocityDevAi/curiocity-relay/pull/62#issuecomment-7209179421

---

## CD-CHIP-ORDERNUM 판정 (별도 절)

### 사실
**구현**: `apps/customer-display/src/screens/OrderListScreen.tsx:46,65`
```typescript
const displayId = snapshot?.display_id;  // line 46
// ...
<Text testID="order-list-order-no" style={[styles.orderNo, { color: t.muted }]}>
  Order #{displayId}  // line 65 — display_id = 1042 형태
</Text>
```

**명세 (relay specs/screens/customer-display.md:30)**:
> `#N` 단일 칩 · 긴 Order display_id 2중 관리 금지 · N 은 매장별 1~99 순환

### 근거
- CartScreen.tsx:71, QrisScreen.tsx:171, KeypadScreen.tsx:135/320 → 모두 `PosChipBadge orderNum={snapshot.pos_order_num}` 사용 ✅
- **OrderListScreen.tsx:65 만** `Order #{displayId}` 텍스트(display_id 직접 사용) — `PosChipBadge` 미사용 ❌
- `snapshot.pos_order_num` 필드 타입 정의 존재 (`order-snapshot.ts:206`)
- M0-1126-Q(#465) 로 서버 `pos_order_num` 1~99 발급 기능이 main에 머지됨에도 CD OrderListScreen은 미반영

### 판단
M2가 `docs/spec-guard/cd-element-inventory.md`에 정확히 문서화. 이 PR의 범위는 testID 추가 + spec-guard 파이프라인이며, 불일치 수정은 별도 발부 사항. 고치지 않는 것이 옳음.

스크린샷 경로: 미실행 (e2e 환경 없음)

---

## storeport#470 (M2-1127-C — 손님 화면 spec-guard 자동화)

### CI 요약
PR 코멘트(ci-summary): feature-map-check ✅ 26s · ci.yml ⏳ not started
→ CI 실패 없음. pending 상태로 머지 차단 없음 확인.

### 판정: APPROVE (필수 수정 0건)

#### a. `continue-on-error: true` 분석
```yaml
# .github/actions/heavy-steps/action.yml (PR 추가 단계)
- name: spec-guard-cd
  id: spec_guard_cd
  continue-on-error: true
  run: node scripts/spec-guard-cd-audit.mjs

# 최종 집계 단계 (always())
[ "${{ steps.spec_guard_cd.outcome }}" = "failure" ] && FAILED="$FAILED spec-guard-cd"
if [ -n "$FAILED" ]; then exit 1; fi
```

- spec-guard 실패 → outcome=failure → 집계 exit 1 → 잡 실패 → PR 차단 ✅
- "live인데 testid·테스트 둘 다 없음"(`todo:false`) → `exit 1` → PR 차단 ✅
- `continue-on-error:true` 역할: 후속 스크린샷 업로드 단계 허용용. 명세 취지 충족.
- **필수/권고 구분**: 현 설계로 "live 미커버" 차단 보장 → 필수 충족. 권고 없음.

#### b. CD-CHIP-ORDERNUM (위 CD-CHIP-ORDERNUM 판정 절 참조)

#### c. 17개 ID coverage 확인
레이아웃 룰 7 상태 조합, 키패드 세부(Del 포함), Confirm(Yes+Change), First visit(Continue+Change), Earned — 모두 커버 ✅

ID 없는 승인 요소(테스트 미검증):
- 레이아웃 전환 애니메이션 (미실행 가능)
- 문구 기본 언어 English
- CD-ORDER-LIST 폰트 크기 (명세 32px/64px · 구현 22px/45px · M1-1126-B 70% 축소 · testID 미검증)
- CD-CHIP-ORDERNUM 내용 형식 (#N vs Order #N · testID만 존재 확인)
- CD-STATE-FROM-SNAPSHOT 통합 테스트 (`todo:true` · 다음 라운드)

#### d. 검증 직접 실행

```bash
# main 상태 (PR 미적용) — testID 없음 확인
$ node scripts/spec-guard-cd-audit.mjs
→ CD-CHIP-ORDERNUM: ⚠️ testID 없음 · 15 OK · 0 FAIL · 2 WARN · exit 0

# PR 브랜치 적용 (OrderListScreen + testids + map + e2e)
$ node scripts/spec-guard-cd-audit.mjs
→ 16 OK · 0 FAIL · 1 WARN(CD-STATE-FROM-SNAPSHOT todo:true) · exit 0
```

- testID `order-list-order-no` 추가: 스타일/레이아웃 무변경 ✅ (Text 태그에 testID prop만 추가)
- 보존 테스트 렌더 기반 (Playwright `page.getByTestId().toBeVisible()`) ✅
- maxTodo: 현재 1개 ≤ 상한 2 ✅
- 검증의 검증 1회 실행 완료 ✅

PR 코멘트: https://github.com/CuriocityDevAi/storeport/pull/470#issuecomment-7209186321

---

## 직접 실행 명령 목록

| 명령 | 결과 |
|------|------|
| `gh pr view 62 --repo CuriocityDevAi/curiocity-relay` | PR HEAD bb25dd01f 확인 |
| `gh pr view 470 --repo CuriocityDevAi/storeport` | PR HEAD 1ff34815 확인 |
| relay#62 get_check_runs | total_count: 0 (no-CI 리포 정상) |
| storeport#470 get_comments | ci-summary: feature-map-check ✅ · ci.yml ⏳ |
| `git worktree add ~/projects/curiocity-relay-wts/R0-1127-B origin/feat/M0-1127-B-ci-watch-false-alarm` | 체크아웃 성공 |
| `node --test scripts/test/ci-watch-spec-guard.test.mjs` | 7/7 pass |
| `node --test scripts/test/ci-watch-w119.test.mjs` | 12/12 pass |
| `node --test scripts/test/*.test.mjs` | 494/494 pass |
| `buildExtendedView({ skipFetch:true, skipGh:true })` | inProgress 56건 · M2-1127-A/B = review 칸 확인 |
| `grep -n "loadConfig\|ci_watch" scripts/hub-runner-v8.3.mjs` | ci_watch 키 미사용 확인 |
| `node scripts/spec-guard-cd-audit.mjs` (main 상태) | 15 OK · 2 WARN · exit 0 |
| `node scripts/spec-guard-cd-audit.mjs` (PR 적용) | 16 OK · 1 WARN · exit 0 |
| `gh pr view 60 --files` | relay#60 diff 확인 → 충돌 지점 분석 |
