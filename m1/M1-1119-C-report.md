# #387 머지 1963a6c · feature-map PR #390 · 미분류 0 O · live 승격 3건

## REQ 1 — PR #387 머지

- PR: `ci/M2-1119-C-summary` → `main`
- 상태: OPEN + MERGEABLE (mergeStateStatus=UNSTABLE, reviewDecision 없음)
- 머지 방식: squash
- 머지 SHA: `1963a6c62de133568850e240265824764301e999` (sha7: `1963a6c`)

## REQ 2 — feature-map.yaml 업데이트

브랜치: `docs/M1-1119-C-feature-map` (from origin/main)

### pairing-persist.test.ts 분류
- 파일: `apps/customer-display/src/lib/__tests__/pairing-persist.test.ts`
- 추가된 프로세스: `commerce-core.customer-display-pairing`
- 근거: 같은 디렉토리의 `pair-flow.test.ts` 가 이미 해당 프로세스에 등록되어 있음

### live 승격 (3건)
모두 `git show origin/main:<path>` 로 파일 존재 확인 후 `planned → live` 변경:

| 항목 ID | 확인 파일 | 변경 |
|---------|----------|------|
| `commerce-core.customer-display-snapshot` | `apps/commerce-core/src/modules/register_session/order_snapshot/model.ts` | planned → live |
| `commerce-core.customer-display-pairing` | `apps/commerce-core/src/lib/device-token.ts` | planned → live |
| `customer-display.cd-envelope` | `apps/customer-display/package.json` | planned → live |

### PR
- #390: https://github.com/CuriocityDevAi/storeport/pull/390
- 머지하지 않음 (요구사항에 따라 생성만)

## REQ 3 — 미분류 검증

워크플로: `.github/workflows/feature-map-check.yml`
스크립트: `scripts/feature-map-check.mjs`

### 초기 실행 결과 (feature-map 수정 후)
```
scanned: 1201 files → matched=1188 unmatched=13 (1.1%)
```

미분류 13건:
- `apps/customer-display/screenshots/*.png` (12건) — `cd-envelope` 의 `files:` 에 `apps/customer-display/screenshots/**` 추가
- `docs/contracts/meros-todoboss-events-v1.md` — `infra.docs-plans` 의 `files:` 에 `docs/contracts/**` 추가

### 최종 실행 결과
```
scanned: 1201 files → matched=1201 unmatched=0 (0.0%)
```

미분류 0 달성. 추가 패턴 2개가 커밋에 포함됨.

## 커밋 정보

- 커밋: `c8c287a` — `docs(feature-map): M1-1119-C — pairing-persist 분류 · live 승격`
- 변경: 1 file (feature-map.yaml), +6 insertions, -3 deletions
