# K1-0902-C · todoboss 근태 어설션 · C-2 정본 박제 (다른 리포 확장 방식)

**허브**: K1 (test-portal · feat/k1-0902-regression 워크트리)
**라운드**: K1-0902-C · 첫 실 assertion 라운드 (B δ MVP 인프라 위)
**성격**: **회귀 러너 첫 실 대상 · Kyu 실기 대기**
**날짜**: 2026-09-03
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/81 (B+C 누적 · Kyu 결정 · 별건 PR 신설 안 함)
**Commit**: `7816a7f` (C 라운드 신규 · main 진입 대상)

---

## 0. TL;DR

- **배경**: T0-0902-D 근태 회귀 사고 = 신 화면 이관 시 판정 기준 재파괴 · 사람 실기로만 발견. 이 사고를 기계가 잡도록 하는 것이 목적.
- **C-2 결정** (다른 리포 확장 방식 정본): **(a-lite) pure fn direct import** · 별도 npm 패키지 추출 없이 todoboss `shift-baseline.ts` 를 shim 이 inline patch + dynamic import. 신뢰도 A 등급. `docs/plans/PLAN-K1-regression-runner.md § C.2` 별도 절 박제.
- **어설션 5건 착지**: 경계값 · 조퇴 유예 · 초 정밀 · 다중 상태 · work_type 판별자.
- **C-3 fail 실증**: `REG_C3_SIMULATE_REGRESSION=1` → attendance-second-precision expected 뒤집기 · fail 1 · exit 1. reason 문안 실 출력.
- **C-4 임시 seed CLI**: `bin/seed-catalog-tmp` (SQL/local/remote 3 모드 · promoted_by='k1-cli-seed' · 폐기 시점 명시).
- **경계 규칙**: todoboss 소스 무변경 (검사만 · read-only import) · src/ 화면 무변경 · 브랜치 무변경.
- **검증**: 823/823 tests pass · check 0 · 러너 5/5 · 자동화 진척도 100%.

---

## 1. Kyu C-1 판정 기준 정본 대조 (변경 금지)

| 항목 | Kyu 명시 정본 | todoboss 실 값 (shift-baseline.ts) | 확증 |
|------|--------------|-----------------------------------|------|
| Casher Shift 1 | 08:00~17:00 | `SHIFT_TIMES.casher_shift1 = { startMin: 480, endMin: 1020, startLabel: '08:00', endLabel: '17:00' }` | ✓ |
| Casher Shift 2 | 13:00~22:00 | `casher_shift2 = { 780, 1320, '13:00', '22:00' }` | ✓ |
| 비-Casher | 07:30~16:30 | `non_casher = { 450, 990, '07:30', '16:30' }` | ✓ |
| 1차 판별자 | `work_type` (Roles 아님) | `resolveShiftBaseline(workType, rotationShift)` · role 파라미터 없음 | ✓ |
| SHIFT + null rotation | 판정 제외 아님 | W-4 fallback → `non_casher` | ✓ |
| FIXED | non_casher default | `wt === 'FIXED' → 'non_casher'` | ✓ |
| ON_DEMAND | 판정 제외 | `wt === 'ON_DEMAND' → 'unknown'` | ✓ |
| null/'' work_type | non_casher fallback | `return 'non_casher'` | ✓ |
| 지각 유예 | 10분 | `DEFAULT_LATE_GRACE_MINUTES = 10` | ✓ |
| 야근 유예 | 30분 | `DEFAULT_OT_GRACE_MINUTES = 30` | ✓ |
| 조퇴 유예 | 10분 | `DEFAULT_EARLY_LEAVE_GRACE_MINUTES = 10` (T0-0902-D · FERYAN 반증) | ✓ |
| 정밀도 | 초 단위 | `timeStrToSeconds` + `outSec > otThresholdMin * 60` (T0-0902-D D-1) | ✓ |
| 다중 상태 | 동시 성립 시 모두 표기 | `status_tags: SessionStatus[]` (T0-0902-D D-2) | ✓ |

---

## 2. C-2 결정 · 다른 리포로 회귀를 확장하는 방식 정본 (박제)

### 2.1 3안 비교

