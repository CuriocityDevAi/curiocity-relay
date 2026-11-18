relay PR #6 · 원인 재현 O · 수정 후 mem O · CI 대기 10건 · 최장 잡 ci 40분

## ① mem: null 버그 수정

### 원인 확인
```
env -i PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin node scripts/lib/mem-sample.mjs
```
결과: `sampling failed` (exit 1) → 재현 O

launchd PATH 에 `/usr/sbin` 이 없어 `sysctl` 를 못 찾음 → `hw.memsize = null` → `sampleMem()` 전체 null 반환.

### 수정 내용 (`scripts/lib/mem-sample.mjs`)
| 이전 | 수정 |
|------|------|
| `run('vm_stat', [])` | `run('/usr/bin/vm_stat', [])` |
| `run('sysctl', ['hw.memsize'])` | `run('/usr/sbin/sysctl', ['hw.memsize'])` |
| `run('sysctl', ['vm.swapusage'])` | `run('/usr/sbin/sysctl', ['vm.swapusage'])` |
| `run('memory_pressure', ['-Q'])` | `run('/usr/bin/memory_pressure', ['-Q'])` |

### 수정 후 검증
```json
{ "total_gb": 16, "used_gb": 15.69, "compressed_gb": 4.76,
  "swap_used_gb": 9.89, "pressure": "normal", "at": "2026-11-18T07:07:59.162Z" }
```
exit 0 · 수정 후 mem O

### 테스트
`node --test scripts/test/*.test.mjs` → 122/122 pass

### 커밋 & PR
- 브랜치: `m2/mem-abs-path`
- PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/6

---

## ② storeport CI 대기열 분석 (2026-11-18 07:10 KST 기준)

### queued / in_progress 건수
**총 10건** (모두 queued):

| 브랜치 | 잡 |
|--------|-----|
| main | stale-deferred |
| main | ci-summary |
| feat/m1-1116-h-integration-runner | ci |
| fix/M1-1118-G-refund-dynamic-import | feature-map-check |
| fix/M1-1118-G-refund-dynamic-import | ci |
| fix/M3-1118-B-cd-e2e-green | feature-map-check |
| fix/M3-1118-B-cd-e2e-green | ci |
| test/M1-1117-W-net-refund-it | ci |
| fix/M0-1118-E-pos-it-green | ci |
| refactor/M2-1118-H-xendit-creds-shared | ci |

### 최근 완료 run 잡별 소요시간

| 잡 | 소요시간 | 브랜치 | 결과 |
|----|----------|--------|------|
| ci | 39분 38초 | main | failure |
| feature-map-check | 33분 37초 | refactor/M2-1118-H-xendit-creds-shared | success |
| ci-summary | 27분 04초 | main | success |
| ci | 18분 47초 | fix/M2-1118-F-root-redirect | failure |
| ci-summary | 21분 48초 | main | success |
| ci | 3분 25초 | chore/M3-1118-A-boundary-lint | failure |
| feature-map-check | 7분 38초 | test/M1-1117-W-net-refund-it | success |

중앙값 (ci): ~11분 / 중앙값 (feature-map-check): ~7분

### 가장 오래 걸리는 잡 Top 3
1. **`ci`** — 최대 40분 (main · failure 케이스)
2. **`feature-map-check`** — 최대 34분 (refactor/M2-1118-H)
3. **`ci-summary`** — 최대 27분 (main)

### concurrency 자동 취소 여부
**활성화됨.** 동일 브랜치에 새 push 가 오면 이전 queued/in_progress run 이 자동 취소됨:
- `test/M1-1117-W-net-refund-it`: 06:04:22 run → 06:04:36 신 push 시 cancelled
- `fix/M0-1118-E-pos-it-green`: 05:37:16 run → 06:03:18 신 push 시 cancelled
- `chore/M3-1118-A-boundary-lint`: 05:05:55 run → 05:05:58 신 push 시 cancelled
- `main`: 05:26:31 run → 05:26:35 신 push 시 cancelled

### 돈 안 드는 개선 제안 3줄
1. **pnpm store + Next.js build cache 를 GitHub Actions cache로 등록**: `ci` 잡에서 의존성 설치와 빌드 단계가 매번 처음부터 실행되고 있을 가능성이 높음. `actions/cache` 로 pnpm store 캐시하면 `ci` 40분 → 10~15분 단축 가능.
2. **feature-map-check 를 ci 와 병렬 실행**: 현재 feature-map-check 가 34분 걸리는 경우 머지가 늦어짐. ci 와 별도 job 으로 분리 병렬화 (이미 그런 것처럼 보이나 대기열 순서가 직렬이면 병렬 trigger 확인 필요).
3. **ci 잡에 `concurrency: cancel-in-progress: true` 명시**: concurrency 는 작동 중이나 workflow 파일에 명시적으로 선언하면 runner 슬롯 낭비 없이 최신 커밋만 검증하는 패턴이 보장됨 (특히 rapid-push 브랜치에서 실행기 1대 소비 최소화).
