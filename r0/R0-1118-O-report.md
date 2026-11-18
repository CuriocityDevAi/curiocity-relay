#369 APPROVE · light 실행기 별도 등록 필요 O · skip 함정 X · /tmp 정리 O

## REQ 1 · 실행기 라벨 함정

**별도 runner 프로세스 등록 필요: O**

기존 `curiocity-mac` runner에 `curiocity-mac-light` 라벨만 추가하면 → 같은 runner process 1개가 light + heavy job 모두 처리 → 큐 경합 그대로. PR 본문도 "큐 경합 완전 해소는 두 번째 머신 추가 시"라고 솔직하게 명시함.

**머지 전 필수 순서 (Kyu):**
1. GitHub Settings → Actions → Runners → `curiocity-mac` → Labels → `curiocity-mac-light` 추가
2. PR 머지
3. (선택) 같은 Mac 별도 폴더에 추가 runner 프로세스 등록 → 큐 경합 완전 해소

라벨 추가 없이 머지 시 `markers-and-forbidden` / `changes-filter` / `feature-map-check` / `ci-summary` / `stale-deferred` 가 영원히 큐 대기.

## REQ 2 · /tmp 캐시 보장 및 /tmp 정리

- `build-commerce-core` + `pos-integration` 모두 `runs-on: [self-hosted, curiocity-mac]`, `needs: build-commerce-core` 순서 보장 → 현재 runner 1대 환경에서 같은 머신 순차 실행 ✓
- 미래에 `curiocity-mac` runner 2대 이상이 되면 `/tmp` 공유 보장 깨짐 (현재 OK)
- `Cleanup runner build cache` 스텝 `if: always()` 등록 → /tmp 디스크 누적 없음 ✓

## REQ 3 · paths 건너뛰기

**skip 함정: X** — main 브랜치 Branch Protection Required Status Checks 미설정(404). skip된 job이 PR을 pending 상태로 묶는 함정 없음.

- 루트 `pnpm-lock.yaml` 변경 시 `customer_display` 필터 미포함 → customer-display job skip. 그러나 이는 이 PR 이전부터 존재하던 커버리지 갭이며, `commerce_core` 필터에 root `pnpm-lock.yaml` 포함 → pos-integration은 실행됨 ✓
- ci-summary는 skipped job을 `⏭` 아이콘으로 표시하며 required check 역할이 아님 ✓

## REQ 4 · --prefer-offline lockfile 변경 PR

lockfile 변경으로 새 패키지가 추가되어도 `--prefer-offline`은 store miss 시 네트워크 fallback. `--offline`(완전 차단)이 아니므로 깨지지 않음 ✓

## 판정: APPROVE

조건: 머지 전 `curiocity-mac` runner에 `curiocity-mac-light` 라벨 추가 필수.