| 안 | 비용 | 신뢰도 | 유지보수 | 리포 경계 대가 |
|----|------|--------|----------|-----------------|
| **(a) 판정 순수 함수 별도 패키지 추출 + 러너 직접 호출** | 中 (패키지 신설 · 배포 · 링크) | **최고** (실 코드 그대로) | 中 (패키지 릴리스 사이클 편입) | 두 리포가 같은 패키지 소비 |
| (b) todoboss dev 서버 기동 + API 응답 검사 | **높음** (dev 서버 · DB 시딩 · CI 30초+) | 중 (API 계층 통합) | 높음 (인프라 flaky · CI 시간 증가) | 실행 시 dev 서버 · CI matrix |
| (c) todoboss 기존 테스트 러너 호출 | 中 (Jest 부팅 · Nest 컨텍스트) | **낮음** (기존 테스트가 회귀 못 잡아서 사고 발생) | 낮음 (todoboss 테스트 파일 변경 의존) | 다른 리포 test suite 실행 = 리포 경계 훼손 |

### 2.2 K1 판정 · (a) 채택 · lite 변형

**(a-lite) 판정 순수 함수 direct import** — 별도 npm 패키지 추출 없이 todoboss 리포 원본 TS 파일을 shim 이 dynamic import (inline patch 로 cross-file import 해소).

**채택 근거**:
- todoboss `shift-baseline.ts` 는 이미 pure module (NestJS 미의존 · TypeORM 미의존 · RotationShift enum 만 import) → **별도 패키지 추출 = 과설계**.
- Node 22.7+ `--experimental-transform-types` = deps 0 · 러너 shim (`bin/regression-runner`) 이 flag 자동 부착.
- (b) dev 서버 = 인프라 무게 대비 얻는 이점 미미 (같은 pure fn 을 원격 호출로 감싸는 셈).
- (c) todoboss 테스트 = 그 테스트가 회귀 못 잡아서 사고 발생 (T0-0902-D) · 신뢰 안 감.

### 2.3 리포 경계 넘는 대가 (Kyu 명시 요구) · 6종 + 완화책

| # | 대가 | 완화책 (K1 착지) |
|---|------|-----------------|
| ① | 파일 경로 결합 (다른 리포 checkout 필요) | `REG_TODOBOSS_ROOT` env override · default = `../<repo>` |
| ② | Node 22.7+ `--experimental-transform-types` flag 의존 | 러너 shim 자동 부착 · `--no-warnings=ExperimentalWarning` |
| ③ | cross-file import (RotationShift enum) 해석 실패 | shim inline patch (import 문 → enum 원본 삽입) · tmp 파일 방출 |
| ④ | CI 에서 두 리포 checkout 필요 | 이번 = 로컬 재현 정본만 · CI 확장 = K1-0902-D 별건 (Kyu 판정 대기) |
| ⑤ | 대상 리포 코드 rename/이동 시 러너 fail | 어설션 = `blocked` verdict (silent skip 아님 · 사람 개입 트리거) |
| ⑥ | 대상 리포 함수 signature 변경 시 검증 실패 | 러너가 assertion signature 검사 (예: `resolveShiftBaseline.length` arity 회귀 감지) |

### 2.4 신뢰도 등급 정본 (다른 리포 확장 시 참조)

- **A** = pure function direct import (본 라운드 · 최고 신뢰도)
- **B** = pure function 별도 npm 패키지 소비 (더 무거우나 정합)
- **C** = HTTP API 소비 (dev 서버 필요 · pure fn 아닐 때)
- **D** = 대상 리포 test suite 실행 (**금지** · 그 테스트가 이미 회귀 못 잡음)

### 2.5 다른 리포 편입 시 재사용 5단계 규약

1. **대상 리포의 판정 함수가 pure 인지 확인** (NestJS/TypeORM/외부 인프라 의존 X)
2. `tools/regression-runner/src/<repo>-shim.mjs` 신설 (env override + default path + cross-file inline patch + safeLoad)
3. `tools/regression-runner/assertions/<repo>/<case_id>.mjs` 신설 (CASE_META + default async fn + truth vs 실 코드 비교)
4. CI workflow 확장 = 대상 리포 checkout matrix
5. **금지**: 대상 리포 소스 수정 · dev 서버 기동 · 대상 리포 test suite 실행

