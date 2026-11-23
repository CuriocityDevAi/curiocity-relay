#231: CHANGES

## 판정: CHANGES

자기 PR(CuriocityDevAi)이므로 REQUEST_CHANGES 불가 → COMMENT로 제출.

---

## ① diff 검증

변경 파일 정확히 2개 — REQ 조건 충족 ✓

| 파일 | 변경 내용 |
|------|-----------|
| `components/cd-preview/CdPreviewWindow.tsx` | `MIRROR_URL` = `${MEROS_CD_WEB_URL}/mirror` 복귀 (+9/-10), 주석 업데이트 |
| `e2e/flows/M1-1123-F-mirror.spec.ts` | 신규 e2e 테스트 추가 (+77) |

그 외 변경·되돌림 없음 ✓

부수 관찰: CdPreviewWindow.tsx 신규 주석이 일본어 (코드베이스 나머지는 한국어) — 기능 무관.

---

## ② R0-1123-F 판정 근거 유효성

cherry-pick(0dde0d0) 그대로 적용됨 ✓

- `/mirror.html` → expo-router가 `/mirror.html` 라우트를 탐색 → "Route Page" 표시 (버그 원인)
- M0-1123-C 서버 fix(cdwResolveFile) 배포 완료 → `/mirror` extensionless도 `mirror-*.js` 올바르게 반환
- R0-1123-F 판정 근거 그대로 유효 ✓

---

## ③ CI 결과

| 체크 | 결과 |
|------|------|
| lint | ✓ pass (51s) |
| route | ✓ pass ×2 (8s) |
| assertions | ✓ pass (1m15s) |
| flow-tests | ✓ pass (42s) |
| heavy-cloud | — skipping |
| **playwright** | **X FAIL (25m timeout)** |

### playwright 실패 원인

`e2e/flows/M1-1123-F-mirror.spec.ts:6-7`에서 외부 프로덕션 URL을 직접 호출:

```ts
const MIRROR_URL = 'https://admin.meros.id/customer-display-web/mirror?mock=1';
const MIRROR_HTML_URL = 'https://admin.meros.id/customer-display-web/mirror.html?mock=1';
```

CI runner가 `https://admin.meros.id/...`에 접근하지 못하거나 응답 대기 중 25분 최대 실행 시간 초과로 job 취소됨. `Expo export web` 단계는 성공했으므로 테스트 로직 자체의 문제가 아닌 CI 환경 의존성 문제.

### 수정 방향

- Expo export 출력물을 `serve`로 로컬 서빙 후 `baseURL=http://localhost:PORT` 사용
- 또는 `page.route()` mock으로 외부 URL 의존성 제거

---

## 결론

핵심 변경(`MIRROR_URL` `/mirror` 복귀)은 올바르나 playwright CI가 외부 URL 의존으로 타임아웃. e2e 테스트를 CI-safe하게 수정 후 재제출 필요.
