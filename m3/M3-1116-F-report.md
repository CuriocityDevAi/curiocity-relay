# M3-1116-F — PR #150 · 페어링 코드 위치: Settings > Customer Display · 버튼 잠금: shouldDisableNextOrder(paid_at+link_open_until) · 409 처리: link_window_closed 외 → 성공 취급 · 로컬 검증: 18 unit PASS · ESLint 0 error · tsc 신규 오류 없음

## 구현 파일

| 파일 | 역할 |
|---|---|
| `lib/loyalty-snapshot.ts` | `shouldDisableNextOrder` 순수 함수 추가 |
| `api/hooks/pos-loyalty.ts` | `useCreatePairingSession` (POST /admin/pos/loyalty/sessions) 추가 |
| `components/loyalty/CustomerDisplayRow.tsx` (신규) | 설정 화면 Customer Display 섹션 |
| `app/(tabs)/settings.tsx` | CustomerDisplayRow 삽입 |
| `components/payment/SuccessReceiptAnim.tsx` | 3상태 LinkCustomerCard + 버튼 잠금 + 툴팁 |
| `app/checkout/success/[orderId].tsx` | snapshot 폴링 wiring + linkedResult/isLinkedByDisplay 상태 |
| `components/loyalty/LinkCustomerSheet.tsx` | pre_entry 직행 + 409 성공 취급 |
| `__tests__/loyalty-snapshot.test.ts` | shouldDisableNextOrder 6개 케이스 추가 (총 18 pass) |

## REQ 구현 요약

### REQ 1 — 설정 화면 Customer Display 섹션
- `CustomerDisplayRow` 컴포넌트 (PrinterRow 패턴):
  - 계산대 미오픈: [Show pairing code] 비활성 + "Open a register first to get a pairing code."
  - 계산대 오픈: [Show pairing code] → `POST /admin/pos/loyalty/sessions` → 6자리 `NNN NNN` (`text-7xl font-bold`) + 카운트다운 + [Re-issue code]
  - 연결된 기기: "Connected · Last signal N min ago" 카드 (server_now - polled_at 기준)
- Settings 탭에 `<CustomerDisplayRow />` 삽입

### REQ 2 — 결제 완료 화면 3상태 + 버튼 잠금
- `LinkCustomerCard` subcomponent (3상태):
  1. `linkedResult != null` → Phone masked + Credit balance 카드
  2. `isLinkedByDisplay` → "Connected from customer display" 카드
  3. snapshot badge = `entering` → "Customer is entering number on display..." 카드
  4. default → [Link customer] 버튼
- Hand over / Done 버튼: `shouldDisableNextOrder(snapshot)` 시 비활성 + "Waiting for customer to enter loyalty number." 툴팁
- 페어링 없으면(snapshot=null) → 항상 활성

### REQ 3 — 동시 연결 선착순
- `LinkCustomerSheet`: `visible && snapshot?.pre_entry` → `displayConnected=true` 직행 ("Connected from customer display")
- 409 오류: `isAlreadyLinkedByDisplayError(e)` — link_window_closed 타입 제외 · HTTP 409 or 알 수 없는 타입 → 성공 취급

### REQ 4 — 단위 테스트
- `shouldDisableNextOrder` 6케이스 (null·paid_at null·link_open_until null·> now·< now·=== now 경계)
- 전체 18 pass (기존 12 + 신규 6)

## 로컬 검증
- **unit tests**: 325 passed (vitest run) — 18 loyalty-snapshot 포함
- **ESLint**: 0 errors (warnings = 기존 react-hooks/set-state-in-effect 패턴)
- **TypeScript**: 신규 오류 없음 (기존 pre-existing 무관)
- **UI 검증**: 서버 엔드포인트 미구현 상태 — snapshot=null로 항상 렌더 (버튼 활성 · Link customer 버튼 표시 · CustomerDisplayRow 비활성)
