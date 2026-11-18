#296 CHANGES · CI 364 all-pass(pending) · 296 check-FAIL(feature-map) · 353 all-pass(pending) · 365 all-pass(pending)

---

## REQ 1 — #296 `apps/commerce-core/scripts/it.sh` 리뷰

### DROP DATABASE 안전성
- `DB_DATABASE` 는 `export DB_DATABASE="storeport_ci_${_RUN_ID}"` 로 무조건 덮어씀 → 외부 환경변수 개입 불가.
- `_cleanup_db` 는 `DROP DATABASE IF EXISTS ${DB_DATABASE}` 만 실행 → 항상 `storeport_ci_<ts>` 형태.
- **결론: 진짜 DB를 지울 경로 없음. 안전.**

### trap 정리
- `trap _cleanup_db EXIT` 가 `CREATE DATABASE` 이후 줄에 위치.
- CREATE 성공 후 trap 등록 사이에 스크립트가 종료되면 DB가 남음(가능성 극히 낮지만 이론적).
- 권장: trap을 CREATE 직전에 이동하면 완전.
- **현재 동작엔 문제 없음.**

### 패턴 인자 처리
- `PATTERN="${1:-}"` → `[[ "$s" == *"$PATTERN"* ]]` : `[[ ]]` 내부 glob 비교, 셸 인젝션 없음.
- 패턴 미매칭 시 `exit 1` + 후보 목록 출력 → UX 양호.

### 로컬 1 spec 실행 (`orders-list`)
```
bash scripts/it.sh orders-list
▶ DB: storeport_ci_983888894
PASS integration-tests/pos/orders-list.spec.ts (39.68 s)
  9 passed, 9 total
```
✅ **9/9 PASS, DB 생성·삭제 정상.**

### 판정: **CHANGES**
- 스크립트 로직·안전성은 문제 없으나, CI `check` 잡이 **feature-map-check 실패** (exit=1).
- 원인: `apps/commerce-core/scripts/it.sh` 파일이 feature-map 에 등록되지 않음 (scanned 3개 · unmatched 1개).
- `package.json` · `docs/runbooks/local-integration.md` 는 이미 매칭됨.
- 수정: feature-map 에 `apps/commerce-core/scripts/it.sh` 경로를 `M1-1116-H` 피처에 등록.

---

## REQ 2 — `gh pr checks` 결과

### PR 364
| job | 결과 |
|-----|------|
| check | ✅ pass |
| changes-filter | ✅ pass |
| markers-and-forbidden | ✅ pass |
| build-commerce-core | ⏳ pending |
| unit-commerce-core | ⏳ pending |
| customer-display | ⏳ pending |
| e2e-admin-loyalty | ⏳ pending |
| wrangler-check-care-agent | — skipping |

**요약: 3 pass · 4 pending · 0 fail.** check 통과, 아직 CI 진행 중.

---

### PR 296 (it.sh PR)
| job | 결과 |
|-----|------|
| **check** | ❌ **fail** |
| changes-filter | ✅ pass |
| markers-and-forbidden | ✅ pass |
| build-commerce-core | ⏳ pending |
| unit-commerce-core | ⏳ pending |
| customer-display | ⏳ pending |
| e2e-admin-loyalty | ⏳ pending |
| wrangler-check-care-agent | — skipping |

**원인: feature-map-check** — `apps/commerce-core/scripts/it.sh` 가 feature-map 미등록.
- 이 PR 변경으로 인한 실패(원래 깨진 것 아님). 다른 PR(353·364·365) 모두 check pass.
- 다른 CI 잡은 아직 미완료. pos-integration 5 spec / refund import 기존 실패 무관.

---

### PR 353
| job | 결과 |
|-----|------|
| check | ✅ pass |
| changes-filter | ✅ pass |
| markers-and-forbidden | ✅ pass |
| build-commerce-core | ✅ pass |
| unit-commerce-core | ✅ pass |
| pos-integration | ⏳ pending |
| customer-display | ⏳ pending |
| e2e-admin-loyalty | ⏳ pending |
| wrangler-check-care-agent | — skipping |

**요약: 5 pass · 3 pending · 0 fail.** build·unit 완료, pos-integration 진행 중.

---

### PR 365
| job | 결과 |
|-----|------|
| check | ✅ pass |
| changes-filter | ✅ pass |
| markers-and-forbidden | ✅ pass |
| unit-commerce-core | ✅ pass |
| build-commerce-core | ⏳ pending |
| customer-display | ⏳ pending |
| e2e-admin-loyalty | ⏳ pending |
| wrangler-check-care-agent | — skipping |
| pos-integration (표시) | ~~❌~~ 취소된 이전 run 잔상 |

**요약: 4 pass · 3 pending · 실질 fail 없음.**
- `pos-integration fail` 은 run 44248510643 (취소)에서 비롯된 stale 결과.
- 최신 run 44248654149 에는 pos-integration 미예약 (build 완료 후 대기 예정).
