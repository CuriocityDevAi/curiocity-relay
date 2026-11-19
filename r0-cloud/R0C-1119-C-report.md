#389 CHANGES · PR 코멘트 O || install 30 · unit O 31 · 통합 O 14 · 손님화면 테스트 O 3 · eslint 새 error 0 · 총 3.5분

# R0C-1119-C — R0 클라우드 실전 1호 · storeport PR #389 (M2-1119-D 손님 Skip 즉시 notify)

- 대상 HEAD: `41f06a5ea3fd1f390fb892ee8510934a05e97e4f`
- 판정: **REQUEST_CHANGES**
- PR 리뷰 제출: O. 같은 계정의 PR 이라 GitHub 이 `REQUEST_CHANGES` 이벤트를 거부함("Can not request changes on your own pull request") → **COMMENT 이벤트로 제출**하고 본문 첫 줄에 판정 CHANGES 를 명시. 머지 안 함.

## 핵심 지적
1. **[블로커]** `skipSnapshot` 에 paid 가드가 없음. `keypad-after` 화면(paid + pre_entry=false)의 Skip/Timeout → PATCH skipped → **paid → expired**. 로컬 임시 probe spec(커밋 안 함, 실행 후 삭제)으로 실측: `status=200 state_after=expired`. 고칠 방법 = `snapshot_state !== "active"` 이면 무시 + spec 케이스 추가.
2. **[권장]** `handleSkip` 이 PATCH 를 await 한 뒤에 dispatch 함 → fetch 에 timeout 이 없어서 응답이 늦으면 화면이 멈춤. 주석 내용과 실제 순서가 다름. 연타하면 PATCH 가 여러 번 나감.
3. **[확인]** `onTimeout` 도 서버 skip 을 보냄. Kyu 결정의 범위 확인 필요.
4. **OK**: 인증(토큰 없음/잘못된 토큰 → 401, 계산대 소유권 검사가 skip 분기 전에 있음) · 연결된 스냅샷 무시.

## 단계별 시간 (초)
| 단계 | 결과 | 초 |
|---|---|---|
| clone/fetch PR (기존 체크아웃 재사용 + fetch) | O | 1 |
| pnpm install --frozen-lockfile | O | 30 |
| commerce-core unit | O 47 suites / 539 tests | 31 |
| PG 기동 + 비번 설정 | O | ~3 |
| 통합 `it.sh cd-snapshot-skip` | O 3/3 | 14 |
| 임시 probe (paid·auth) | paid→expired ✕ / auth 401 ✓ | 12 |
| customer-display vitest | O 12 files / 197 tests | 3 |
| eslint src/ (commerce-core) | 0 errors · 13 warnings | 2 |
| 리뷰 제출 포함 총 | | ~210 |

## 메모
- `~` = /root. `/home/claude/storeport` 와 `curiocity-relay` 는 이미 체크아웃돼 있어서 clone 대신 fetch 로 재사용함.
- 앞으로 자기 PR 리뷰는 COMMENT 로 고정하거나, 별도 리뷰 계정/App 토큰을 써야 APPROVE/REQUEST_CHANGES 를 실제로 걸 수 있음.
