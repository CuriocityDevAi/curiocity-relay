PR #346 · customers route 206→115줄 / search 226→30줄 / summary 239→34줄 · step 4개 · 테스트 11개

## 완료 내용

**브랜치**: `refactor/M2-1117-X-customer-identity-workflow`
**PR**: https://github.com/CuriocityDevAi/storeport/pull/346

### 추출된 step/workflow
| step | 파일 | 역할 |
|------|------|------|
| `findCustomerByPhoneStep` | `steps/find-by-phone.ts` | 번호 정규화 + 기존 손님 조회 |
| `upsertCustomerByPhoneStep` | `steps/upsert-customer.ts` | 빈칸 채우기 or 신규 생성 |
| `searchCustomersStep` | `steps/search-customers.ts` | 4-경로 검색(전화·부분·이름/이메일·최근) |
| `getCustomerSummaryStep` | `steps/get-customer-summary.ts` | 구매액·방문·포인트·거래 내역 |
| `customerIdentityWorkflow` | `index.ts` | findByPhone + upsert 묶음 |

### route 줄 수 (before → after)
- `customers/route.ts`: 206 → 115줄
- `search/route.ts`: 226 → 30줄  
- `[id]/summary/route.ts`: 239 → 34줄

### 테스트
- 단위 테스트 11개 all PASS (`wing_online` 채널 가정)
- 전체 unit suite 477개 PASS

### Wing/CA 입구 설계 메모 (구현 보류)
1. Wing storefront → Medusa publishable key 인증 + custom store route (`POST /store/pos-customers`) 에서 `doUpsertCustomer` 직접 호출.
2. CareAgent(CF Workers) → service account API key 로 `POST /admin/customers` 직접 호출 or `POST /internal/customers` 전용 경량 route 신설 (Worker-to-Worker 인증).
3. 두 채널 모두 이번 라운드에서는 로직 추출만 완료. 실제 입구(route + 인증) 구현은 Wing MVP / CA MVP 라운드에서.

## 동작 불변 확인
- `lib/phone-id.ts` · `lib/find-customers-by-phone.ts` 의미 변경 없음 (호출만)
- POS HTTP 계약(400/409/200/201 응답) 그대로 유지
- 기존 통합 테스트 회귀 없음 (Kyu 실기 1회 필요)