### 2.6 blocked verdict = 확장 정본 (B-2 확장)

- `skip` = 어설션 자체 없음 (자동화 진척도 지표)
- **`blocked` = 어설션 있으나 실행 불가 (대상 리포 접근 실패)** ← C 라운드 신설
- `fail` = 어설션 실행됨 · 결과 어긋남 (실 회귀)
- CI 빨간불 조건 = **fail 만** (skip · blocked = exit 0)

---

## 3. 어설션 5건 (착지)

| 파일 | 대상 | 검사 |
|------|------|------|
| `attendance-boundary-times.mjs` | 야근 threshold 경계 4 case | non_casher 17:00:00→0 · :01→발생 · Shift1 17:30:00→0 · Shift2 22:30:00→0 |
| `attendance-early-leave-grace.mjs` | 조퇴 유예 10분 대칭 | FERYAN 16:58→정상 · 16:49→조퇴 (T0-0902-D 반증 재현) |
| `attendance-second-precision.mjs` | 초 정밀 (T0-0902-D D-1) | 17:37:47 → 8분 (분 정밀 = 7 = 회귀). **C-3 fail 훅 REG_C3_SIMULATE_REGRESSION 편입** |
| `attendance-multi-status.mjs` | Amel 다중 태그 | 07:45+17:15 → status_tags=[ot,late] · status=ot (T0-0902-D D-2) |
| `attendance-work-type-baseline.mjs` | work_type 판별자 (Roles 아님) | 9 매트릭스 (SHIFT/FIXED/ON_DEMAND × rotation) + arity=2 회귀 감지 |

---

## 4. C-3 fail 실증 (Kyu 명시 요구 · 실 출력)

### 정상 실행 (5 pass · 자동화 진척도 100%)

```
$ ./tools/regression-runner/bin/regression-runner --repo todoboss --catalog-file /tmp/reg-todoboss.json
 case_id                             │ verdict            │ reason
─────────────────────────────────────┼────────────────────┼─────────────────────
 attendance-boundary-times           │ pass               │
 attendance-early-leave-grace        │ pass               │
 attendance-second-precision         │ pass               │
 attendance-multi-status             │ pass               │
 attendance-work-type-baseline       │ pass               │

카탈로그 총 케이스: 5
기계 판정 가능      : 5 (100% 자동화 진척도)
pass: 5 · fail: 0 · exit_code = 0
```

### 인위 회귀 재현 (REG_C3_SIMULATE_REGRESSION=1)

```
$ REG_C3_SIMULATE_REGRESSION=1 ./tools/regression-runner/bin/regression-runner --repo todoboss --catalog-file /tmp/reg-todoboss.json
 attendance-second-precision   │ fail   │ casher_shift1 17:37:47 퇴근: expected ot_minutes=7 · got 8 (C-3 회귀 시뮬레이션 · 정본 기대치는 8)

pass: 4 · fail: 1 · exit_code = 1
$ echo $?
1
```

**해설** (C-3 훅 원리):
- `attendance-second-precision.mjs:34` = `const expected = process.env.REG_C3_SIMULATE_REGRESSION === '1' ? 7 : 8;`
- env 세팅 = 회귀 상태의 잘못된 예상치 (7분 · 분 정밀도 회귀) 를 truth 로 삼음
- 실 code 정본 (8분 · 초 정밀) 반환 → 예상 7 vs 실 8 = fail
- **실증 목적**: 러너 fail 경로 · reason 문안 · exit 규약 확증

### blocked 경로 (todoboss 리포 부재)

```
$ REG_TODOBOSS_ROOT=/tmp/nonexistent ./tools/regression-runner/bin/regression-runner --repo todoboss --catalog-file /tmp/reg-todoboss.json
 attendance-boundary-times    │ blocked │ todoboss 소스 접근 실패 (TODOBOSS_MISSING): todoboss 소스 파일 부재
 (전 5건 blocked)

blocked 5 · exit_code = 0
```

**Kyu B-2 확장 정본 확증**: blocked 5건 · exit 0 (CI 빨간불 방지).

---

## 5. C-4 임시 카탈로그 등재 (K0 화면 배선 前)

**착지**: `tools/regression-runner/bin/seed-catalog-tmp`

