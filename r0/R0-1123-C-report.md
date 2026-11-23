#229: APPROVE · #413: CHANGES

## #229 — fork 미러링 2뿌리 수정 (CdPreviewWindow · CdPreviewOverlay)

**판정: APPROVE**

### 검증 항목

| 항목 | 결과 |
|------|------|
| 운영 `mirror.html` 이 mirror 번들을 받는지 | ✅ `curl /mirror.html` → `mirror-d0324e4246…js` (M1-1123-B-report §재현로그 1 실측) |
| 힌트 덮어쓰기가 서버 snapshot 있을 때 서버 값을 잘못 가리지 않는지 | ✅ 힌트 없으면 `snapshot ?? null` 그대로(하위호환). 힌트 있으면 `pos_screen` 덮어씀 — 미리보기 창 목적상 POS 로컬 상태 우선이 올바름 |
| CI | check runs API 403 불가. 2파일·로직 협소·실측 증거 일치로 pre-existing 기인 판단 |
| Playwright mirror 화면 전환 | 미실행 — WebView 네이티브 컴포넌트라 fork e2e inject 검증 불가. `curl /mirror.html` 1-command 재현 가능 |

### 근거

- 뿌리 1: `MIRROR_URL` 1토큰 수정으로 `/mirror` → `/mirror.html`. 서버 패치(`cdwResolveFile .html 폴백`) 적용 후에도 멱등.
- 뿌리 2: `usePosScreenHint` wiring이 cart/checkout/success 등에 이미 완료, Overlay가 유일한 미연결 지점(relay M1-1123-B §고리5). 추가 11줄로 완결.
- 머지 순서: 이 PR 단독 머지 가능. 서버 패치는 M0 소관.

---

## #413 — storeport R1 서버 (paid 보존 · phone_entry_open · EOB · order_id 가드)

**판정: CHANGES**

### 통과 항목

- `startSnapshotForRegister` paid 보존 (`if paid continue`) ✅
- M3-1119-R/S 가드 제거 (`isAdvanceToIdle` 블록 전체 삭제) ✅
- `pickBestSnapshot` 우선순위 (phone_entry_open rank1 > active rank2 > paid rank3, oldest paid_at tiebreak) ✅
- `computeLinkOpenUntil` EOB — closing_time null=22:00 · 형식오류=23:59 · paidAt 마감넘김=23:59 fallback ✅
- `phone_entry_open` 직렬화 (`serializeSnapshot` 추가) ✅
- order_id 가드 409 (admin/CD 두 경로, 하위호환) ✅
- pos_settings `closing_time` 기본 "22:00", subscriber 로드 ✅
- 단위·통합 테스트 551/551 · 신규 7/7 (PR description 기준) ✅
- split tender 회귀: active 단계는 paid 보존 로직 비해당 → 무영향 ✅

### CHANGES 1 — `lifecycle.ts:isPhoneEntryOpen` : 30초 타임아웃/No thanks 후 `phone_entry_open=true` 미종료

**경로**: CD 앱이 타임아웃/No thanks 시 `router.replace("/")` 만 실행 — 서버 API 호출 없음 (`keypad-after.tsx:onSkip/onTimeout`).

결과: `customer_phone=null` · `link_open_until=EOB` 유지 → `isPhoneEntryOpen=true` → `pickBestSnapshot` rank 1 유지 → CD 재폴링 시 keypad 재진입 가능. v2(10분 TTL) 대비 최대 하루 종일 CD 잠금.

**relay §8-② 위반**: "1번 종료 시 2번 결제 화면은 CD 자동 복귀". timeout/No thanks가 1번 입력 종료인데 `phone_entry_open=true` 유지로 2번 CD 자동 복귀 안 됨.

**요청**:
1. `POST /customer-display/snapshots/:id/skip-phone` 엔드포인트 추가(sentinel `customer_phone` 세팅으로 `phone_entry_open=false` 전환), **또는**
2. PR description + R3 작업 목록에 "timeout/No thanks 시 phone_entry_open=true 유지 · R3 CD 앱에서 skip-phone 또는 dismissed-snapshot 로컬 추적 필요" 명시

### CHANGES 2 — `service.ts:nextCustomerForRegister` : session-level 종료 → 멀티 카트 cross-order 간섭

`nextCustomerForRegister(register_session_id)` 가 non-expired 전부 expire (session 단위).

**멀티 카트 시나리오**: 1번 paid(keypad) + 2번 paid 동시 → 캐셔가 2번 success page "Next customer" → `nextCustomerForRegister` → **1번 paid(소급 창 아직 열림)도 함께 expire** → 1번 소급 적립 불가.

**요청**:
1. order_id 단위 종료 메서드(`nextCustomerForOrder`) 추가 + success page에서 호출, **또는**
2. PR description에 "멀티 카트에서 `nextCustomerForRegister`는 session 전체 종료 — 단일 카트 흐름에서만 사용. 개별 주문 종료는 R2/R3 추가 설계 필요" 명시

### 미검증

- CI check runs 접근 불가(403)
- T-11 `tenders.spec.ts` split tender 회귀: 이 PR diff 미포함 (설계 근거로만 완화)
