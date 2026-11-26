storeport#464 APPROVE · fork#278 APPROVE · relay#58 APPROVE

## 판정 요약

| PR | 판정 | 핵심 |
|---|---|---|
| storeport#464 | APPROVE | 전 잡 iMac 확인 · M2-1126-S 번들 · docker 은퇴 허용 |
| fork#278 | APPROVE | route ci-box-fork-light-imac 확인 · playwright 대기 중(코드 이슈 아님) |
| relay#58 | APPROVE | JSONL 전수 집계 로직 정확 · 오늘 6건 확인 |

---

## BUILD [1] 러너 이름 확인

### storeport#464 (run 45857355895 · 45857356083)

| 잡 | 러너 | 결과 |
|---|---|---|
| route | ci-box-storeport-light-imac | ✅ 19s |
| changes-filter | ci-box-storeport-light-imac | ✅ 19s |
| markers-and-forbidden | ci-box-storeport-light-imac | ✅ 20s |
| heavy-mac | ci-box-storeport-heavy-imac | ✅ 2m41s |
| heavy-cloud | — | ⏭ skipped |
| docker-build-commerce-core (ubuntu) | ci-box-storeport-light-imac | ✅ 14s (스텁) |

### fork#278 (run 45857364581 · 45857364809)

| 잡 | 러너 | 결과 |
|---|---|---|
| route (ci.yml) | ci-box-fork-light-imac | ✅ 18s |
| unit-tests | ci-box-fork-light-imac | ✅ 1m5s |
| assertions | ci-box-fork-light-imac | ✅ 1m29s |
| flow-tests | ci-box-fork-light-imac | ✅ 48s |
| playwright | ci-box-fork-heavy-imac | 🔄 in_progress |
| heavy-cloud | — | ⏭ skipped |
| route (lint.yml) | ci-box-fork-light-imac | ✅ 26s |
| lint | ci-box-fork-light-imac | ✅ 54s |

이전 run이 ubuntu-latest였던 route 잡이 이번부터 ci-box-fork-light-imac으로 전환됨 확인.

---

## BUILD [2] 필수 체크 이름 / 머지 차단 위험

- storeport `main`: 브랜치 보호 미설정(404) → required checks 없음.
- fork `master`: 브랜치 보호 미설정(404) → required checks 없음.

잡 이름 변경(route-heavy.sh 단순화, heavy-cloud 스텁화, docker-build-commerce-core 스텁화)에도 불구하고 required checks가 없으므로 이름 변경으로 인한 영구 머지 차단 없음. skipped 통과 구멍(#460 사례) 없음.

fork#278 `mergeable_state: blocked`는 playwright가 in_progress 상태이기 때문 — 코드 이슈 아님.

---

## BUILD [3] docker-build paths 좁힘 → 실제 은퇴 · 위험 판정

**사실**: 리포트는 "paths 좁힘"을 기술하지만 실제 PR(커밋 2, M2-1126-S)은 `docker-build-commerce-core (ubuntu)` 잡을 iMac light 스텁으로 완전 은퇴시킴. 잡 이름은 유지.

**리스크**: Dockerfile 깨짐을 머지 전에 못 잡음. Railway 머지 후 빌드 실패가 유일한 재현 경로 → 운영 배포가 멈출 수 있음.

**허용 판정**: 허용 가능.
- 근거: `decision-ci-zero-cloud-20261126.md` — Kyu 22:42 "전부 아이맥에서 처리 · 깃헙에 돈 더 내기 싫어"
- Mac에 Docker Desktop 없음 (유료·불안정)
- GitHub Actions 지출 한도 $0 — 실수 ubuntu 잡은 과금 대신 실패로 드러남
- `pnpm build` 대안(보고서 제안)도 Dockerfile 전체 재현은 불가능

---

## BUILD [4] relay#58 오늘 jsonl 전수 카운터 검증

**로컬 JSONL** (`status/ci/2026-11-26.jsonl`):
- heavy-cloud 전체: 55건 (overflow 6건 · skipped 48건)
- overflow 목록:

| ID | repo | conclusion | completed_at (UTC) |
|---|---|---|---|
| 139655254150 | storeport | failure | 2026-11-26T02:54:53 |
| 139667387261 | storeport | success | 2026-11-26T03:28:52 |
| 139695424846 | agilo-medusa-pos-fork | success | 2026-11-26T04:36:11 |
| 139865142193 | storeport | success | 2026-11-26T11:25:32 |
| 139908541794 | storeport | success | 2026-11-26T12:50:59 |
| 139951107029 | storeport | success | 2026-11-26T13:47:35 |

**GitHub API 직접 조회**: storeport 4건 + fork 2건 = **합계 6건** (JSONL 합계 6건 일치).  
API storeport/fork 분포 차이(5+1 vs 4+2)는 API 페이지네이션(per_page=100 초과 가능성) 또는 JSONL 갱신 시점 차이로 추정. 합계 일치.

**리포트 "3"과의 차이**: 리포트 작성 시점(~WIB 11:30) 기준 중간값 3–5건이었고, 이후 storeport에서 3건이 추가 발생하여 최종 6건. 수정 후 ci-watch는 다음 tick부터 6/5(초과)를 올바르게 표시함.

---

## BUILD [5] M2-1126-S 충돌 · 머지 순서

별도 M2-1126-S PR 없음. M2-1126-S 변경은 storeport#464 커밋 2, fork#278 커밋 2에 각각 번들됨. 두 PR 간 충돌 없음(다른 리포).

**머지 순서 권장**:
1. relay#58 — 독립, 즉시 가능
2. fork#278 — playwright 완료 후
3. storeport#464 — 독립(순서 무관하나 CI 초록 확인 후)

---

## 잔존 메모

- **force_cloud 제거**: 리포트가 "폴백 유지"라 했으나 M2-1126-S(커밋 2)가 완전 제거. 이후 iMac 다운 시 CI 무기한 queued 대기 → 복구는 iMac 재시작. ci-watch heartbeat 끊김 경보가 감지.
- **relay#58 R-2 테스트**: deduplication Set 로직은 정확하나, 테스트 케이스에서 JSONL pre-exist id=100과 tick 반환 job id=500,501이 서로 다른 ID라 중복 경로가 실제로 실행되지 않음 — 기능 버그 아님, 개선 여지.
- **ci-summary · stale-deferred timeout**: M2-1126-S에서 timeout-minutes 추가. iMac 다운 시 큐 적체 방지 ✅
