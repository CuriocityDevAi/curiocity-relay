---
round: M1-1105-I
pr:
  fork: agilo-medusa-pos-fork#38
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/38
  fork_commit: 212cc9b
outcome: chore — fork lint.yml --legacy-peer-deps 추가 · relay 자동 hubs.json 스캐너 신설 (수기 등재 제거)
kyu_checks: 0 (CI-only · 네이티브 영향 0)
---

# M1-1105-I · fork lint CI + relay hubs.json 자동 스캐너 (chore)

**일자**: 2026-11-07 · **허브**: M1 · **성격**: chore (제품 코드 0) · **승인**: 사전 "승인 없이 바로".

---

## 0. 원문 (2 건)

- **M2-1105-G §7** — fork `.github/workflows/lint.yml` 이 `--legacy-peer-deps` 없이 `npm ci` → ERESOLVE 로 install 자체가 실패 → **lint 체크 항상 빨강**.
- **방법론 ⑦ 결함** — relay `status/hubs.json` 갱신 스크립트 (외부 `K1-0915-D`) 가 허브 목록을 상수 6 개 `['k0','k1','k2','n0','t0','m0']` 로 고정 → 매 리빌드마다 **m1~m3 · r0 등 비등재 허브 삭제** (diff `-28/+8`). 수기 등재는 자동 쓰기 때 다시 삭제되는 악순환.

---

## 1. 산출물

### fork (PR #38)
| 파일 | 변경 |
|------|------|
| `.github/workflows/lint.yml` | `npm ci` → `npm ci --legacy-peer-deps` · 주석으로 사유 명시 (ci.yml 과 동형). |

**제품 코드 0.** install 성공만 담당 · lint 자체는 PrinterRow prettier 2건 (M2-1105-C · 별건) 때문에 red 유지 → PR body 에 별건 명시.

### relay (main 직접 커밋)
| 파일 | 변경 |
|------|------|
| `scripts/build-hubs.mjs` | **신규** · `<hub>/` 디렉터리 (`/^[a-z]\d+$/`) 자동 스캔 · 각 디렉터리의 최신 `*-report.md` frontmatter 파싱 → hubs.json 갱신. 주인 필드 (`state` · `session` · `work_dir` · `repo` · `branch` · `ci_run` · `ci_duration_s` · `open_prs_fork` · `last_round_kind` · `last_activity` · `updated_at`) 는 **기존 값 보존** · derive 가능한 필드 (`last_round` · `last_report` · `last_pr_fork` · `last_commit` · `inquiry_files`) 만 overwrite. 로그는 stderr (dry-run 시 stdout 은 pure JSON). |
| `status/hubs.json` | 신 스크립트로 재생성 (9 hubs: `k0 · k1 · k2 · m0 · m1 · m2 · m3 · n0 · t0` 전부 자동 등재). |

### 뿌리 해소 요지 (스크립트)
```ts
const HUB_DIR_RE = /^[a-z]\d+$/;  // k0, k1, k2, m0, m1, m2, m3, n0, t0, r0, ...
// 디렉터리 스캔 → latestReport frontmatter → derived { last_round, last_report, last_pr_fork, last_commit }
// 머지 전략: 주인 필드(state·session·work_dir·repo·branch·ci_*·open_prs_fork·last_round_kind·last_activity·updated_at)
//             는 기존 값 유지 (스캔으로 알 수 없음) · derived 는 새 값 제시 시 overwrite.
// 스캔 못한 기존 허브는 유지 (수동 데이터 보존 · 수동 삭제는 별도 커밋).
```

---

## 2. 검증 (실행 로그)

### fork
```
$ npm ci --legacy-peer-deps
added 1430 packages in 25s
$ npm run lint
✖ 32 problems (2 errors, 30 warnings)
   components/printer/PrinterRow.tsx:10 · :51 prettier/prettier
   (별건 · M2-1105-C 소유)
```
**Install 자체는 성공 · 이전엔 ERESOLVE 로 install 거부.** 본 PR 범위 (`npm ci` 그린) 달성.

### relay
```
$ node scripts/build-hubs.mjs --dry-run 2>/dev/null | python3 -m json.tool > /dev/null && echo "JSON OK"
JSON OK

$ node scripts/build-hubs.mjs
[build-hubs] scanned hubs (9): k0, k1, k2, m0, m1, m2, m3, n0, t0
[build-hubs] status/hubs.json rewritten (9 hubs)

$ python3 -c "import json; d=json.load(open('status/hubs.json')); print(list(d['hubs'].keys()))"
['k0', 'k1', 'k2', 'm0', 'm1', 'm2', 'm3', 'n0', 't0']
```

**m1 · m2 · m3 전부 보존** · m0/k0/k1/k2 등 "구 6개" 도 `last_round` + `last_report` 자동 derive.

---

## 3. NOTE — 외부 K1-0915-D 스크립트

외부 자동 쓰기 (`chore(status): auto (6 hubs · K1-0915-D)`) 는 여전히 작동 중이며, 다음 리빌드에 또 clobber 가능. 완전 해소를 위해선:
(a) 외부 스크립트가 본 `scripts/build-hubs.mjs` 를 호출하도록 전환, 또는
(b) 외부 스크립트 비활성화 후 relay 측 cron 으로 `build-hubs.mjs` 교체.

본 라운드는 (a)/(b) 중 선택이 K1 영역이라 **스크립트 신설까지만** 수행. 운영 전환은 K1 후속 결정 사항.

---

## 4. 규약 정합

| 규약 | 정합 |
|------|------|
| fork 브랜치 `chore/m1-1105-i-lint` · `.github/workflows/lint.yml` 1 파일 | ✓ |
| relay 변경 = `scripts/build-hubs.mjs` 신규 + `status/hubs.json` 재생성 | ✓ |
| 제품 코드 0 | ✓ (fork · relay 양쪽 모두 운영 설정/스크립트만) |
| 각각 실행 로그 | ✓ (§2) |
| 승인 없이 바로 커밋·push·PR | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 5. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (M2-1105-G §7 결함 · fork lint install 실패) |
| 보강 | +2 (relay hubs 자동 스캐너 · 수기 등재 제거 기반 마련) |
| 등재 | +1 (M2 소유 · PrinterRow.tsx prettier 2건 해소 — 후속 라운드) |
| 등재 | +1 (K1 소유 · 외부 K1-0915-D 스크립트를 본 relay 스크립트로 전환) |
| 미완 (Kyu 도장) | 0 (CI-only) |
| **총 순증감** | **+1 해소 · +2 보강 · +2 등재** |

---

## 6. 다음 게이트

1. **fork PR #38** 머지 → install 단계 그린. lint 자체는 M2 pre-existing 에러 가시화 → M2 후속 PR 로 완전 green.
2. **relay 자동 스캐너 운영 전환** — K1 결정 (외부 `K1-0915-D` 를 본 스크립트로 교체 또는 비활성화).
3. 열린 M1 PRs 유지: #23 (M1-1105-A) · #29 (M1-1105-G rebase · M3 소유) · #35 (M1-1105-H).

---

*M1-1105-I · 2026-11-07 · fork lint --legacy-peer-deps + relay hubs 자동 스캐너 · fork PR #38 · 제품 코드 0 · 수기 등재 제거 기반 확립*
