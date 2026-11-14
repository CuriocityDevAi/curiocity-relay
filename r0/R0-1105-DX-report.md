# R0-1105-DX — 최종 재확인 리포트

head SHA: 69ec9e18b319b7e6c699d3ce3c0cbd092fa208cd  
CI run: 43463011784 — 4/4 SUCCESS (assertions · lint · flow-tests · playwright)

---

## REQ 1 · tender-cash Stack.Screen / 주문 번호

| 항목 | 결과 |
|------|------|
| Stack import | **제거됨** — `import { Stack }` 없음 (grep 0건) |
| Stack.Screen title | **제거됨** — _layout.tsx:83 `title: ''` 설정, 인라인 Stack.Screen 없음 |
| 주문 번호 콘텐츠 표시 | **유지** — `app/checkout/tender-cash/[draftOrderId].tsx:246` |

```
Order #{draftOrder.data.display_id ?? draftOrderId.slice(-6)} · {formatIDR(total)}
```
주문 번호는 Stack.Screen title이 아닌 JSX 콘텐츠로 계속 렌더링됨.

---

## REQ 2 · m3-1105-bw.test.ts CI 실기 + 제거 체크 대체 여부

### flow-tests job (run 43463011784) 실기 확인

`tests/flows/m3-1105-bw.test.ts` **전체 PASS** — 로그에서 직접 확인된 테스트:

- `checkout/[draftOrderId] 에 headerLargeTitle 없음` ✓
- `checkout/tender-cash/[draftOrderId] 에 headerLargeTitle 없음` ✓
- `checkout/delivery/[draftOrderId] 에 headerLargeTitle 없음` ✓
- `checkout/split-tender/[draftOrderId] 에 headerLargeTitle 없음` ✓
- `_layout 전체에 headerLargeTitle 없음 (checkout 계열 모두)` ✓
- `tender-cash · Stack import 없음 (Stack.Screen 제거 후)` ✓
- `tender-cash · useHeaderHeight 로 콘텐츠 오프셋 적용` ✓
- `success · CommonActions.reset 미사용` 3건 ✓
- `레이아웃 불변식` 2건 ✓

### 제거된 2개 체크 (`m1-1105-ao-playwright.mjs`) 대체 존재 여부

제거된 체크 (commit 69ec9e1):
1. `tender-cash · Stack import` — `/Stack,|Stack }|{.*Stack/.test(tenderSrc)`
2. `tender-cash · Order # 타이틀 패턴` — `/\`Order #\$\{/.test(tenderSrc)`

대체 여부:
- **Stack import**: `m3-1105-bw.test.ts` → "Stack import 없음 (Stack.Screen 제거 후)" 역방향 검사로 **대체됨** (기존보다 엄격 — 없어야 통과)
- **Order # 타이틀 패턴**: 옛 체크는 Stack.Screen 동적 title의 `` `Order #${` `` 패턴을 검사. BY로 Stack.Screen 자체가 제거된 뒤 이 패턴은 JSX 콘텐츠(`Order #{...}`)로 바뀌어 backtick 패턴 불일치. 주문 번호 **콘텐츠 표시**는 유지 (REQ 1 확인), 타이틀 겹침이 없으므로 별도 대체 체크 불필요. 허점 없음.

---

## REQ 3 · 앱 전체 headerLargeTitle / checkout Stack.Screen title 카운트

### headerLargeTitle 앱 전체

- `app/_layout.tsx:79` → **주석** 안에만 등장 (실 옵션 없음)
- BW 범위 5개 화면 (`checkout/[draftOrderId]`, `success`, `tender-cash`, `delivery`, `split-tender`) → **0** ✓

**잔존 1건 — BW 범위 외:**
- `app/checkout/tender-qris/[draftOrderId].tsx:185` → `headerLargeTitle: true` 활성

  이 파일은 _layout.tsx checkout 그룹 미등록 · m3-1105-bw.test.ts 범위 외. BW PR 도입분 아님 (기존 잔존).

### checkout 계열 Stack.Screen title

_layout.tsx checkout 그룹 (BW 범위):

| 화면 | _layout.tsx title | 인라인 Stack.Screen |
|------|-------------------|---------------------|
| checkout/[draftOrderId] | `''` | 없음 |
| checkout/success/[orderId] | `''` | `success/[orderId].tsx:129` — `title: displayId ? \`Order #${displayId}\` : ''` |
| checkout/tender-cash/[draftOrderId] | `''` | 없음 |
| checkout/delivery/[draftOrderId] | `''` | 없음 |
| checkout/split-tender/[draftOrderId] | `''` | 없음 |

- `success/[orderId].tsx:129` 인라인 title은 _layout의 `''`를 동적으로 오버라이드. **제목 겹침 없음** (_layout title이 비워져 있어 Native Large Title 렌더 안 됨, 인라인은 small header title만 표시 — 뒤로가기와 겹치지 않는 패턴).
- BW 범위 내 `Stack.Screen title` 으로 인한 겹침: **없음** ✓

---

## 판정

**APPROVE**

BW 범위(5개 화면) 제목 겹침 완전 해소, View order RESET 오류 수정 확인, CI 4/4 초록, flow-tests m3-1105-bw.test.ts 전 케이스 PASS.

잔존 사항: `tender-qris:185 headerLargeTitle: true` — BW 외부 기존 잔존이므로 이 PR 블로커 아님. 별도 티켓 권고.
