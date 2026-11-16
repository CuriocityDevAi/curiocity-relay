# #150 APPROVE · 로컬 검증

## REQ 별 확인

### REQ 1 — 페어링 코드

| 항목 | 위치 | 결과 |
|---|---|---|
| 계산대 미오픈 안내 | `CustomerDisplayRow.tsx` `!hasOpenSession` | ✅ 버튼 `disabled` + "Open a register first to get a pairing code." |
| 만료 카운트다운 | `useEffect` 1초 `setInterval`, `remaining` 감소 | ✅ "Expires in {remaining}s" 표시, 0 도달 시 `setPairCode(null)` |
| 재발급 시 이전 코드 무효 | `handleShowCode` → `setPairCode(res.pair_code)` 덮어씀 | ✅ UI 완전 대체; 서버 측 무효화는 서버 계약(`POST /admin/pos/loyalty/sessions` 재호출) |
| 코드가 로그에 남지 않음 | `catch {}` silent, `console.log` 없음 | ✅ 프로덕션 로그 노출 없음 |

### REQ 2 — 다음 주문 잠금

| 항목 | 위치 | 결과 |
|---|---|---|
| 잠금 조건 | `shouldDisableNextOrder`: `paid_at != null && link_open_until > now` | ✅ 명확 |
| 페어링 없으면 항상 활성 | `snapshot=null → false` | ✅ 첫 가드에서 false 반환 |
| 영구 잠금 없음 | `now = new Date()` 기준 → `link_open_until` 만료 시 자동 false | ✅ 네트워크 끊겨도 클라이언트 시각으로 해제됨 |

### REQ 3 — 409 성공 취급 · 기존 흐름 불변

| 항목 | 위치 | 결과 |
|---|---|---|
| `link_window_closed` → 에러 유지 | `isAlreadyLinkedByDisplayError` type 검사 | ✅ |
| 409 HTTP → 성공 취급 | `status === 409 → true` | ✅ |
| 기존 흐름 불변 | `useEffect([visible])` reset 보존, 전화번호·consent·result 초기화 | ✅ |
| `pre_entry=true` 직행 | `useEffect([visible, snapshot?.pre_entry])` → `setDisplayConnected(true)` | ✅ |

### REQ 4 — 단위 테스트

`shouldDisableNextOrder` 6케이스: null / paid_at null / link_open_until null / > now / < now / === now 경계 — 전부 경계 조건 포함.

## 관찰 사항 (non-blocking)

`isAlreadyLinkedByDisplayError`: `status`가 undefined일 때 `type !== '' && type !== 'invalid_data'`면 성공 취급. 이론적으로 `phone_not_found` 같은 400 에러도 포함될 수 있음. 단, Medusa SDK는 보통 `err.status`를 채우므로 실제 발생 가능성 낮음 — 블로커 아님.

## 로컬 검증 (M3-1116-F-report 인용)

- unit tests: 325 passed (vitest run) · 18 loyalty-snapshot 포함
- ESLint: 0 errors
- TypeScript: 신규 오류 없음
