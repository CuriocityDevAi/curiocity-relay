---
round: M2-1104-E
pr:
  fork: agilo-medusa-pos-fork#19 (rebased · force-with-lease)
commit: 24dc25f3ac07ad5290c94b03d870165222e12c5d
outcome: PR #19 를 origin/master(d33288c · #18·#20·#21 포함) 위로 리베이스 · 상시 ⓒ 관찰 2건 처리 · 머지 가능
kyu_checks: 5 (변동 없음 — M2-1104-D 와 동일)
---

# M2-1104-E · M2-1104-D 리베이스 · 상시 ⓒ 2건 정리

**일자**: 2026-11-05 · **허브**: M2 · **상대 리포**: `agilo-medusa-pos-fork`

## 1. 상황

M2-1104-D (PR #19) 가 base `feat/m2-1104-c-eas-dev-prep` 위에 열렸는데, 이후 master 에 PR #18 (M2-1104-C 머지 · `1dbc11b`) · #20 (M3-1104-B docs) · #21 (M1-1104-B setup-wizard 자동) 이 순차 머지 → base 만료. R0-1105-A ⑶ 이 app.json 충돌 가능성 flag.

## 2. 처리

### 2-A. 하드코딩 경로 제거 (R0 관찰 ⑵)

`scripts/m2-1104-d-escpos-assertions.mjs` 의 `/Users/kyu.lee/projects/pos-m2` 리터럴 → `import.meta.url` 기준 상대 해결로 치환.

```diff
-import { join } from 'node:path';
+import { dirname, join, resolve } from 'node:path';
+import { fileURLToPath } from 'node:url';
...
-const REPO_ROOT = '/Users/kyu.lee/projects/pos-m2';
+const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
+const REPO_ROOT = resolve(SCRIPT_DIR, '..');
```

다른 worktree (pos-m1 · pos-m3 · agilo-fork-test) · CI runner · clone 경로 어디서 실행해도 동작.

**M2-1104-D 커밋에 `--amend` 로 흡수** (리베이스 전 · 단일 커밋 유지).

### 2-B. 리베이스 (R0 관찰 ⑶)

```
git fetch origin
git rebase origin/master   # master = d33288c
```

- M2-1104-C 커밋 (`418e19f`) 은 origin/master 에 이미 머지된 `1dbc11b` (squash) 과 patch-id 매칭 → `warning: skipped previously applied commit 418e19f`. **cherry-pick skip 정상**.
- M2-1104-D 커밋 (`fa08dbd`) 은 자동 재적용.
- **app.json 수동 충돌 0**: M2-1104-C 의 `bundleIdentifier` 변경 + M2-1104-D 의 `infoPlist.NSBluetooth*` 블록 삽입이 non-overlapping → git 3-way auto-merge.

R0 가 예상한 "app.json 에서 충돌" 은 실제 수동 충돌로는 발생하지 않음 — git 3-way 가 수용. 다만 PR 본문의 "충돌 없음" 문구는 머지 전 예측이었으므로 **리베이스 뒤 문구 재작성** (상시 ⓒ 요청).

### 2-C. PR #19 본문 정정 (R0 관찰 ⑷)

- "스택 관계" 섹션의 "충돌 없음" 문단 → "리베이스" 문단으로 교체
- "리베이스 검증" 섹션 추가 (Playwright 4/4 · 어설션 29/29 · npm ci exit 0)

## 3. 결과

- 커밋: `24dc25f` (rebased · `--amend` 로 R0 ⑵ 흡수)
- Push: `git push --force-with-lease origin feat/m2-1104-d-printer` · 성공 (`7e2cb62...24dc25f forced update`)

## 4. 자동 검증 (post-rebase)

### 4-A. clean-clone `npm ci --legacy-peer-deps`

```
exit 0
```

(package.json · package-lock.json 은 rebase 영향 없음 — lock 충돌 0)

### 4-B. ESC/POS 어설션 (하드코딩 제거 뒤)

```
--- (1) EscPosBuilder 원자 명령 · 3/3
--- (2) 정렬·볼드 · 4/4
--- (3) kv 너비 정렬 · 3/3
--- (4) chunkBytes 분할 · 4/4
--- (5) buildTestReceipt · 5/5
--- (6) buildOrderReceipt · 10/10

29/29 passed · 0 failed
```

### 4-C. Playwright (Expo 웹 export · DSN 미설정)

```
--- (1) 미인증 상태 index.html (DSN 미설정) → 기동 ---
  ✓ pageerror 0건
--- (2) 로그인 화면 DOM 도달 ---
  ✓ 로그인 화면 요소 존재
--- (3) console.error 0건 ---
  ✓ 0건
--- (4) Sentry 심볼 흔적 · 번들 포함 확인 ---
  ✓ 엔트리 번들 로드됨

4/4 passed · 0 failed
```

## 5. 커밋 구조

```
24dc25f feat(printer): BT-58D BLE 영수증 인쇄 1안 (M2-1104-D)
d33288c feat(setup-wizard): 매장 1개 자동 선택 + wizard 건너뜀 (M1-1104-B) (#21)   ← master tip
2182568 docs(plans): M3-1104-B 결제·완료·주문 화면 계획 P2~P5 (#20)
b55faa9 feat(login): Shop URL 칸 제거 · api.meros.id 상수 고정 (M1-1104-A) (#17)
1dbc11b chore(eas): dev build 준비 · bundleId id.meros.pos · BT-58D 조사 (M2-1104-C) (#18)
3f6b671 feat(sentry): 앱 Sentry SDK env-gated 연결 (M2-1104-A/B) (#15)
```

PR 범위·제목 변경 없음. 단일 M2-1104-D 커밋 유지.

## 6. Kyu 실측 (변동 없음 — M2-1104-D 동일)

- [ ] 페어링 · Test print · 주문 영수증 · 프린터 OFF 시 결제 안 깨짐 · 자동 재연결

상세: `docs/runbooks/printer.md`.

## 7. 참고

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/19
- 브랜치: `feat/m2-1104-d-printer` · 머지 대상: `master` (`d33288c`)
- 커밋: `24dc25f`
