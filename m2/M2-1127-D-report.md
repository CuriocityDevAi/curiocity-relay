# M2-1127-D 리포트

**PASS** · 커밋 `ea31e8c` · CI 전체 초록

## ci-summary

| 워크플로 | 결과 | 시간 |
|---|---|---|
| `.github/workflows/ci.yml` (pull_request) | ✅ success | 17m 0s |
| `feature-map-check` | ✅ pass | 31s |
| `markers-and-forbidden` | ✅ pass | 21s |
| `changes-filter` | ✅ pass | 18s |
| `route` | ✅ pass | 17s |
| `heavy-mac` | ✅ pass | 15m 11s |
| `heavy-cloud` | ⏭ skipping | (zero-cloud 정책) |

## CI 미시작 원인

**원인**: `ci.yml` heavy-mac 잡의 `env:` 블록에 `${{ 5173 + (github.run_id % 1000) }}` — GitHub Actions 표현식은 산술 연산자(`+`, `%`)를 미지원. 워크플로 파싱 단계에서 "workflow file issue" → 0s fail. #467 (`M2-1126-U`) 머지(2026-11-26 17:27) 이후 main 전체 + main에서 분기한 이 브랜치 모두 동일 증상. **이 PR 고유 문제 아님 — main과 이후 모든 PR 에 영향.** 

**수정**: `env:` 블록 제거 → `Set CI_VITE_PORT` 스텝으로 대체:
```bash
echo "CI_VITE_PORT=$((5173 + (GITHUB_RUN_ID % 1000)))" >> "$GITHUB_ENV"
```
bash `$(( ))` 산술 사용 — GITHUB_RUN_ID는 GitHub Actions 런타임이 항상 제공.

## 주문내역 화면 변경

### 변경 전 → 변경 후

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 번호 표시 | `Order #1042` (display_id · 긴 번호 · 텍스트) | `#7` 칩 (pos_order_num · 짧은 번호 · PosChipBadge) |
| 위치 | 헤더 행 인라인 | 절대 위치 우상단 (다른 CD 화면과 동일) |
| testID | `order-list-order-no` | `pos-chip-badge` |

**pos_order_num 없는 경우**: PosChipBadge가 `null` 반환 → 칩 미표시 (다른 CD 화면과 동일 규칙).

### 변경 후 스크린샷

`#7` 칩이 우상단에 표시, `Order #1042` 없음:

![order-list 변경 후](order-list-after.png)

> 스크린샷: `apps/customer-display/screenshots/cd-sync/order-list-building-none.png` (Playwright e2e 생성)

## 보존 테스트 로그

```
Running 1 test using 1 worker

✓  1 e2e/cd-sync-flow.spec.ts:59:3 › CD Sync Flow Screens
     › CD-CHIP-ORDERNUM — pos-chip-badge shows #N · no raw display_id (355ms)

1 passed (1.1s)
```

## 검증의 검증 (임시 되돌림 → 빨강 확인)

OrderListScreen을 임시로 `Order #1042` display_id 텍스트로 되돌린 뒤 테스트 실행:

```
✗  1 e2e/cd-sync-flow.spec.ts:59:3 › CD Sync Flow Screens
     › CD-CHIP-ORDERNUM — pos-chip-badge shows #N · no raw display_id

      74 |     await expect(chip).toHaveText(/#\d{1,2}/);
      75 |     // Long display_id (1042) must NOT appear on this screen

1 failed
```

→ 되돌린 상태에서 정상 빨강 확인. PosChipBadge 복원 후 초록 복원.

## spec-guard-cd audit 결과

```
16/17 OK · 0 FAIL · 1 WARN(todo: CD-STATE-FROM-SNAPSHOT)
[audit] ✅ 통과
```

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `.github/workflows/ci.yml` | env 블록 제거 → Set CI_VITE_PORT 스텝 |
| `apps/customer-display/src/screens/OrderListScreen.tsx` | PosChipBadge 교체, display_id 제거 |
| `apps/customer-display/e2e/cd-sync-flow.spec.ts` | CD-CHIP-ORDERNUM 테스트 내용 형식 검증 강화 |
| `scripts/spec-guard-cd-map.json` | testids: `pos-chip-badge` 갱신 |

## PR 본문 Kyu 확인 항목

손님 화면 주문내역 구석에 `#7` 같은 짧은 칩 번호가 보이고 `Order #1042` 같은 긴 번호는 안 보임.
