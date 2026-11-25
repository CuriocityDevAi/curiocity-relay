# R0-1125-AI 리포트

판정: **#437 스레드 3건 Resolve 완료 · #266 CHANGES (블로커 1건)**

---

## 1. storeport #437 — 스레드 resolve

| 스레드 | 내용 | 상태 → 조치 |
|---|---|---|
| `PRRT_kwDOTe-UYs673jK2` | Blocker 1 · customer-display TS2304 (outdated) | Resolved ✅ |
| `PRRT_kwDOTe-UYs673jTQ` | Blocker 2 · feature-map-check unmatched | Resolved ✅ |
| `PRRT_kwDOTe-UYs673jk1` | Blocker 3 · standalone install lockfile | Resolved ✅ |

근거: 최신 리뷰 R0-1125-AH (commit `38f3624`) 에서 3건 모두 해소 확인됨. CI 직접 확인은 `ci-cloud-quota-exceeded` 라벨로 불가, 코드 레벨 검증 완료.

---

## 2. pos-fork #266 — 계약서 v1.1 §1·§2·§5 대조

### 판정: CHANGES 🔴 (블로커 1건)

| 항목 | 계약서 | #266 구현 | 판정 |
|---|---|---|---|
| 칩 5분류 결정 소스 | customer_flow.state 단독 | classifyCustomerFlowChip(flow.state) | ✅ |
| 칩 문구 entering/first_visit | "Customer typing •••" | Customer typing + Dots | ✅ |
| 칩 문구 confirming | "Awaiting confirm · \<phone\>" | 그대로 | ✅ |
| 칩 문구 confirmed | "✓ \<phone\> · IDR \<balance\>" | Check + phone + IDR balance | ✅ |
| 칩 문구 unconfirmed/skipped | "Not confirmed · Link customer" | 그대로 (tappable) | ✅ |
| Next customer 경고 조건 | entering/first_visit/confirming | requiresNextCustomerWarning 동일 3상태 | ✅ |
| [Keep waiting] reset 횟수 | 0회 | 닫기만, executeNextCustomer 없음 — 테스트 ✓ | ✅ |
| [Next customer anyway] reset 횟수 | 1회 | executeNextCustomer(false) 1회 — 테스트 ✓ | ✅ |
| POST body | { action, phone? } | { action, phone? } — 계약 준수 | ✅ |
| 응답 ok/reason 분기 | ok/reason, 상태코드 분기 없음 | CustomerFlowActionResult {ok, reason?, customer_flow} | ✅ |
| **서버 #445 route 실제 body** | **{ action, phone? }** | **서버가 snapshot_id 추가 필수화 → 400** | 🔴 |
| Link customer → link_phone | link_phone → confirming | useCustomerFlowAction({action:'link_phone',phone}) | ✅ |
| subscriber 가드 (#445) | confirmed + paid → 적립 | customer_flow_state='confirmed' 가드 | ✅ |
| sell.tsx Next customer 추가 | — | Register 메뉴 추가 (products.tsx href:null E2E 우회) | ✅ |
| Unit 23건 | — | 9+9+2+3=23 ✓ | ✅ |
| E2E 5건 | — | chip A/B/C/D + 경고 시트 ✓ | ✅ |

### 🔴 Blocker — snapshot_id 계약 위반

계약서 §2 body: `{ action, phone? }`. POS client #266은 이를 그대로 따름.  
서버 #445 `api/admin/pos/customer-flow/route.ts`는 `snapshot_id` 를 필수로 추가:
```ts
if (!snapshotId || !action) → 400 "snapshot_id + action required"
```

POS가 `{ action: 'link_phone', phone }` 를 보내면 런타임 400 실패. link_phone · reset 모두 영향.

수정 책임: **#445 서버 route** (계약이 옳음). `snapshot_id` optional 처리 또는 POS 세션에서 활성 snapshot 자동 조회.

### ⚠️ 주의 (non-blocking) — Link customer 적립 흐름 변화

이전: useLinkCustomer → linkCustomerToOrder → 즉시 적립.  
신규: link_phone → CD confirming → CD 손님 확인 후 적립.  
CD 미연결 또는 손님 미확인 시 적립 없음. 계약 §3 의도된 변경. 운영팀 사전 안내 필요.

---

## 3. M1 CD 앱 PR

미출시 — 별도 프롬프트에서 셋 함께 최종 대조 예정.
