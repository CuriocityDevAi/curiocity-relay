# M2-1105-AS 리포트

## 앱 업데이트 경로 (iPad 3줄)

1. iPad에는 `expo-dev-client` 기반 `development` 채널 IPA가 설치됨 (EAS internal distribution)
2. **Mac Metro 직결**: `expo start` → iPad QR 스캔 → Mac이 실시간 번들 제공 → BUILD_ID 즉시 반영
3. **EAS OTA 경로**: `eas update --branch development` 실행 → iPad 앱 재시작 시 새 번들 자동 다운로드 → 머지 후 OTA push 필요

---

## 항목별 표

| 항목 | 파일:줄 | 내용 | 커밋 |
|------|---------|------|------|
| 1. 진단 | `eas.json`, `package.json` | expo-dev-client + expo-updates + development 채널 확인 | — |
| 2. app.config.js 신규 | `app.config.js` | `getGitBuildId()` → `git rev-parse --short HEAD` + `git log -1 --format=%cd` → `expo extra.buildId` | 2908858 |
| 2. constants/build.ts | `constants/build.ts:4` | 고정 문자열 → `Constants.expoConfig.extra.buildId ?? 'unknown'` | 2908858 |
| 2. BuildBadge.tsx | `components/ui/BuildBadge.tsx:3,11` | `BUILD_DATE` import/표시 제거 · `BUILD_ID` 단일 표시 | 2908858 |
| 3. prettier 버전 | `package.json:86` | `prettier-plugin-tailwindcss ^0.5.14 → ^0.6.14` | 2908858 |
| 3. CI 캐시 | `.github/workflows/ci.yml:42,81` | Metro 캐시 키에 `app.config.js` 추가 | 2908858 |
| 4. 번들 증거 | `docs/testing/m2-1105-as-build-id-bundle-verify.txt` | `expo export -p web` → entry.js grep `buildId":"2908858 · 11-12 11:15"` | e5f060d |

## PR 번호

**#103** https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/103

---

## prettier 원인 확정

- **원인**: `prettier-plugin-tailwindcss@0.5.x` 는 TypeScript 파서 hooking 시 특정 Linux/Node20 환경에서 TS 함수 반환 타입 annotation (`): Uint8Array {`)을 내부 AST walker가 오파싱 → `SyntaxError: Unexpected token (66:3)`
- **수정**: `^0.6.14` 로 업그레이드 — 0.6.0부터 내부 파서 감지 방식 변경으로 `.ts` 파일 SyntaxError 해소
- **검증**: `npx prettier --check lib/printer/logo-bitmap.ts` → `All matched files use Prettier code style!` ✓
- **어설션**: 43/43 PASS ✓

---

## git ls-tree

```
100644 blob cc49a28d7aeee4b5dd9906fc6e23028992adc02c    app.config.js
100644 blob 657628264c65b264c27c307230fdccf51cdead6d    components/ui/BuildBadge.tsx
100644 blob 3815967f3d5082a4b8c4302711663cc7cd9b13ff    constants/build.ts
100644 blob 28d5de0c8e1ae458fba01cfc28cfeffc50a5a1da    docs/testing/m2-1105-as-build-id-bundle-verify.txt
```

---

## 이연 순증감

- 신규 파일: `app.config.js`, `docs/testing/m2-1105-as-build-id-bundle-verify.txt` (+2)
- 삭제 파일: 없음
- 어설션: 43/43 PASS (기존과 동일)

---

## 착지 명령

```
cp /tmp/M2-1105-AS-report.md ~/projects/curiocity-relay/m2/ &&
cd ~/projects/curiocity-relay &&
git add m2/M2-1105-AS-report.md &&
git commit -m "m2: M2-1105-AS" &&
git pull --rebase --autostash origin main &&
git push &&
node scripts/claim.mjs M2-1105-AS done "BUILD_ID 자동화(app.config.js→expo extra)+prettier-plugin 0.5→0.6 · PR#103"
```
