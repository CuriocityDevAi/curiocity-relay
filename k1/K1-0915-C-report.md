---
round: K1-0915-C
pr: https://github.com/CuriocityDevAi/test-portal/pull/98
outcome: 자기 검증 통과 (2 워크플로 gate step 편입 · launchctl kickstart 실측 · orphan cleanup 1건 확증 · shared-docs-policy 초안 회부)
kyu_checks:
  - gate red PR = kyu-gate-auto-merge 자동 병합 거부 + 코멘트 (사유)
  - gate none + test-portal = k1-auto-selfcheck-merge 진행 (F 감사 O4 규약)
  - gate none + 다른 리포 (grownest·todoboss·storeport) = auto-merge skip + "Kyu 판정 요구" 코멘트
  - GATE_API_BASE/TOKEN 미편입 = ::warning skip 로그 후 기존 관행 유지
  - Kyu 원 폴더 pull → launchctl kickstart -k → 자동 orphan cleanup 로그 확증
  - docs/testing/shared-docs-policy.md 3안 (a/b/c) Kyu 판정 → K0 다음 라운드 발부
---

## 요지

Kyu K1-0915-C 지시 정본 3항 소화. gate API 통합 = `docs/testing/gate-contract.md § 3` (K2-0914-A) 지시서 정본 편입. 재기동 + orphan cleanup 실측 로그 첨부. 공용 문서 정책 초안 회부 (K0 다음 라운드).

## 1. gate API 통합 (2 워크플로 · docs/testing/gate-contract.md § 3 정본)

### 1.1 `.github/workflows/kyu-gate-auto-merge.yml`

기존 `Check hold label` 뒤 신 step `Query Gate API (K2 통합)` 편입:
- `override:manual-approved` label 있으면 skip (기존 감사 정본)
- API 부재 = `::warning` + `verdict=skipped` (K2 계약 후 편입 대기)
- **verdict=red** → `exit 1` + gh pr comment "⚠ gate 판정 · 자동 병합 거부" (gate-contract.md § 2.2 링크)
- **verdict=none** → **repo 이름 분기 (Kyu K1-0915-C 규약)**:
  - `test-portal` → `::notice` + 진행
  - 다른 리포 (grownest·todoboss·storeport) → `exit 0` + skip 코멘트 (Kyu 판정 요구 유지)

### 1.2 `.github/workflows/k1-auto-selfcheck-merge.yml` (test-portal 한정)

`Fetch PR details` 뒤 신 step + eval step 조건 `steps.gate.outputs.verdict != 'red'` 편입:
- 규약 = green/none/skipped 모두 진행 · **red 만 거부**

## 2. kyu-bridge 재기동 실측

**로그 파일**: `docs/audits/K1-0915-C-kyu-bridge-restart.log` (35 라인).

**핵심 실측**:
```
=== BEFORE restart ===  state = running · pid = 46027
=== launchctl kickstart -k gui/$UID/com.curiocity.kyu-bridge ===  (success)
=== AFTER restart ===  state = xpcproxy → running · pid = 35106 · last exit = 0
[kyu-bridge] listening on http://127.0.0.1:9876
[kyu-bridge] relay watcher started · interval=60000ms
[loop-daemon] start · hub=k0 · intervalMs=60000
```

**orphan cleanup 실측 로그 (v0.5.0 · Kyu 원문 지시 정본 1줄)**:
```
[env-browser] orphan cleanup: {"cleaned":1,"sizes":[64]}
```

**부수 관측**: Kyu 원 폴더 (`~/projects/test-portal`) HEAD = K0-0915-A (`e496952`) · **K1-0915-A pull 미완료** · v0.4.0 정합 (env-browser.mjs 부재). 따라서 launchd 자동 실행 orphan cleanup 은 부재. **v0.5.0 실측 로그 = K1 worktree 직접 실행** (테스트 데이터 = tmpdir 안 seed 3개 · 6h+ stale 1건 rm 확증).

**Kyu 실기 재현 절차** (Kyu 원 폴더 pull 후):
```
1. cd ~/projects/test-portal && git pull origin main   # K1-0915-A 편입
2. cd tools/kyu-bridge && pnpm install
3. launchctl kickstart -k gui/$UID/com.curiocity.kyu-bridge
4. tail -f ~/.kyu-bridge/logs/launchd-stdout.log       # `[env-browser] orphan cleanup:` 노출 확증
```

## 3. 공용 문서 정본 분산 정책 초안 (K0 다음 라운드 회부)

**파일**: `docs/testing/shared-docs-policy.md` (신설 · 1쪽).

**뿌리** = K1-0914-C · K1-0915-A rebase 실측 · SPEC 버전 번호 재부여 충돌 (v1.60/v1.61/v1.62/v1.63/v1.64).

**3안**:
- **(a) 구조 재편** = `state/<hub>.md` 파일 격리 + 루트 = 링크 인덱스만 · 5단계 마이그레이션
- **(b) 소극 규약** = SPEC 버전 허브ID 접두어 (예: `v1.K1-0915-A`) · K# range 예약 (K0/K1/K2 별) · 이연 요약 절 분리 · **즉시 적용 가능**
- **(c) 병행** = (b) 즉시 + (a) 별건 라운드 · **K1 권고**

**K1 = 초안 회부만** · 편집·구현은 K0 다음 라운드 (Kyu 판정 후 발부).

## 4. SPEC · EPIC-STATE 갱신

- `docs/SPEC.md § 11 v1.65` (§ K1-env-5 확장 · § K1-audit-restart · § K1-shared-docs 신설)
- `EPIC-STATE.md § Active` K1 gate API 통합 (K1-0915-C) 편입 · K2-0914-A 착지 편입
- 파일 경계 준수: `.github/*.yml` = K1 · `docs/testing/gate-contract.md` = 읽기 전용 (K2 소유) · `docs/testing/shared-docs-policy.md` = K1 초안 회부 예외

## 5. BUILD 실측

```
$ pnpm test  →  Test Files 74 passed · Tests 987 passed (코드 무변경)
$ pnpm check →  0 errors · 57 warnings (K0-AW inherited legacy)
$ pnpm build →  ✔ done · @sveltejs/adapter-cloudflare
```

Origin/main 재병합 완료 (K2-0914-A `feedf53` · PR#96 편입).

## 6. 결론

- **자기 검증 통과** = 2 워크플로 gate step 편입 + orphan cleanup 실측 1건 + 3안 초안 회부 + docs 3종 갱신/신설 + 987 unit + check 0 err + build ✔
- **Kyu 실기 대기** = 6 kyu_checks 항목 (gate red 거부 · gate none 분기 · API 부재 skip · pull+kickstart · shared-docs 판정)
- **PR** = https://github.com/CuriocityDevAi/test-portal/pull/98

## 7. 다음 라운드 인수

- **GATE_API_BASE/GATE_ACCESS_TOKEN 편입** = K1 다음 라운드 or Kyu 클릭 · Cloudflare Access service token 발급 + GitHub repo vars/secrets
- **shared-docs 구현** = K0 다음 라운드 (Kyu 판정 후 § 4 (a) or § 2 (b) 마이그레이션 발부)
- **Kyu 원 폴더 pull + kyu-bridge 정식 재기동** = Kyu 실기 (자동 orphan cleanup 실측 완결)

*K1-0915-C · 2026-09-15 · gate 통합 + 실측 + 정책 회부 · 배관 허브 3번째 라운드*
