#376 CHANGES · /me route 존재 X · 404 처리 안전 O · 재시작 e2e X(EAS 미빌드)

## REQ 체크리스트

| # | 항목 | 판정 | 비고 |
|---|------|------|------|
| 1 | `GET /customer-display/me` route 존재 | ❌ | commerce-core 5개 route 목록 확인, me/route.ts 없음 |
| 2a | 오프라인 → token 유지 | ✅ | catch → { status: "ok", token } |
| 2b | 401 → token 삭제 | ✅ | clearDeviceTokenAsync() 호출 |
| 2c | localStorage → SecureStore 1회 이전 | ✅ | migrateTokenIfNeeded() 중복 방지 포함 |
| 3 | 웹 e2e 재시작 시뮬레이션 | ❌ | EAS dev-client 미빌드 · 로컬 실행 불가 |
| 4a | Re-pair 확인 대화상자 | ✅ | Alert.alert + cancel/destructive |
| 4b | 가로/세로 레이아웃 | ✅ | position: absolute 좌하단 고정 |
| 5a | unit 테스트 | ✅ | 11개 pass (실제 모듈 미직접 커버) |
| 5b | typecheck | ✅ | PR 기재 0 errors |

## 판정: CHANGES

### Blocker: GET /customer-display/me route 미존재

commerce-core에 존재하는 /customer-display/ 하위 route:
- pair/route.ts
- display-config/route.ts
- snapshots/[id]/route.ts
- snapshots/active/route.ts
- snapshots/[id]/link-phone/route.ts

me/route.ts 없음 → bootCheck()가 항상 404 수신.

404 처리 경로:
```
if (res.ok)             → "ok"      // 200
if (res.status === 401) → "invalid" // 401
return { status: "ok", token }      // 404 포함 그 외 모든 코드 ← 여기
```

404 → "ok" 반환 → 앱이 무한 pair 루프에 빠지지는 않음 (치명 아님).
그러나 bootCheck의 핵심 목적(폐기 토큰 부팅 시 감지)이 완전히 비활성화됨.
무효 토큰도 "ok"로 통과, 첫 snapshots/active 폴링 미들웨어 401까지 감지 불가.

필요 작업:
1. apps/commerce-core/src/api/customer-display/me/route.ts 추가
2. middlewares.ts에 deviceTokenMiddleware 적용 추가

### Minor
- JSDoc 불일치: "other HTTP error → treat as invalid" ≠ 실제 "ok" 처리
- 테스트 간접성: pairing.ts 함수 직접 미import, 추후 vi.mock("expo-secure-store") 보완 권장