- 어설션 파일 스캔 → `CASE_META` export 수집 → SQL INSERT 조립 · ON CONFLICT DO UPDATE
- `promoted_by='k1-cli-seed'` 라벨 (자동 승격 `promoted_by=<Access JWT email>` 과 구별)
- 3 모드: stdout SQL / `--apply-local` / `--apply-remote`

**폐기 시점** (Kyu 명시 요구): K0 § B.4 (1) `cases_snapshot` 자동 승격 착지 후.
**폐기 절차**:
1. seed 로우 처리 결정 (Kyu 판정 · 남기기 / 삭제)
2. `git rm tools/regression-runner/bin/seed-catalog-tmp`
3. PLAN-K1-regression-runner § C.4 회수 처리

---

## 6. 착지 파일 (C 라운드)

**신설**:

| 파일 | LOC |
|------|-----|
| `tools/regression-runner/src/todoboss-shim.mjs` | 91 |
| `tools/regression-runner/assertions/todoboss/attendance-boundary-times.mjs` | 62 |
| `tools/regression-runner/assertions/todoboss/attendance-early-leave-grace.mjs` | 62 |
| `tools/regression-runner/assertions/todoboss/attendance-second-precision.mjs` | 47 |
| `tools/regression-runner/assertions/todoboss/attendance-multi-status.mjs` | 55 |
| `tools/regression-runner/assertions/todoboss/attendance-work-type-baseline.mjs` | 66 |
| `tools/regression-runner/bin/seed-catalog-tmp` | 132 |
| `tools/regression-runner/test/todoboss-shim.test.mjs` | 47 (3 tests) |

**편집**:
- `tools/regression-runner/bin/regression-runner` shebang 확장 (+1 LOC)
- `docs/plans/PLAN-K1-regression-runner.md` § C 신설 (긴 문서 · C-2 정본 별도 절 박제 포함)
- `docs/requirements-tracking.md` K49 신설 + 이연 순증감
- `EPIC-STATE.md` REG 라인 갱신

**T0 (todoboss) 회부 = 없음** (Kyu 경계 규칙 정합 · todoboss 소스 무변경 · 검사만).

---

## 7. 검증 실측 (K1 2026-09-03)

```
$ pnpm test → 823/823 pass · Duration 12.03s
$ pnpm check → 0 err · 0 warn · 986 files
$ ./bin/regression-runner --repo todoboss --catalog-file /tmp/reg-todoboss.json
  → 자동화 진척도 100% · pass 5 · fail 0 · exit 0
$ REG_C3_SIMULATE_REGRESSION=1 ./bin/regression-runner ...
  → pass 4 · fail 1 · exit 1
$ REG_TODOBOSS_ROOT=/tmp/nonexistent ./bin/regression-runner ...
  → blocked 5 · exit 0
$ ./bin/seed-catalog-tmp --repo todoboss --apply-local
  → ✓ seed 완료 · promoted_by='k1-cli-seed' · 5 case
```

---

## 8. Kyu 실기 절차 (self-contained · C 라운드)

**전제**: 이 라운드 = 서버·스키마 무변경. 배포 대기 없이 로컬 재현 즉시.

### 8.1 5 assertion 정상 실행

```bash
cd /Users/kyu.lee/projects/test-portal-k1
export PATH="/Users/kyu.lee/.nvm/versions/node/v22.23.1/bin:$PATH"
git pull  # PR #81 병합 대기 시 이 브랜치에서 실행
cat > /tmp/reg-todoboss.json <<'EOF'
{ "entries": [
  { "case_id": "attendance-boundary-times" },
  { "case_id": "attendance-early-leave-grace" },
  { "case_id": "attendance-second-precision" },
  { "case_id": "attendance-multi-status" },
  { "case_id": "attendance-work-type-baseline" }
] }
EOF
./tools/regression-runner/bin/regression-runner --repo todoboss --catalog-file /tmp/reg-todoboss.json
```

**정상**: `카탈로그 5 · 기계 판정 가능 5 (100%) · pass 5 · fail 0 · exit 0`.

### 8.2 C-3 fail 경로 (인위 회귀 시뮬레이션)

