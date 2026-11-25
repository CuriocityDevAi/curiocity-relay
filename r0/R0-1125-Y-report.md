#434 CHANGES · #262 CHANGES · #437 CHANGES

## PR별 검증 표

### #434 storeport · M0-1125-J (setup-multi-store ExecArgs fallback)

| 항목 | 결과 | 비고 |
|------|------|------|
| process.argv fallback — medusa exec 자체 옵션 오인 없음 | ✅ | 스크립트 토큰 뒤만 추출, `--` 제거 |
| 컴파일된 `.js` 경로 매칭 | ✅ | regex `/setup-multi-store(\.(c|m)?[jt]s)?$/` |
| 환경변수 쉼표·공백 보존 | ✅ | 문자열 그대로 복사, 테스트 커버 |
| dry-run 머리말 출처(arg/env/default) 로그 | ✅ | rawArgv·ExecArgs·sources 출력 |
| assertSafeApply — 4개 필드 중 default 있으면 중단 | ✅ | env 경로도 통과 |
| 멱등 테스트 (M0-1125-H) 에 4개 필드 추가 | ✅ | assertSafeApply 대응 |
| **판정** | **APPROVE** | minor: apply 모드 sources 로그 없음 (non-blocking) |

**판정 근거:** GitHub 본인 PR 제한으로 APPROVE 이벤트 불가 → COMMENT 리뷰로 "APPROVE" 명시 제출.  
실질 판정 = **APPROVE**.

---

### #262 agilo-medusa-pos-fork · M3-1125-M (QRIS Q1~Q3)

| 항목 | 결과 | 비고 |
|------|------|------|
| Q1 · QRIS 탭 → checkout_review emit | ✅ | payment_qris → checkout_review 수정 |
| Q1 · tender-qris 에서 여전히 payment_qris | ✅ | |
| Q2 · SecureStore 삭제 보류 (is_complete=false · dp_paid) | ✅ | 조건 분기 추가 |
| **Q2 · 결제 완료 시 deleteItemAsync 실제 동작 테스트** | ❌ | 소스 어설션만, 분기 동작 미검증 |
| Q3 · paymentCollectionId route param 전달 | ✅ | tender-cash → tender-qris |
| Q3 · useQrisRegenerate body payment_collection_id | ✅ | QrisRegenerateInput 타입 추가 |
| Q3 · 409 → metadata.tenders 이어하기 · paid → success | ✅ | |
| Q3 · onNewQr 전 paid 상태 선확인 | ✅ | 이중 결제 방지 |
| Q3 · qris-cancel 버튼 숨김 | ✅ | 주석 처리 (M0 대기) |
| 돈 안전 · 뒤로 가기 자동 취소 없음 | ✅ | |
| **판정** | **CHANGES** | |

**blocking:** Q2 non-draft guard — `is_complete=true` tender 로 `onSuccess` 호출 시 `deleteItemAsync` 실제 호출 여부 단위 테스트 필요. 현재 소스 텍스트 순서 확인만으로는 "다음 주문이 옛 draft를 붙잡는 회귀 위험" 미검증.  
**non-blocking:** `paymentCollectionId ?? ''` guard 권장.

---

### #437 storeport · M1-1125-N (손님화면 영수증 = POS)

| 항목 | 결과 | 비고 |
|------|------|------|
| patchSnapshotReceiptByOrder 추가 · 최신 snapshot 머지 | ✅ | created_at 정렬 후 최신 snapshot 패치 |
| mintSaleReceiptStep → patch 호출 | ✅ | REGISTER_SESSION_MODULE 연결 |
| patch 실패 non-fatal | ✅ | try/catch · console.warn |
| line_total = subtotal 우선 (세금 전) | ✅ | subtotal > 0 이면 우선, 없으면 unit_price×qty |
| Order #190 회귀 테스트 (품목·PB1·합계·번호) | ✅ | Coffee Latte+Iced Tea·Cash 52,800 |
| **M0-1125-K · line_total vs total 필드명 충돌 확인** | ❌ | 이 PR diff에 확인 근거 없음 |
| Medusa v2 subtotal 프로모션 케이스 | ⚠️ | 테스트 없음, 현재 미사용이면 non-blocking |
| DEFAULT_LIVE_STORE taxRate 11 폴백 | ✅ | patch 성공 시 덮어씌워짐 |
| **판정** | **CHANGES** | |

**blocking:** M0-1125-K 가 `tenders/route.ts` items `line_total → total` 변경 중. merge 순서에 따라 CD 가 `undefined` 를 읽는 충돌 위험. 두 PR 필드명 정책을 단일화하거나, 충돌 없다면 diff 근거 명시 필요.  
**non-blocking:** `subtotal === 0` 케이스 폴백 동작, 프로모션 케이스 미검증.

---

## 요약

| PR | 결과 |
|----|------|
| storeport #434 (M0-1125-J) | **APPROVE** (COMMENT 이벤트로 제출) |
| agilo-medusa-pos-fork #262 (M3-1125-M) | **CHANGES** (Q2 non-draft guard 단위 테스트) |
| storeport #437 (M1-1125-N) | **CHANGES** (M0-1125-K 필드명 충돌 확인) |

CI check_runs: GitHub MCP 403 으로 접근 불가 — CI 상태 미확인.  
본인 PR 제한으로 APPROVE/REQUEST_CHANGES 이벤트 대신 COMMENT 이벤트로 리뷰 내용 제출.
