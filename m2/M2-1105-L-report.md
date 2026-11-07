---
round: M2-1105-L
pr:
  fork: agilo-medusa-pos-fork#49
commit: 7c4a464a264db4d45b4b186ed1b12701f065ae0f
outcome: `expo start --tunnel` 복구 · overrides ws@^8 3-line fix · CI 전부 green
kyu_checks: 1 (Mac 터미널에서 `npm ci --legacy-peer-deps` 후 `npx expo start --tunnel` 로 QR 확인 · Node 22 에서도 동일)
ci_run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42343810703
ci_duration_s: 367
lint_run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42343810677
lint_duration_s: 90
---

# M2-1105-L · `expo start --tunnel` ws 충돌 뿌리 fix

**일자**: 2026-11-07 · **허브**: M2 · **상대 리포**: `agilo-medusa-pos-fork` · **base**: `master = 26b6b78` · **work-queue.md**: 방법론 ⑮

## 0. 뿌리 (1 줄)

**`@expo/ws-tunnel@2.0.1` 의 peer `ws: ^8.0.0` 가 top-level hoist 에서 미충족 (react-native 0.88 · metro 0.87 · react-devtools-core 가 ws@7 요구 → `node_modules/ws@7.5.13` 이 hoist winner) → ws-tunnel 의 `require('ws')` 가 ws@7 (callable class 직접) 를 받아와 `new s.WebSocket(url, {...})` 호출 시 `.WebSocket` 서브속성이 undefined → `TypeError: s.WebSocket is not a constructor` (Node 20 · 22 동일).**

## 1. 실측 (fix 전)

```
$ npm ls ws --all
meros-pos@1.0.0
├─┬ expo@58.0.23
│ └─┬ @expo/cli@58.1.19
│   ├─┬ @expo/ws-tunnel@2.0.1
│   │ └── ws@7.5.13 deduped invalid: "^8.0.0" from node_modules/@expo/ws-tunnel  ← 핵심
│   └── ws@8.22.1 (cli 내부 nested · ws-tunnel 리졸브 대상 아님)
└─┬ react-native@0.88.1
  └── ws@7.5.13 (hoist winner)

$ node -e "const ws = require('ws'); console.log(typeof ws, typeof ws.WebSocket)"
function undefined   ← ws@7: 모듈 자체가 WebSocket · .WebSocket 없음
```

ws-tunnel 호출:
```js
const s = r(441);   // = require('ws')
function createWebSocket(e){ const t = new s.WebSocket(e, {skipUTF8Validation:true, ...}); ... }
```
ws@7 shape 와 불일치 → TypeError.

## 2. 수정 (package.json 3 라인)

```diff
+  "overrides": {
+    "ws": "^8.18.0"
+  },
```

`npm install --legacy-peer-deps` 로 lockfile 재생성 → 모든 ws 소비자 (metro · dev-middleware · react-devtools-core · ws-tunnel) 가 `ws@8.22.1` 로 통합.

ws@8 은 wire format/API 가 ws@7 과 호환 → metro/dev-tools regression 0.

## 3. 재현 로그 (fix 후)

```
$ CI=1 npx expo start --tunnel
Starting project at /Users/kyu.lee/projects/pos-m2
Starting Metro Bundler
Waiting on http://c-curiocitymayer-rh2qy2-mw5z061c9lcin6c8.on.expo.app
Logs for your project will appear below.
```

- 터널 URL 할당 성공
- `grep -c TypeError` → **0**
- Metro CI 모드 (reload disabled · CI=1 전제)
- QR 는 interactive 모드에서 자동 출력 — 본 로그는 non-interactive CI 모드

shape 재검:
```
$ node -e "console.log('ws:', require('ws/package.json').version, 'WebSocket:', typeof require('ws').WebSocket)"
ws: 8.22.1 WebSocket: function
```

## 4. 검증

| 체크 | 결과 |
|------|------|
| isolated `npm ci --legacy-peer-deps` (frozen lockfile ⓑ) | exit 0 · top-level `ws@8.22.1` |
| `node scripts/run-all.mjs assertions` | **13/13 PASS** · 1.1s |
| `npx expo export -p web` | BUILD SUCCEEDED |
| `node scripts/run-all.mjs playwright` | **13/13 PASS** · 146.9s |
| `npx expo start --tunnel` | 터널 URL 할당 · TypeError 0 |
| fork CI `Lint` | ✓ success · **1m27s** |
| fork CI `assertions + playwright` | ✓ success · **6m4s** |

## 5. 변경 파일

- `package.json` · `overrides` 3 라인 추가
- `package-lock.json` · ws 소비자 전부 ws@8.22.1 로 재생성 (크기 변화 소폭)

**제품 코드 수정 0** (app/** · components/** · api/** · lib/** 그대로).

## 6. Kyu 실기

Kyu Mac (Node v22.23.4) 에서:
```bash
git pull
npm ci --legacy-peer-deps
npx expo start --tunnel -c
```
→ QR 출력 + "Metro waiting on ..." 메시지 기대.

터널이 여전히 느리거나 네트워크 방화벽에 막히면 fallback LAN:
```bash
npx expo start --lan
```
같은 Wi-Fi iPad 에서 QR 스캔 가능. (docs 1 문단 추가 안 함 — 수정으로 뿌리 해결 · fallback 섹션 불필요)

## 7. Node 버전 메모

- 로컬 재현 환경: Node 20.19.6
- Kyu 보고 환경: Node 22.23.4
- ws@7 vs ws@8 의 export shape 차이는 **Node 버전과 무관** · 두 환경 모두 동일한 fix.
- Expo CLI 는 "Node 22.13+ 권장" 경고 출력하지만 20 에서도 동작 확인.

## 8. 참고

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/49
- 브랜치: `fix/m2-1105-l-tunnel-ws` · 커밋 `7c4a464`
- CI 런: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42343810703 (6m4s)
- Lint 런: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42343810677 (1m27s)
- 관련 RN/Expo 이슈 참조: ws@7 → ws@8 export shape breaking change (ws 8.0.0 CHANGELOG, Feb 2022)