```bash
REG_C3_SIMULATE_REGRESSION=1 ./tools/regression-runner/bin/regression-runner --repo todoboss --catalog-file /tmp/reg-todoboss.json
echo "exit=$?"
```

**정상**: `attendance-second-precision · fail · expected ot_minutes=7 · got 8 (C-3 회귀 시뮬레이션 · 정본 기대치는 8)` · `exit=1`.

### 8.3 blocked 경로 (todoboss 리포 부재)

```bash
REG_TODOBOSS_ROOT=/tmp/nonexistent ./tools/regression-runner/bin/regression-runner --repo todoboss --catalog-file /tmp/reg-todoboss.json
echo "exit=$?"
```

**정상**: `blocked 5 · exit=0` (Kyu B-2 확장 · CI 빨간불 방지).

### 8.4 임시 seed SQL 모드

```bash
./tools/regression-runner/bin/seed-catalog-tmp --repo todoboss
```

**정상**: 헤더 2줄 (폐기 시점 명시) + 5 INSERT · `promoted_by='k1-cli-seed'`.

### 8.5 [옵션 · K49-4] 임시 seed 원격 D1 등재

Kyu 로컬 wrangler + Cloudflare 계정 필요.

```bash
./tools/regression-runner/bin/seed-catalog-tmp --repo todoboss --apply-remote
npx wrangler d1 execute approvals-db --remote --command \
  "SELECT case_id, promoted_by, status FROM case_catalog WHERE repo='todoboss' ORDER BY case_id"
```

**정상**: `✓ seed 완료 · promoted_by='k1-cli-seed'` · SELECT 5 row · `status='active'`.

---

## 9. Kyu 질문 (self-contained · relay 회신)

**Q-C1 · CI matrix 편입 (K49-2) 시점**: K1-0902-D 로 즉시 착수 vs 딥링크 파일럿 · K0 배선 대기 후. **K1 권고 = K1-0902-D 즉시** (todoboss checkout matrix + `REG_TODOBOSS_ROOT` 주입 · CI 안정 확보 후 다른 리포 편입 · CI 붉음 방지 정본 확증).

**Q-C2 · grownest/storeport 편입 (K49-3) 라운드 스코프**: 리포별 별건 라운드 vs 묶음 라운드. **K1 권고 = 리포별 별건** (§ C.2.4 재사용 규약 · 각 리포 pure fn 위치 조사 필요 · 개별 승인).

**Q-C3 · Kyu seed 원격 (K49-4) 즉시 vs 대기**: 지금 원격 D1 에 5 case 등재 vs K0 화면 배선 대기. **K1 권고 = 지금 즉시** (K48-6 vars/secrets 편입과 함께 · CI 게이트 활성화 · assertion 실효 확증 시작).

**Q-C4 · seed 로우 K0 배선 후 처리**: K0 자동 승격 착지 후 기존 `promoted_by='k1-cli-seed'` 로우 처리 = 유지 vs 삭제 vs `promoted_by` 갱신. **K1 권고 = 유지** (감사 이력 근거 · seed 라벨 = 최초 등재 유래 명시 · 자동 승격은 UPSERT 후 title/description 갱신).

---

## 10. 리포트 규약 정합

- ✅ 커밋 (7816a7f) · PR 갱신 (#81 B+C 누적 · Kyu 원 브랜치 merge 정합)
- ✅ 경계 규칙: todoboss 소스 무변경 · src/ 화면 무변경 · 브랜치 무변경
- ✅ K0 (AE) 병렬 안전 · main merge 흡수 완료 (eab71bb)
- ✅ 어설션 5건 실 코드 실행 확증 · shim direct import 정본
- ✅ C-3 fail 실증 명기 (Kyu 명시 요구) · 실 출력 붙임
- ✅ C-4 임시 seed 폐기 시점 명기 (Kyu 명시 요구)
- ✅ C-2 결정 = **별도 절 박제** (PLAN § C.2 · 다른 리포 확장 정본)
- ✅ Kyu 실기 self-contained · 5 단계 (필수 3 + 옵션 2)
- ✅ Kyu 질문 4건 (§ 9)

---

*K1-0902-C · 2026-09-03 · todoboss 근태 어설션 5 착지 · C-2 정본 박제 · 823/823 tests · check 0 · PR #81 (B+C 누적)*
