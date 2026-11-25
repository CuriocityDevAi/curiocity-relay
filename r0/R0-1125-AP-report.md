#267 APPROVE

## R0-1125-AP — fork #267 리뷰 (POS app.config.js updates.url)

**판정: APPROVE** (자기 PR 제한으로 GitHub에 COMMENT 이벤트로 제출)

### 변경 내용
`app.config.js`에 `updates: { url: 'https://u.expo.dev/0ed85e16-4459-4094-afc5-29e3e8d6803f' }` 3줄 추가. 단독 파일 수정.

### 검토 항목

| 항목 | 결과 |
|------|------|
| updates.url ↔ eas.projectId 일치 | ✅ 동일 UUID `0ed85e16-…` |
| runtimeVersion("1.0.0") 공존 | ✅ app.json 고정값, `...base` spread 로 상속 |
| development 채널 격리 | ✅ eas.json channel: "development" |
| preview 채널 격리 | ✅ eas.json channel: "preview" |
| production 채널 격리 | ✅ eas.json channel: "production" |
| 비밀값 커밋 없음 | ✅ url은 public EAS 엔드포인트; SENTRY_DSN은 EAS Secret ref |
| 변경 파일 단독(app.config.js) | ✅ 3 additions, 0 deletions |
| unit-tests | ✅ SUCCESS |
| flow-tests | ✅ SUCCESS |
| assertions | ✅ SUCCESS |
| lint | ✅ SUCCESS |
| playwright | ✅ SUCCESS |
| heavy-cloud | ⏭ SKIPPED (정상) |

### 비고
- `updates` 블록에 `enabled` / `checkAutomatically` 미명시 → Expo SDK 기본값(enabled: true, ON_LOAD) 적용으로 동작 무방.
- production 빌드가 아직 없으므로 merge 후 `eas build --profile production` → 설치 → 이후 OTA 가능.
