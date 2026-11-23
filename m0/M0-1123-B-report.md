# M0-1123-B · 보고

**판정**: **R1 서버 구현 완료 · PR 열림 (머지 대기 · Kyu 승인 소관)**. 테스트 통과(단위 551/551 · 신규 IT 7/7 · 회귀 cd-full-flow 8/8 · cd-pos-screen-sync 5/5 · customer-display 24/24). 라운드 상한 60 분 안.

## 핵심 숫자

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/413
- **브랜치**: `feat/M0-1123-B-pos-multi-customer-r1-server`
- **커밋 4개**:
  - `e2b20e2` feat(customer-display): lifecycle EOB(WIB) · phone_entry_open · 멀티-카트 priority
  - `8f99d70` feat(commerce-core): paid snapshot 보존 + 가드 제거 + closing_time 전달
  - `5df27ea` feat(customer-display): link-phone order_id 명시 가드
  - `88af7e3` test(customer-display): EOB · phone_entry_open · 병렬 결제 서버 회귀

## 테스트 로그 (요약)

| 수트 | 결과 | 비고 |
| --- | --- | --- |
| `pnpm test` (unit) | 551 passed / 47 suites | typecheck OK |
| `cd-parallel-pay.spec.ts` (신규) | 7/7 | T-01, T-02, T-03, T-04/T-06, T-13, link-phone 409, link-phone 통과 |
| `cd-full-flow.spec.ts` (회귀) | 8/8 | 기존 CD 흐름 그대로 |
| `cd-pos-screen-sync.spec.ts` (회귀) | 5/5 | M3-1119-S 기대값 v3 §5·§7 로 교체 |
| `customer-display-link-phone` 등 4 spec | 24/24 | link-phone 가드 하위호환 확인 |

**Known pre-existing**: `scripts/it.sh draft-orders` 패턴이 substring 으로 `draft-orders.spec.ts` + `split-pending-draft-orders.spec.ts` 를 한 Jest 프로세스에 묶어 Medusa cross-realm `Map.prototype.set` 에러 재현 (M0-1105-AP 이력). 각 spec 는 isolation 에서 모두 통과. 이번 PR 과 무관한 테스트 하네스 버그.

## R1 변경 요약

| 구성 | 변경 |
| --- | --- |
| `lifecycle.ts::computeLinkOpenUntil(paidAt, closing_time?)` | 영업 마감(WIB) 계산. `closing_time` 미제공 = 22:00 · 오류 = 23:59 fallback. 교대(register_session) 조기 종료와 독립. |
| `lifecycle.ts::pickBestSnapshot(snapshots, now)` | ① phone_entry_open (paid+창+미연결 · oldest paid_at lock-in) > ② active > ③ paid. |
| `lifecycle.ts::serializeSnapshot` | `phone_entry_open: boolean` 반환. |
| `lifecycle.ts::isPhoneEntryOpen` | 신규 export. paid+link_open_until 미경과+customer_phone null. |
| `service.ts::startSnapshotForRegister` | expire 루프에 paid 제외. |
| `service.ts::upsertSnapshotForRegister` | M3-1119-R/S 가드 (`isAdvanceToIdle`) 전면 제거. paid 매치 범위를 input.order_id scope 로 축소. existing(pickBest) 가 input 과 다른 주문이면 덮어쓰지 않고 새 active 를 추가 (병렬 멀티 카트). |
| `service.ts::markSnapshotPaid/markSnapshotPaidByOrder` | `closing_time?: string \| null` 입력 전달. |
| `subscribers/order-snapshot-paid.ts` | 매장별 `pos_settings.closing_time` 로드 후 `markSnapshotPaidByOrder` 에 전달. |
| `pos_settings DEFAULT.closing_time` | `"22:00"` (forward-fill). |
| `customer-display/snapshots/:id/link-phone` | 선택 `order_id` 검사 → 불일치=409 `order_mismatch`. |
| `admin/pos/loyalty/sessions/snapshots/:id/link-phone` | 동일 가드. |
| `types/customer-display.ts::OrderSnapshot` | `phone_entry_open?: boolean` 추가. |
| `docs/feature-map.yaml` | `cd-parallel-pay.spec.ts` 등록. |

## R2 앱 라운드가 써야 할 API 변경

| 엔드포인트 | 변경 | 비고 |
| --- | --- | --- |
| `POST /admin/pos/orders/:id/checkout-snapshot` | 변동 無 (order_id 는 URL param). 서버가 input.order_id ≠ existing 일 때 새 active 레코드를 추가하므로, R2 는 각 주문 칩별로 이 엔드포인트를 그대로 사용. | paid#X 보존 · 새 active#Y 생성. |
| `POST /customer-display/snapshots/:id/link-phone` | **선택 필드 `order_id?: string` 추가** · 담았는데 snapshot.order_id 와 다르면 **409 `order_mismatch`**. | R2 가 명시해 보내는 것 권장 (엉뚱한 주문에 적립 방지). 미제공 = 하위호환. |
| 응답 `OrderSnapshot.phone_entry_open: boolean` | **신규 필드**. CD 가 "지금 keypad 점유 중" 판정에 직접 사용. | CD 앱 R3 에서 바로 사용. |
| 응답 `OrderSnapshot.link_open_until` | 의미 변경 — 더 이상 `paidAt+10min` 아님 · **그날 영업 마감 WIB**. | POS 가 "번호 없음" 칩에 "영업 마감까지 적립 가능" 안내에 쓸 수 있음. |
| `POST /admin/pos/registers/:id/next-customer` | 변동 無. 이제 **유일하게 paid 를 명시적으로 종료**하는 경로. upsert 는 암묵적 종료 안 함. | 캐셔 "다음 손님" 버튼용. |
| `GET /admin/pos/loyalty/sessions/snapshots/active?register_id=...` | 변동 無. `phone_entry_open` 필드 추가 (serializeSnapshot 경유). | POS 가 "#1 entering" 흐림 상태 판정에 사용 가능. |

### 매장 설정 (영업 마감)

`pos_settings.closing_time` = `"HH:mm"` WIB. admin 설정 UI 는 후속 라운드 소관. 기본 `"22:00"` · 미설정 시 서버 fallback = 22:00 · 형식 오류 fallback = 23:59.

## Kyu 실기 체크리스트

- [ ] `pnpm typecheck` · `pnpm test` · `bash scripts/it.sh` 로컬 검증 (storeport root).
- [ ] 실 운영 환경에서 매장별 `pos_settings.closing_time` 확인 (현재는 기본값 `"22:00"` · 변경 필요 시 admin API 또는 DB).
- [ ] PR #413 리뷰 → 머지 (T0 에 "착지" 지시).
- [ ] 머지 후 R2 (POS fork 앱 라운드) · R3 (customer-display CD 앱 라운드) 라운드 발부 시, 이 리포트의 "R2 앱이 써야 할 API 변경" 섹션을 전달.

## 운영 접근 · 범위 밖

- 운영 SSH · railway CLI · 운영 DB · 키체인 전부 미접근.
- 머지 · 운영 반영 · 스모크 QC 는 Kyu/T0 소관.
- `scripts/it.sh` substring 패턴 매칭 버그는 본 PR 범위 밖 (별도 처리).

---

_생성 시각: 2026-11-23 14:xx WIB · 모델: Opus · 라운드 상한 60분 안 완료._
