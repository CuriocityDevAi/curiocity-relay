fork #199 APPROVE · 가드 탐지 O · 오탐 O(1건 경계 사례) || 설치 O 27s(1차 X 54s · sentry-cli CDN 차단 → SENTRYCLI_SKIP_DOWNLOAD=1) · lint O · assertions O(46/47 → magick 대체 후 47/47) · vitest O · flow-tests O · 클라우드 불가 항목 iOS 시뮬레이터/Maestro(sim:*)·Metro 실기 · 총 약 4분

# R0C-1119-F · agilo-medusa-pos-fork PR #199 (M3-1119-C) · 첫 클라우드 R0

- 대상: `pr199` HEAD `96db6d3` · master `feb3196`
- 리뷰 코멘트: PR #199 에 COMMENT 리뷰로 게시 (머지 안 함)

## 실행 표 (Linux 클라우드 · Node 22.23)

| 단계 | 결과 | 초 | 비고 |
|---|---|---|---|
| `npm ci --legacy-peer-deps` | X → O | 54 / 27 | `@sentry/cli` postinstall 이 CDN 에서 바이너리 받으려다 프록시 차단. `SENTRYCLI_SKIP_DOWNLOAD=1` 로 해결 |
| `npm run lint` | O | 30 | 0 errors · 61 warnings |
| `node scripts/run-all.mjs assertions` | 46/47 → 47/47 | 94 | `m0-1103-c` 가 `magick identify` 호출 — 이 환경 ImageMagick 6.9 엔 `magick` 없음. `magick`=`exec "$@"` 대체 스크립트로 71/71. `m2-1105-q-bundle-guard`(expo export -p ios) 는 PASS 67.9초 |
| `npx vitest run` | O | 10 | 62 files · 763 pass · 6 expected fail · 3 todo |
| `npm run test:flows` | O | 3 | 11 files · 176 pass · 6 expected fail |
| `npx tsc --noEmit` | 기존 에러 14 | 13 | PR 은 .mjs 만 변경 → 무관 |
| iOS 시뮬레이터 / Maestro / Metro 실기 | 클라우드 불가 | — | |
| Playwright 하네스 | 미실행(범위 밖) | — | |

## 리뷰 요지

1. PR diff = `scripts/m3-1105-c-english-assertions.mjs` 1파일. 영어화 5건은 이미 #198(`feb3196`)로 master 에 있음. app/·components/ 전체 스캔도 원래 범위 — PR 은 test/spec 제외 + console 제거 + 회귀 체크 3a–3e 추가.
2. 문구 5건: 뜻·자연스러움 OK. `${items}rows` 는 `__DEV__` console 로그용. 니트: "Will be registered as new customer".
3. 탐지: `<Text>테스트</Text>` 삽입 → 실패 확인, 되돌림. `Alert.alert("확인",…)` 도 잡힘.
4. 오탐: 주석·블록주석·단순 console·`*.test.tsx` 안 잡음. 경계 사례: `console.warn(\`… ${String(1)} 한글\`)` 처럼 괄호 중첩 시 정규식 `\([^)]*\)` 이 첫 `)` 에서 끊겨 잔여 한국어가 잡힘(안전 쪽 오탐 · 현 master 해당 없음).
5. master(=PR 트리) 위반 0 · 10/10.

## 클라우드화 메모 (다음 R0 용)

- 설치에 `SENTRYCLI_SKIP_DOWNLOAD=1` 필수.
- `magick` 없는 IM6 환경이면 `magick`→`exec "$@"` shim 을 PATH 앞에.
- 어설션 일부(logo bitmap)가 `docs/testing/logo-*.png` 를 다시 씀 → 실행 후 `git checkout -- docs/testing`.
