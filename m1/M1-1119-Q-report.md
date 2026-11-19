storeport #394 · main 머지 O · 무관 파일 제거 O · cancel ubuntu O · 권한 최소 O · force_cloud 초록 X https://github.com/CuriocityDevAi/storeport/actions/runs/44522630549

## M1-1119-Q 작업 결과

### REQ1 — origin/main 머지 · CI 무관 파일 제거 ✅

- `store-day-rehearsal.spec.ts` add/add 충돌 → `git checkout --theirs` 로 main 버전 채택
- `helpers.ts` comment 변경 → `git checkout origin/main --` 로 복원
- `native-diff.mjs/sh/test.mjs` → 머지로 main 버전 복원
- `git diff --stat origin/main` : `.github/*` · `docs/*` 만 남음 ✓

### REQ2 — cancel-on-close: ubuntu-latest ✅

- `cancel-on-close.yml` `runs-on: [self-hosted, curiocity-mac-light]` → `runs-on: ubuntu-latest`
- 커밋: `dd9672b`

### REQ3 — 권한 최소화 ✅

- `ci.yml` 최상위 → `permissions: contents: read` 만 (pull-requests:write · actions:read 제거)
- `changes-filter` job 레벨 → `contents: read` + `pull-requests: read` (dorny/paths-filter)
- `route` job 레벨 → `contents: read` + `actions: read` (_cloud_today API) + `pull-requests: write` (라벨)
- 커밋: `dd9672b` → `4a526f3` → `f22b83b`

### REQ4 — busy 폴백 문서화 ✅

`route-heavy.sh` `_runner_busy()` 함수 상단에 주석 추가:
- 1차(Primary): `/actions/runners` API `.busy` 필드 (Mac heavy 한정)
- 2차(Fallback): `heavy-mac` job `in_progress` 존재 여부로 판정
- 실측 (run 44516367083): light 러너 offline → runners API empty → Fallback 경로
- PR 본문 `[REQ4]` 섹션에도 표로 문서화
- 커밋: `dd9672b`

### REQ5 — force_cloud ubuntu pos-integration 초록 ❌ (quota 초과)

오늘(WIB 2026-11-19) heavy-cloud 집계 7/5 초과:
- 오전부터 ci/M2-1119-J-one-heavy 에서 테스트용 취소 run 5개 (44521885838 · 44521374783 · 44521060527 · 44520977623 · 44516367083) → cancelled 결론이므로 "skipped 아닌" 집계에 포함
- 이전(WIB 기준 오늘) run 2개: 44484170880 · 44483264552
- 합계 7 ≥ 5 → `force_cloud: quota exceeded 7/5 → self-hosted`

추가 적용 사항:
- light 러너 오프라인 시 force_cloud dispatch 가 막히는 문제 발견 → markers-and-forbidden · changes-filter · route 세 job에 `force_cloud=true` 시 `ubuntu-latest` fallback 적용 (`fromJSON` 조건식)
- job 레벨 `permissions:` 에서 `contents: read` 누락 → checkout 실패 → 수정 완료
- route job의 `actions: read` 누락 → `_cloud_today()` API 실패 → 수정 완료

마지막 run URL: https://github.com/CuriocityDevAi/storeport/actions/runs/44522630549
(heavy-mac: success, heavy-cloud: skipped by quota)

### 최종 커밋 목록

| SHA | 내용 |
|-----|------|
| 59fbf34 | merge: origin/main 머지 · CI 무관 파일 복원 |
| dd9672b | [REQ2/3/4] cancel ubuntu · 권한 최소 · busy 폴백 문서 |
| 21c056e | [REQ5+] force_cloud 시 light 러너 ubuntu 폴백 |
| 4a526f3 | fix: job permissions contents:read 추가 |
| f22b83b | fix: route job actions:read 추가 |

Branch: `ci/M2-1119-J-one-heavy` · PR: https://github.com/CuriocityDevAi/storeport/pull/394
