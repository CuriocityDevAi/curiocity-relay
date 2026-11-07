---
round: M2-1105-N
pr:
  fork: agilo-medusa-pos-fork#54
commit: d6196fffab1ac7ccee9a77313507df474f08cc9f
outcome: accent 토큰 가드 + Maestro OpenShiftSheet 분기 + claim.mjs 상시 신호 · CI 전부 green
kyu_checks: 1 (EMAIL/PASSWORD 확보 후 `npm run sim:test:cart` 또는 `sim:test:cash` 1회 실기)
ci_run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42360437354
ci_duration_s: 379
lint_run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42360437363
lint_duration_s: 49
---

# M2-1105-N · accent 가드 + Maestro OpenShiftSheet + claim.mjs

**일자**: 2026-11-07 · **허브**: M2 · **base**: `master = 5a35e23` · **방법론**: ⑦(감시 신호) · ⑬(상시 어설션) · 팔레트 D1 정본

## 1. 산출물

### fork (agilo-medusa-pos-fork#54)

| 파일 | 변경 |
|------|------|
| `scripts/m2-1105-n-accent-guard.mjs` (신규) | accent/accent-soft 토큰 허용 파일 밖 사용 가드 |
| `scripts/run-all.mjs` | assertions glob 에 `-guard` 접미사 포함 (하위 호환) |
| `maestro/pos/sim-cart-flow.yaml` | Setup Wizard 뒤 OpenShiftSheet 분기 삽입 |
| `maestro/pos/sim-cash-flow.yaml` | 동일 (텍스트 기반 분기 → testID 분기로 교체) |

### curiocity-relay

| 파일 | 변경 |
|------|------|
| `scripts/claim.mjs` (신규) | CLI · `claim <ID> <started\|blocked\|done> [note]` |
| `scripts/build-hubs.mjs` | claims 머지 → 허브별 `current_round / current_state / current_at / current_note` |
| `README.md` | Claims 섹션 3줄 사용법 |
| `status/claims/M2-1105-N.json` | 본 라운드 신호 (started · blocked · done) |

**제품 코드 미수정** (app/** · components/** · api/** · lib/** 그대로).

## 2. 가드 결과

**master (5a35e23) 통과** — 허용 파일 밖 accent 사용 0건.

```
PASS · accent 토큰 사용처 가드 · 허용 파일 밖 사용 0건
  스캔 범위: app, components, lib, hooks, contexts, constants
  허용 접두사: components/icons/MerosLogo · constants/brand.ts · tailwind.config.js
```

#52 (M3-1105-L D1 accent purge) 뒤 남은 위반 0 — 정리 완료. 향후 신규 유입은 fork CI 에서 차단.

### 탐지 패턴
- className: `(bg|text|border|ring|from|to|via|fill|stroke|placeholder|caret|decoration|outline|divide)-accent(-soft)?`
- 상수 참조: `TOKEN_ACCENT(_SOFT)?`

## 3. claim.mjs 사용 예 (본 라운드 실측)

```
$ node scripts/claim.mjs M2-1105-N started "accent guard + maestro"
[claim] wrote status/claims/M2-1105-N.json · {"id":"M2-1105-N","hub":"m2","state":"started",...}
[build-hubs] status/hubs.json rewritten (10 hubs)
[claim] committed
[claim] pushed

$ node scripts/claim.mjs M2-1105-N blocked "verifying fork CI before done"
[claim] wrote ... state":"blocked"
[claim] committed · pushed

$ node scripts/claim.mjs M2-1105-N done
[claim] wrote ... state":"done"
[claim] committed · pushed
```

### build-hubs 머지 결과 예 (m2)

```json
"m2": {
  "last_round": "M2-1105-M",
  "last_report": "m2/M2-1105-M-report.md",
  "last_pr_fork": "https://github.com/.../pull/51",
  "state": "idle",
  "current_round": "M2-1105-N",
  "current_state": "done",
  "current_at": "2026-11-07T...",
  "current_note": "...",
  ...
}
```

`last_*` 는 머지된 과거 리포트 · `current_*` 는 진행 중/방금 끝난 claim. 두 축을 분리.

## 4. Maestro OpenShiftSheet 분기

`components/register/OpenShiftSheet.tsx` (M1-1105-N · #48) 의 testID 그대로 사용:
- `open-shift-sheet` · 시트 컨테이너 (분기 visible when 체크)
- `open-shift-float` · Opening float TextField
- `open-shift-nickname` · Opened by TextField (optional · 분기에서 미사용)
- `open-shift-submit` · Open shift FormButton

YAML 공통 패턴 (두 플로 모두):
```yaml
- runFlow:
    when:
      visible:
        id: open-shift-sheet
    commands:
      - tapOn: { id: open-shift-float }
      - inputText: '0'
      - hideKeyboard
      - tapOn: { id: open-shift-submit }
      - waitForAnimationToEnd: { timeout: 15000 }
```

열린 세션이 이미 있으면 시트 부재 → runFlow when 분기로 skip (안전).

### Maestro 시뮬 실행 · **미실행**

지침 "자격 증명 요청·추측 금지" · 로컬 `.env` 부재 확인. Kyu 가 EMAIL/PASSWORD 전달 후:
```bash
npm run sim:test:cart -- -e EMAIL=... -e PASSWORD=... -e PRODUCT_TITLE='Kopi Tubruk'
npm run sim:test:cash -- -e EMAIL=... -e PASSWORD=... -e PRODUCT_TITLE='<test-product>'
```

## 5. 검증

| 체크 | 결과 |
|------|------|
| `node scripts/run-all.mjs assertions` (local) | **15/15 PASS** · 1.6s (accent-guard 포함) |
| `npx expo export -p web` | BUILD SUCCEEDED |
| `node scripts/run-all.mjs playwright` (local) | **16/16 PASS** · 224s |
| isolated `npm ci` | package.json 미변경 (영향 없음) |
| fork CI `Lint` | ✓ **49s** |
| fork CI `assertions + playwright` | ✓ **6m16s** (379s) |
| `node scripts/claim.mjs` (상시 ⑦) | 3회 호출 · 매번 commit+push 성공 |

## 6. 범위 밖 (후속)

- M3 가 accent 위반을 다시 유입하면 fork CI 가 자동 차단 (M3 가 수정 담당)
- Maestro 실기 (EMAIL/PASSWORD 확보 후 · M2 또는 Kyu 가 실행)
- claim.mjs 의 확장 (예: 자동 PR 링크 삽입 · ci_run 자동 동기) — 필요 시 후속 라운드

## 7. 참고

- fork PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/54
- 브랜치: `chore/m2-1105-n-guards` · 커밋 `d6196ff`
- CI 런: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42360437354
- Lint 런: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42360437363
- 선행: M2-1105-H (iOS 시뮬) · M2-1105-K (cash flow 템플릿) · M3-1105-J/L (D1 팔레트) · M1-1105-N (OpenShiftSheet)
