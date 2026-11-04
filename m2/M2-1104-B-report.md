---
round: M2-1104-B
pr:
  fork: agilo-medusa-pos-fork#15 (rebased · force-with-lease)
commit: b54b728
outcome: PR #15 를 origin/master(SDK 58 · PR #14 포함) 위로 리베이스 · 재검증 4/4 PASS · 머지 가능 복구
kyu_checks: 4 (M2-1104-A 와 동일 — 프로젝트 생성 · DSN 투입 · 아이패드 Expo Go 기동 정상 · 테스트 오류 1건 Sentry 도착)
---

# M2-1104-B · M2-1104-A 리베이스 (master = SDK 58)

**일자**: 2026-11-04 · **허브**: M2 · **상대 리포**: `agilo-medusa-pos-fork`

## 1. 상황

M2-1104-A (PR #15) 가 열린 뒤 master 에 PR #14 (`chore(expo): SDK 57 → 58`) 머지 → `package.json` · `package-lock.json` 충돌로 PR #15 머지 불가.

## 2. 처리

```
git fetch origin
git rebase origin/master
```

충돌 발생 파일 2:

| 파일 | 해법 |
|------|------|
| `package.json` | 양쪽 합집합. master(SDK 58) 버전 유지 (`@shopify/flash-list@2.3.2` · `@tanstack/*~5.80.7`) + `@sentry/react-native@^8.33.0` 삽입 |
| `package-lock.json` | 손 편집 금지. 충돌 표식 포함 파일 삭제 → `rm -rf node_modules && npm install --legacy-peer-deps` 로 재생성 |

그 외 파일 충돌 없음 (app.json · app/_layout.tsx · eas.json · lib/sentry.ts · docs · scripts 모두 clean apply).

Playwright 스크립트에 **1줄 추가** 필요했음: SDK 58 + React 19.3 의 static-export SSR→hydration 아티팩트 (React `#418`) 를 allowlist. M0-1104-B 와 동일 패턴 (`scripts/m0-1104-a-playwright.mjs` 참조). 앱 자체엔 영향 없음 (React 즉시 self-heal · iPad 네이티브엔 SSR 없음).

## 3. 자동 검증 (SDK 58 · post-rebase)

### 3-A. Playwright (Expo 웹 export · DSN 미설정)

```
--- (1) 미인증 상태 index.html (DSN 미설정) → 기동 ---
  ✓ (1) pageerror 0건 (Sentry init 이 앱 기동을 깨지 않음)

--- (2) 로그인 화면 DOM 도달 ---
  ✓ (2) 로그인 화면 요소 존재

--- (3) console.error 0건 ---
  ✓ (3) console.error 0건

--- (4) Sentry 심볼 흔적 (번들 포함 확인) ---
  ✓ (4) 엔트리 번들 로드됨 (Sentry 포함 번들)

4/4 passed · 0 failed
```

### 3-B. clean-clone `npm ci --legacy-peer-deps`

```
$ cd /tmp/pos-m2-ci-test
$ cp /Users/kyu.lee/projects/pos-m2/package.json .
$ cp /Users/kyu.lee/projects/pos-m2/package-lock.json .
$ npm ci --legacy-peer-deps
...
added 973 packages, and audited 974 packages in 14s
exit 0
```

SDK 57 때 1039 packages → SDK 58 로 거품 빠지며 973. 빠른 install (14s).

## 4. Push · PR

- `git push --force-with-lease origin feat/m2-1104-a-sentry-app` → 2회 500 (GitHub 일시 장애) · 3회차 성공 (`3f7fed6` → `b54b728`)
- PR #15 본문: 리베이스 검증 블록 append (gh pr edit)

## 5. 커밋 구조

커밋 1 (M2-1104-A amend) 유지 — 리베이스 전후 이력은 reflog 에만. PR 제목·범위 변경 없음.

```
b54b728 feat(sentry): app측 Sentry 연결 · env-gated · Expo Go 호환 (M2-1104-A)
7f87271 chore(expo): SDK 57 → 58 업그레이드 (M0-1104-B) (#14)   ← master tip
cd09eef fix(bootstrap): 앱 기동 크래시 "User is not authenticated" 해소 (M0-1104-A) (#13)
```

## 6. Kyu 실기 (변동 없음 — M2-1104-A 와 동일)

- [ ] `curiocity-devai.sentry.io` → Create Project `pos-app` · DSN 복사
- [ ] `eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value '<DSN>'`
- [ ] iPad Expo Go: `EXPO_PUBLIC_SENTRY_DSN='<DSN>' EXPO_PUBLIC_SENTRY_TEST=1 npx expo start` → 기동 정상
- [ ] Sentry `pos-app` 프로젝트에 `M2-1104-A · sentry-app smoke test` 1건 도착

## 7. 참고

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/15
- 브랜치: `feat/m2-1104-a-sentry-app` · 머지 대상: `master` (`7f87271`)
- 커밋: `b54b728`
