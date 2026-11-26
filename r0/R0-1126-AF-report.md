#276 CHANGES
#275 CHANGES

---

## #276 (feat/M3-1126-K · V4-7+V4-8) — CHANGES

### 실행 로그

| 항목 | 결과 |
|------|------|
| e2e 12/12 × 3회 (worktree: pos-m3-wts/M3-1126-K) | ✅ 36/36 |
| playwright script `m3-1126-k-phone-status-playwright.mjs` 32건 | ✅ 32/32 |
| script 외부 스크린샷 10장 텍스트 가시 | ✅ (1.9–4.5 KB) |
| **커밋된 e2e/screenshots/*.png 11장** | ❌ 흰 화면 (162–197 B) |
| lint error | ✅ 0개 |
| #274(M3-1126-H)·#271(M1-1126-I) 파일 없음 | ✅ |
| #276 ↔ #275 충돌 | ✅ 겹치는 파일 없음 |

### POS-HDR-PHONE 6상태 × 7화면 명세 1:1 대조표

| 상태 | 명세 (Kyu 11-24 11:03) | 구현 조건 | 라벨/버튼 | 색 토큰 | 스크린샷 |
|------|------------------------|-----------|-----------|---------|----------|
| ① Ask phone | 회색 테두리 `#N · Ask phone` | `none` + `ask` | "Ask phone" | border-line | ✅ "Ask phone" |
| ② Waiting | 회색 `Waiting` + 점 3개 | `entering`, phone 없음 | "Waiting for customer" + 점 | info(파랑) | ✅ |
| ③ 입력 중 | 파랑 `<partial>` + 점 3개 | `entering`, phone 있음 | digits + 점 3개 | info(파랑) | ✅ "0813 80" |
| ④ Done | 초록 채움·체크·Re-enter | `confirmed` + `reenter` | "✓ phone + Re-enter" | success(`#0E1B18`) | ✅ |
| ⑤ Skipped | 회색 Skipped + Ask again | `skipped`/`unconfirmed` + `ask_again` | "Skipped + Ask again" | border-line | ✅ |
| ⑥ Busy | 노랑·자물쇠·`Display · #M entering` | `locked=true` | "#N entering… + 🔒" | warning | ✅ "#? entering…" |

> bg-success = `#0E1B18` (tailwind config 주석: "success = ink 검정으로 일원화, 더 이상 녹색 chip 아님") — 명세 "(초록)" 는 semantic 레이블이며 디자인 시스템 token이 의도적으로 dark ink 로 정의되어 있어 불일치 아님.

7화면 `onStartEntry`/`onCancelEntry` 연결 확인:
- CartSheet ✅ · Checkout ✅ · tender-cash ✅ · tender-qris ✅ · split-tender ✅ · success ✅ · orders(V4-7 PhoneEntryButton) ✅

버튼 3종: Ask = onStartEntry·start_entry / Re-enter = onStartEntry·start_entry / Ask again = onStartEntry·start_entry / Cancel(Re-enter 중) = onCancelEntry·cancel_entry ✅  
v1.3 폴백(`classifyPhoneStatus`): customer_flow=null 경로 유지 ✅  
Re-enter → Cancel → cancel_entry POST: test 8에서 직접 검증 ✅

### CHANGES 항목

**커밋된 스크린샷 흰 화면**
`e2e/screenshots/M3-1126-K-*.png` 11장 전부 162–197 B(흰 화면)으로 커밋됨.
spec의 `waitForFontsAndBadge` = `document.fonts.ready + 250 ms` 가 현재 환경에서 충분하지 않음.
외부 script의 3.5 s `waitForTimeout`이 올바른 결과(1.9–4.5 KB)를 출력함.
`page.waitForFunction(() => document.fonts.ready.status === 'loaded')` 또는 timeout ≥ 3 s 로 보완 후 11장 재생성 필요.

---

## #275 (feat/M3-1126-I+L · V4-9) — CHANGES

### 실행 로그

| 항목 | 결과 |
|------|------|
| e2e 9/9 (/tmp/pr275-review 에서 실행) | ✅ 9/9 |
| lint error | ✅ 0개 (warning only · pre-existing) |
| iPad native WebView path 보존 | ✅ `Platform.OS !== 'web'` else 분기 완전 격리 |
| 오류 오버레이 + 다시 시도 | ✅ 15 s timeout → loadError → "다시 시도" |
| X 버튼 44 pt 원형 | ✅ width:44, height:44, borderRadius:22 |
| 드래그 setPointerCapture | ✅ e2e "mouse drag: window follows cursor" 통과 |
| **postMessage('*')** | ❌ CHANGES |
| 실 mirror Preview 확인 | 🔲 불가 (로컬 CD URL 없음) |
| #275 ↔ #276 충돌 | ✅ 겹치는 파일 없음 |

### 주의: worktree 혼동

`/Users/kyu.lee/projects/pos-m3` 는 현재 `feat/M3-1126-N`에 있어 R1/R2 테스트 6/9 실패.
원인: `waitForURL('**/products**')` → 기본 탭 `/sell` 로 이미 변경됨(M3-1123-A).
올바른 HEAD `29f2e03`(`/tmp/pr275-review`)에서는 spec이 `sell-preview-btn` + `/sell` URL로 수정되어 9/9 통과. CI 정상.

### CHANGES 항목

**postMessage target origin `'*'`**
`iframeEl.contentWindow.postMessage({ type: 'pos-mirror', detail: payload }, '*')` 2곳.
`'*'`는 iframe이 다른 origin으로 redirect 시 POS 스냅샷(`order_id`, `pos_screen`)이 외부 origin에 노출될 수 있음.
```ts
// 수정안
iframeEl.contentWindow.postMessage(
  { type: 'pos-mirror', detail: payload },
  new URL(MEROS_CD_WEB_URL).origin,
);
```
`handleLoadEnd` 내부 setTimeout 과 snapshot 변경 effect 두 군데 모두 수정 필요.

---

## 충돌 위험

#276 ↔ #275: 겹치는 파일 없음 ✅  
#276 ↔ #274(M3-1126-H): 겹치는 파일 없음 ✅  
#276 ↔ #271(M1-1126-I-login): 겹치는 파일 없음 ✅
