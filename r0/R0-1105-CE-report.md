# R0-1105-CE 리뷰 리포트 — fork #103

## 판정: APPROVE ✅

모든 5개 REQ 항목 통과. EAS/OTA 안전. 대량 서식 변경 없음.

---

## 검증 표

| REQ | 항목 | 판정 | file:line / 근거 |
|-----|------|------|-----------------|
| 1 | scheme `merospos` 계승 | ✅ | `app.config.js:17` `...base` spread → `app.json:"scheme":"merospos"` |
| 1 | bundleIdentifier 계승 | ✅ | `app.config.js:17` `...base` → `app.json ios.bundleIdentifier:"id.meros.pos"` |
| 1 | plugins 계승 | ✅ | `...base` spread 10개 플러그인 그대로 |
| 1 | runtimeVersion 계승 | ✅ | `...base` → `"1.0.0"` 불변 · 기존 iPad 빌드 OTA 수신 가능 |
| 1 | eas.projectId 계승 | ✅ | `extra:{...base.extra, buildId}` → `"0ed85e16-4459-4094-afc5-29e3e8d6803f"` 보존 |
| 1 | updates 설정 | ✅ | `app.json`에 `updates` 키 없음 · EAS가 빌드 시점 채널 주입(eas.json) — 손실 없음 |
| 2 | git 없는 환경 폴백 | ✅ | `app.config.js:9` `catch { return 'unknown' }` · `stdio:'pipe'` 로 stderr 억제 |
| 3 | prettier 대량 변경 | ✅ | PR 변경 파일 7개 (실질 코드 4개) — 추가 서식 변경 0 |
| 3 | 어설션 통과 | ✅ | M2 리포트 43/43 PASS · 번들 증거: `buildId":"2908858 · 11-12 11:15"` |
| 4 | CI 캐시 키 변경 | ✅ | `ci.yml:42,81` `app.config.js` 추가 — 올바른 무효화 트리거 |
| 4 | #100/#101/#102 충돌 | ✅ | 3개 PR 모두 ci.yml 캐시 키 미수정 · 충돌 없음 |
| 5 | 앱 업데이트 경로 M2 대조 | ✅ | 아래 별도 섹션 |

---

## EAS/OTA 영향 판정

- **runtimeVersion `"1.0.0"` 불변**: app.config.js가 `...base` spread로 app.json 값을 그대로 계승 → 기존 iPad 개발 빌드가 OTA를 수신하는 데 지장 없음
- **EAS 클라우드 빌드**: git checkout 환경이므로 `getGitBuildId()` 정상 동작 · 번들에 커밋 해시 주입됨
- **git 없는 환경** (외부 Docker 등): try/catch `'unknown'` 폴백 → 번들 실패 0
- **채널 관리**: eas.json에서 `development/preview/production` 채널 각각 명시 · app.config.js가 이를 덮어쓰지 않음 ✅

---

## 앱 업데이트 경로 확인 (M2 "3줄" 대조)

M2 기술:
1. iPad에는 `expo-dev-client` 기반 `development` 채널 IPA가 설치됨
2. Mac Metro 직결: `expo start` → iPad QR 스캔 → 실시간 번들 → BUILD_ID 즉시 반영
3. EAS OTA: `eas update --branch development` → iPad 재시작 시 자동 적용

`eas.json` 대조:
- `build.development.channel: "development"` ✅
- `build.development.developmentClient: true` ✅ (expo-dev-client 확인)
- `cli.appVersionSource: "remote"` ✅

**M2 기술 정확. 정정 불필요.**

추가 주의사항 (오류 아님): app.json에 `updates.url`이 없어 OTA URL은 EAS 빌드 시점 주입. 채널 변경은 새 IPA 빌드 필요 — 현행 설정의 정상 동작.

---

## 이연 순증감

- 신규 파일: `app.config.js` (+1) · `docs/testing/m2-1105-as-build-id-bundle-verify.txt` (+1) = **+2**
- 삭제 파일: 0
- 어설션: 43/43 유지
