R0 · fork(agilo-medusa-pos-fork) 리뷰 허브 · 리포트 폴더 (최신 1 개 유지 · 상위 README [철칙]·[청소] 정합)

---

## [리뷰 체크리스트] (fork PR 상시 · R0-1105-AB 보강 · 2026-11-07)

**원칙**: APPROVE / CHANGES 판정 시 아래 ①~⑦ 전체 통과 여부를 리포트에 명시 (file:line 또는 명령·로그 증거).

| # | 축 | 기준 | 증거 |
|---|---|---|---|
| ① | **스코프** | 해당 라운드 금지 영역(타 파일) 0 수정 | `gh pr diff <n>` 파일 목록 |
| ② | **서버 계약** | 활성 호출 경로에서 API 응답 shape · 쿼리 키 일치 | 소스 좌표 `file:line` |
| ③ | **D1 · 영어 copy** | UI(렌더 문자열·Toast·placeholder) 한글 0 · raw accent 토큰 사용 0 (허용파일 외) | `m2-1105-n-accent-guard.mjs` PASS · `grep '[가-힣]' …` 한글 = 주석만 |
| ④ | **Playwright/assertion** | 라운드 전용 scenario + 관련 회귀 가드 모두 PASS | `node scripts/run-all.mjs all` 결과 |
| ⑤ | **CI** | `assertions + playwright` · `lint` 두 체크 SUCCESS | PR statusCheckRollup |
| ⑥ | **Kyu 결정 존중** | P5 등 Kyu 결정 조항(open-requirements.md) 위배 없음 | 결정 조항 ref + 코드 좌표 |
| ⑦ | **RN 번들 안전** ★ (M2-1105-Q 회귀 재발 가드) | `app/** components/** lib/** api/**` 에 `node:` prefix / bare Node core (`fs` · `path` · `zlib` · `child_process` · `os` · `crypto` · `stream` · `net` · `tls` · `http` · `https` · `dns` · `url` · `tty` · `util` · `v8` · `vm` · `worker_threads` · `readline` · `module` · `perf_hooks` · `async_hooks` · `events` · `buffer` · `assert`) import/require 0 · 가능하면 `npx expo export --platform ios --dev` 로 Metro 번들 해석 1회(종료 코드 0 + `_expo/static/js/ios/*.js` 산출) | grep 결과 · export 로그 꼬리 |

### ⑦ 상세 — Node 핵 모듈 import 금지 가드

**배경**: Kyu 실기 4차 iPad 앱 크래시(2026-11-07 · "Unable to resolve module node:zlib from `lib/printer/logo-bitmap.ts:24`"). R0-1105-AA 가 fork #59(M2-1105-P)를 Node 전용 어설션 32/32 통과만 보고 APPROVE 했으나, Metro RN 번들러는 `node:*` specifier 와 bare Node core 를 해석 못 함. tsc + Node 로 재현되는 테스트만으로는 못 잡는 회귀.

**정적 grep 1회** (리뷰 머신 ≥ 1 회 수행 · 리포트 §증거 란에 결과 제시):

```bash
# 리뷰 디렉토리에서 (예: pos-r0/)
rg -n --type ts --type tsx --type js --type jsx \
  -e '(^|[^.\w])(from\s+["'\'']|require\(["'\''])(node:[a-z_]+|fs|fs/promises|path|path/posix|path/win32|zlib|child_process|os|crypto|stream|net|tls|http|https|dns|url|tty|util|v8|vm|worker_threads|readline|module|perf_hooks|async_hooks|events|buffer|assert)(["'\''])' \
  app components lib api hooks contexts config constants utils
# → 0 매치 기대
```

**번들 해석 1회** (가능할 때 · M2-1105-Q 포함 이후부터는 `scripts/m2-1105-q-bundle-guard.mjs` 로 통합):

```bash
npx expo export --platform ios --dev
# → exit 0, _expo/static/js/ios/entry-<hash>.js 생성 확인
```

**허용 예외**: `scripts/**`(Node 전용 어설션·테스트 하네스) · `metro.config.js` · `babel.config.js` · `eslint.config.js` · 리포지토리 Node 도구 류. 즉 **앱 번들 그래프에 포함되지 않는 파일만 허용**.

**실패 시 판정**: CHANGES — 해당 import 좌표 + 대체(동일 로직을 JS core/Uint8Array/Math 로 다시 쓰거나 Node 전용 파일을 `scripts/` 로 분리) 요청.

---

## 보고서 포맷 (r0/*-report.md)

```markdown
---
name: <ROUND-ID> · <한 줄 제목>
description: <스코프 1 줄 · PR 번호/판정>
author: R0
dated: YYYY-MM-DD
---

# <ROUND-ID> · …

**스코프** · **정본** (fork master SHA) · **직전** · **claim** · **금지**

## 판정 표
| PR | head | 판정 |
...

## §A · …(검증 항목별 §)
- ①~⑦ 체크리스트 전체 증거 (좌표·명령·로그)

## 운영 노트
- 다음 라운드 유의 · deferred risk · 재발 가드 제안
```

---

## [청소]
- 자기 폴더(`r0/`) 기존 리포트 1 개만 유지 — push 시 이전 리포트는 같은 커밋에서 삭제.
