# M1-1120-E 완료 보고서

#408 개정 · 오류 10/10 · 누락 4/4 · 혼입 제거 O · 영수증 동일화 O · 애니메이션 O · PR 파일 1개

---

## git fetch 결과

```
storeport origin/main 최신: 0d3aaaa (feat(ci): M1-1120-C — PARTNER_REPO 합산 카운트)
fork origin/master 최신: 0f9a7c4 (feat(ci): M1-1120-C — Mac 우선 배차)
```

검증 기준: storeport origin/main (0d3aaaa) + fork origin/master (d2a28e3 = 검증 대상)

---

## 코드 혼입 제거 ✅

브랜치 `docs/M1-1120-D-cd-loyalty-flow-v2`에서 코드 커밋 2개 제거:

| 제거된 커밋 | 내용 |
|------------|------|
| `8f2ded2` fix(imports): M1-1118-H | void·return·recover-loyalty 동적 import 정적 전환 |
| `5358d21` fix(refund): M1-1118-G | dynamic import('.js') → static · IT W-1/W-2/W-3 초록 |

이 변경들은 origin/main (`0d3aaaa`)에 이미 포함됨 (PR #407 → merge 완료).

**처리**: `git reset --hard origin/main && git cherry-pick bc13eb6(원 docs 커밋)` → force-push

현재 PR 변경 파일: `docs/plans/cd-loyalty-flow-v2.md` **1개** ✅

---

## 사실 오류 수정 (E1~E10) ✅

| # | 수정 내용 |
|---|----------|
| E1 | §5-C 버그 진단 재작성: pos_screen은 서버 저장·반환됨 (`order_snapshot/model.ts:49`, `lifecycle.ts:116`). entering 뱃지 미표시의 실제 원인은 별도 확인 필요. §1-A row 13 삭제 근거도 "phone_entry_open 기반으로 교체"로 수정. |
| E2 | §1-A Rule A: `10,104-105` → `10(주석),200-206(구현)` |
| E3 | §1-A Rule B: `11,112-113` → `11(주석),207-208(구현)` |
| E4 | §1-A KEYPAD_OPEN: `116-119` → `211-213` |
| E5 | §1-A Rule C: `121-132` → `226-237` |
| E6 | §1-B Rule H: `80-84` → `130-134` |
| E7 | §1-B Rule I: `92-95` → `190-193` |
| E8 | §1-A + §7 setSnapshotPhoneEntry(): `281-291` → `395-405` |
| E9 | §1-B + §7 markSnapshotPaid(): `293-309` → `427-443` |
| E10 | §1-A pre_entry DB 필드: `models/order-snapshot.ts:25` → `order_snapshot/model.ts:28` |

---

## 누락 추가 (G1~G4) ✅

§1-A DELETE 테이블에 4행 추가:

| # | 항목 | 위치 | 조치 |
|---|------|------|------|
| G1 | `kav` / `keypadAfterVisited` | `display-machine.ts:85,97` · `useDisplayMachine.ts:51,94` | keypad-after → consent 경로 제거로 삭제 |
| G2 | `doneSnapshotId` | `display-machine.ts:82,95` · `useDisplayMachine.ts:50,93` | done 재진입 경로 없어짐 → 삭제 |
| G3 | `skippedSnapshotId` | `display-machine.ts:80,93` · `useDisplayMachine.ts:49,92` | Skip = server expire → pending-skip 메모리 불필요 → 삭제 |
| G4 | `skipped_at` DB 컬럼 | `order_snapshot/model.ts:41` | snapshot_state='expired'로 대체 → migration 필요 |

§9 Round 1 migration 목록에도 `skipped_at` 추가.

---

## §4-D 잠김 논증 보강 ✅

"앱 종료"·"네트워크 단절" 명시 행 추가:

| 경로 | 해제 메커니즘 |
|------|-------------|
| 앱 종료 | polled_at 갱신 중단 → 30초 후 오프라인 판정과 동일 |
| 네트워크 단절 | 손님 화면 → 오프라인 판정 → 동일 경로 |

---

## 신규 요구 반영 (Kyu 16:22) ✅

### 5a — 손님 화면 영수증 = POS 영수증

§10-A 항목 대사표 (11개 항목 비교), §10-B 데이터 공유 방식 추가:
- 두 앱 서로 다른 리포 → 컴포넌트 공유 불가
- **권장안**: `serializeSnapshot()` receipt 필드 확장 → `snapshot.receipt.*` 단일 출처
- Round 1 서버 작업에 포함

§7 테이블: `pos_screen 서버 저장` → "코어에 있음 (order_snapshot/model.ts:49)" 으로 수정

### 5b — 영수증 등장 애니메이션 속도 = POS와 동일

§10-C 현행 실측:

| 앱 | 파일:줄 | 슬라이드 | duration |
|----|---------|---------|----------|
| POS | `SuccessReceiptAnim.tsx:101` | `withSpring(damping:18,stiffness:120)` | spring |
| 손님화면 | `ReceiptScreen.tsx:68-70` | `Animated.timing(duration:2400)` | 2400ms linear |

§10-D 토큰 단일화 방안 (5개 상수 정의) + 손님 화면 Reanimated 마이그레이션 계획.

### 5c — 시나리오 + 라운드 반영

S-20, S-21 시나리오 추가. Round 1 receipt 확장, Round 2 ReceiptScreen 항목 동일화 + Reanimated 마이그레이션 반영.

---

## 열린 질문 정리 ✅

**Kyu 결정 남은 것 = 1개**:
- 소급 적립 창: 권장안 "그날 영업 마감까지" (오케 추천 2026-11-20), Kyu 확인 대기

**기술 판단으로 설계서 내 결정된 항목**:
- receipt_button 버튼 문구: "Earn points & get e-receipt · 5" (Kyu 명세 그대로 적용)
- subscriber 분할 결제: Medusa `payment.captured` 는 마지막 tender에만 발동 → 현행 유지
- pos_screen 서버 저장: 이미 현행에 존재 (`order_snapshot/model.ts:49`) → 재활용

---

## 최종 상태

- 브랜치: `docs/M1-1120-D-cd-loyalty-flow-v2`
- 커밋 2개 (코드 0 · docs 2):
  - `bc13eb6` M1-1120-D 원 설계서
  - `557bd0f` M1-1120-E 개정
- PR #408 changed_files: 1 (`docs/plans/cd-loyalty-flow-v2.md`)
- PR body Kyu 1쪽 요약 갱신 완료 (열린 질문 1개)
