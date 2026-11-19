#387 APPROVE · #369 충돌 X · fork #197 APPROVE · 이름 일치 O · 루프 위험 X

---

## REQ 1: #387 × #369 충돌 여부

- **결론: 충돌 X** — `gh api graphql mergeable: MERGEABLE`
- #387 branch (`ci/M2-1119-C-summary`)는 머지 베이스 `5e4306c`에서 분기; 베이스·브랜치 모두 `runs-on: ubuntu-latest`(변경 없음)
- #369 (dfa7788, 02:04Z 머지)가 main에 `runs-on: [self-hosted, curiocity-mac-light]` 적용
- 3-way 머지: ancestor=ubuntu-latest / main=curiocity-mac-light / #387=ubuntu-latest(미변경)  
  → git이 main 측 변경 `curiocity-mac-light` 자동 채택 ✅ (오버라이트 없음)
- 단, 브랜치가 main보다 **71 commits 뒤처짐** (`mergeStateStatus: UNSTABLE`); 머지 전 rebase 권장 (runs-on은 rebase 후 curiocity-mac-light로 자동 반영)

---

## REQ 2: 댓글 upsert / fork PR 안전성 / permissions / 실행기

### #387 (storeport)
| 항목 | 결과 |
|------|------|
| upsert 마커 | `<!-- ci-summary -->` 첫 줄 + `startswith("<!-- ci-summary -->")` 검색 → PATCH/POST 분기 ✅ |
| fork PR 실패 | `if: head_repository.full_name == github.repository` guard 존재; 외부 fork 에서 ci-summary 불기동 ✅ |
| permissions | `checks: read` · `pull-requests: write` · `actions: read` — 최소 ✅ |
| 실행기 | 브랜치: `ubuntu-latest`; 머지 후 3-way 자동 → `[self-hosted, curiocity-mac-light]`(light) ✅ |

### fork #197 (agilo-medusa-pos-fork)
| 항목 | 결과 |
|------|------|
| upsert 마커 | 동일 — `<!-- ci-summary -->` 첫 줄 + startswith 검색 ✅ |
| fork PR 실패 | 동일 guard; fork 내부 PR만 처리 ✅ |
| permissions | `checks: read` · `pull-requests: write` · `actions: read` — 최소 ✅ |
| 실행기 | `ubuntu-latest` ✅ |

---

## REQ 3: 트리거 워크플로 이름 일치

### storeport (#387)
| 트리거 | 실제 `name:` | 일치 |
|--------|-------------|------|
| `"ci"` | `name: ci` | ✅ |
| `"docker-smoke"` | `name: docker-smoke` | ✅ |
| `"linux-check"` | `name: linux-check` | ✅ |
| `"feature-map-check"` | `name: feature-map-check` | ✅ |

### fork (#197)
| 트리거 | 실제 `name:` | 일치 |
|--------|-------------|------|
| `"CI"` | `name: CI` | ✅ |
| `"Lint"` | `name: Lint` | ✅ |

**전체 일치 O**

---

## REQ 4: 무한 루프 위험

- #387 트리거 목록: `ci`, `docker-smoke`, `linux-check`, `feature-map-check` — `ci-summary` 없음 ✅
- #197 트리거 목록: `CI`, `Lint` — `ci-summary` 없음 ✅

**루프 위험 X**

---

## 종합

| PR | 판정 | 비고 |
|----|------|------|
| storeport #387 | **APPROVE** | 71 commits 뒤처짐, 머지 전 rebase 권장(runs-on 자동 처리됨) |
| fork #197 | **APPROVE** | 신규 파일, 충돌 없음 |
