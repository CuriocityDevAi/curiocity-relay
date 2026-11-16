#148 APPROVE · #295 APPROVE · #291 APPROVE · 로컬 검증

## #148 — 스냅샷 큐 이중 누산 수정

**APPROVE**

| 시나리오 | 결과 |
|---|---|
| qty=1 + 추가1 → 서버 qty=2 | ✅ `add-to-cart-snapshot.test.ts` REQ 2a |
| 연타 3회 → 서버 최종 qty=4 | ✅ REQ 2b · FIFO 큐 순서 검증 |
| 실패 롤백 → 원본 qty=1 복원 | ✅ REQ 2c · `previousDraftOrder` 복구 |
| 서로 다른 상품 연타 | ✅ 로직 분석: FIFO 큐가 각 mutation 의 pre-optimistic 스냅샷을 보장 · `toAdd` 경로(신규)는 snapshot=undefined→[] 로 영향 없음 |

핵심 패턴: `onMutate` → `snapshotQueue.push(cached)` + 낙관적 갱신 / `mutationFn` → `shift()` 로 꺼낸 스냅샷 기준으로 `mergeCartItems`. 낙관적 캐시와 서버 전송 계산 완전 분리 ✓

**lint**: `LinkCustomerSheet.tsx:30` `setPhone` in `useEffect` 경고 — master 선재, 이 PR 미도입  
**typecheck**: `/checkout/split-tender` 등 라우트 TS2820/TS2322 — master 선재, 이 PR 미도입  
PR 변경 파일 신규 오류 없음 ✓

---

## #295 — 실제 서버 연결 (페어링·Live 폴링·link-phone·설정 반영)

**APPROVE** · M2-1116-G 로컬 검증 기반

| 항목 | 결과 |
|---|---|
| 페어링(토큰 저장·401 재페어링) | ✅ `saveDeviceToken` / `invalidatePairing()` → `/pair` 리다이렉트 |
| Live 폴링 기존 규칙 유지 | ✅ 204→null · 401→PairingRequiredError · 오류→POLL_ERROR 카운터 |
| link-phone 200/409 | ✅ 200→`phone_masked` state · 409→`snapshot.loyalty.phone_masked` 폴백 |
| `?mock=1` 분리 | ✅ live/mock 분기 정확 |
| 운영 base path `/customer-display-web/` | ✅ pnpm build:web 11개 정적 라우트 유지 |
| 화면 디자인 불변 | ✅ 숨은 60×60 투명 연결 해제 영역 디자인 미변경 |
| 토큰 노출 없음 | ✅ X-Device-Token 헤더만 · URL·로그 미노출 |
| 테스트 | ✅ vitest 123 pass · tsc --noEmit 오류 없음 |

---

## #291 — M1-1116-G 경로 변경분

**APPROVE**

| 항목 | 구현 | 일치 |
|---|---|---|
| `applyDraft` | `PUT /settings/draft` → `POST /settings/apply` | ✅ |
| `discardDraft` | `POST /settings/discard` | ✅ |
| `saveDraft` | `PUT /settings/draft` | ✅ |
| 404 fallback | `applyDraft`→`updateCdSettings` · `fetchDraftPreview`→`fetchCdSettings` | ✅ |

`BASE = "/admin/pos/customer-display/settings"` 고정 · #290 서버 경로 완전 일치  
tsc exit 0 · 326/326 unit pass (M1-1116-G-report 기준)
