PR #149 · 뱃지 4상태(hidden/connected/entering/offline) · 폴링 10s · CI 단위테스트 12/12 ✅ ESLint ✅

## 구현 요약

### 파일
| 파일 | 역할 |
|---|---|
| `lib/loyalty-snapshot.ts` (신규) | `OrderSnapshot` v2 타입 · `classifyCustomerDisplay` 순수 함수 |
| `api/hooks/pos-loyalty.ts` (확장) | `useCustomerDisplaySnapshot(registerId?)` — 10s 폴링 · `enabled: !!registerId` |
| `components/loyalty/CustomerDisplayStatus.tsx` (신규) | 뱃지 컴포넌트 4상태 · lucide SVG 스트로크 아이콘 |
| `app/checkout/[draftOrderId].tsx` | `Stack.Screen headerRight` 에 `CustomerDisplayStatus` 마운트 |
| `__tests__/loyalty-snapshot.test.ts` (신규) | 경계 15s/30s 포함 12개 단위 테스트 |

### 뱃지 판정 로직
```
snapshot=null                               → hidden
polled_at=null                              → connected (최초 연결 대기)
server_now − polled_at > 30s               → offline ("Customer Display Offline" + MonitorOff)
active && !pre_entry && diff ≤ 15s         → entering ("Entering Number" + MonitorSmartphone)
그 외                                       → connected (초록 점 w-2.5 h-2.5 rounded-full bg-green-500)
```

### API 계약
- `GET /admin/pos/registers/:register_id/snapshot`
- `register_id` = `settings.data?.stock_location?.id` (P1 proxy)
- 응답: `{ snapshot: OrderSnapshot | null }`

## CI 결과
- 단위 테스트: 12/12 통과 (vitest)
- ESLint: 에러 없음
- TypeScript: 신규 에러 없음 (기존 pre-existing 에러 무관)
- 웹/시뮬레이터 스샷: **미검증** — 서버 `GET /admin/pos/registers/:id/snapshot` 미구현 상태. 현재 뱃지는 항상 `hidden` 렌더링.

## Kyu 실기 항목
- [ ] M0-1105-CB S1a snapshot 엔드포인트 완료 후 연동
- [ ] 손님 iPad 10s 폴링 · `polled_at` 갱신 확인
- [ ] 뱃지 전환: connected → entering → offline(30s 무폴링)
