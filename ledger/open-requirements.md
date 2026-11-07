# CurioCity 열린 요구 원장 (오케 유지 · Kyu 원문 기준)

갱신: 2026-11-07 12:45 · 규칙: 새 요구 = 여기 먼저 등재(Kyu 원문 그대로 · 오케 번역은 괄호) · 소유 허브 필수 · 착지·실기 통과 시 ✅ · 이 파일이 챗보다 우선
**발부 규약(09-16)**: 모든 프롬프트 작성 직전 이 파일을 읽고 `원장 대사:` 한 줄. 재언급 🔴. 주 1회 미발부 요구 표.
**갱신 규약(11-06)**: 결정·착지마다(최소 하루 1회) 이 파일 + `work-queue.md` 갱신. **이 파일이 기억의 정본**.

## 🔴 Kyu 실기 피드백 (11-07 12:22 · iPad 현금 결제 첫 실기)
- **[버그] Orders 탭에 결제 주문(#30) 없음** — 진단 M0-1105-N(코드 0) → 수정 주인 결정.
- **[버그] 영수증 시각 UTC**("04:55:31" · 실제 11:55 WIB) + 번호·날짜 붙음 — M3(ReceiptCard).
- **[요구] 영수증에 숲속의 과자점 로고**(보라 · "MAKE YOUR DAY GREEN") — Admin 매장 설정에 로고 업로드(M0) + 앱 렌더(M3) + 프린터 흑백 비트맵(M2 · 뒤).
- **[요구] 영수증 위아래 여백 더** — M3.
- **[요구·결정 완료 12:27] 세금 표기**: Subtotal → **Service charge**(매장별 % · Admin 설정 · 현재 2매장 0%) → **PB1**(매장별 % · Admin 설정) → Grand total. **ⓐ 가산**(메뉴가에 얹음 · Ta Wan 샘플과 동일) **ⓑ 매장별 PB1** — 조리시설 있는 매장 10% · 조리시설 없이 받아서 파는 매장 0% (Kyu: "매장중 1개는 0%, 다른 하나는 10%") → Admin 매장(stock location)별 설정 **ⓒ 계산** SC = Subtotal×SC% · PB1 = (Subtotal+SC)×PB1% · 반올림(11-06 결정). (11-04 "세금 기본 숨김" 대체.) 서버 계산·snapshot 줄(M0) · 앱 Checkout/영수증 표시(M3).
- **[확인] Checkout "Pay" 단일 버튼 → 현금** — P2 임시. P4 에서 Cash/Card/QRIS 탭 복귀.
- ✅ 품절 상세 진입 · 현금 결제 → Payment successful · Admin 탭 제목.

## R0-1105-O 전 리포 감사 결과 (11-07)
- 영어 전용 UI 0건 ✅ · raw color 활성 0건 ✅(dead ColorPicker 블록 `product-details.tsx:268-287` 5건 정리 권장) · 서버 계약 활성 불일치 0 ✅(close 응답 z_report 미사용 · M1 최적화).
- **수정 필요(M3)**: `QuantityPicker.tsx:102/118/128` `text-ink-subtle` → `text-ink-disabled`(P0) · Option/Size/ColorPicker 비활성 텍스트 명시(P1) · dead 블록 삭제(P2).
- M1 P3: `useCloseRegisterSession` z_report inline · `useOpenRegisterSession` opener_nickname.

## 방법론 (①~⑮ 유지 · 요지)
① R0 리뷰(리포트 relay push 의무 · 11-07 복구) ② 파일 주인 ③ 계획 게이트 ④ claude-code-action(제안 대기) ⑤ kyu-gate 폐기 ⑥ worktree ⑦ 감시 5분/30분 ⑧ 목적 2~3줄+작업 큐 ⑨ chore 직접 머지 ⑩ 진단은 타 허브 ⑪ R1 미발동 ⑫ 상시 [REPORT] ⓐⓑⓒⓓ ⑬ 쌓인 PR 합쳐 머지 ⑭ mock=서버 fixture ⑮ Kyu Mac Node 22 설치 완료 · Expo `--tunnel` 은 `@expo/ws-tunnel` 버그로 LAN 사용(M2 진단).

## Kyu 결정 정본 (11-04~07)
- 반올림: 현금 Pembulatan 없음 · % 계산 round. 승인번호 6자리+끝4자리. WA 공유 먼저. 분할 P6. PG Xendit. Pre-order 기본 100% · DP% Admin.
- **세금(11-07)**: 위 🔴 ⓐⓑⓒ.
- **MEROS 앱 UI 전부 영어**. 재고 차감 = 전달/출고 이벤트만(preorder 는 paid_full+hand_over).
- **팔레트 D1**(11-07): surface #FFFFFF · surface-muted #F2F2F0 · ink #0E1B18 · ink-muted #6F6F6F · ink-subtle #B5B5B5 · ink-disabled #C8C8C8 · line #E3E3E3 · accent(로고 점) #E8A33D/#FBE4B6 · success #0E1B18/#EDEDEB · warning #9B6D1F/#FBF1DC · danger #C62828/#FBE3E3. → fork #47(M3-1105-J · R0-Q 대기).
- **P5 교대(11-07 "전부 추천대로")**: ① Open shift 취소 불가(로그아웃만) ② 하루 복수 교대 close→open · 각각 Z ③ cashier/session 자동(#46) ④ Settings Close shift = Reset 위 · 세션 열릴 때만 ⑤ 캐셔 = first_name → 이메일 @ 앞. 서버 신규 0.
- 품절 (a) ✓ 실기 · Admin 비번 유지 · Admin 탭 제목 ✓ 실기 · 외부 신청(Apple Pending · Xendit·은행 미착수).

## StorePort / Meros

### 착지 ✅
- storeport main **32ab911**: … #193 · **#194 preorder 잔금(R0-P APPROVE · 통합 12/12)**. 배포는 Railway 자동(M2 확인 방식 /health.version).
- fork master **fd0aa70 · CI green**: … #44 · **#45 Maestro 현금 플로 템플릿(미실행 · 자격증명 없음)**. 열린 PR: **#46 cashier/session 자동(M1-M) · #47 팔레트 D1(M3-J)** → R0-1105-Q.
- 계획서: M1-1105-L P5. 감사: R0-1105-O.

### 진행 중 / 발부 (11-07 12:45)
- R0-1105-Q #46 #47 리뷰 · M0-1105-N Orders 미표시 진단 → 그 뒤 M0-1105-O(세금·로고 서버) → M0-1105-M(Delivery) · M1-1105-N P5 α(Open shift 시트) · M2-1105-L Expo 터널 버그 진단 · M3-1105-K 영수증 v2 앱 부분(WIB·번호/날짜·여백 + R0-O P0~P2)

### 다음 (우선순위)
- [ ] Orders 미표시 수정(진단 뒤 주인) → Kyu 재실기
- [ ] 영수증 v2 서버: 매장별 SC%·PB1%·로고 설정(Admin POS Settings 확장) + snapshot 줄 + 가산 계산 — M0-O → 앱 표시(Checkout 합계·영수증) M3
- [ ] P5 β(Settings Close shift · M2 파일) → ReceiptCard 캐셔(M3)
- [ ] P3 거래 종류+잔금+Delivery 화면(M3) — M0-M 뒤 · P4 수단 탭 복귀+EDC 시트(M3)
- [ ] J-c Xendit(key) · EAS/프린터(Apple) · Sentry pos-app(Kyu) · 프린터 로고 비트맵(M2)
- [ ] 소소: M1 P3(z_report inline · opener_nickname) · images.* · hubs.json 스캔 · claude-code-action · R1 · pickup_at UI · stubs 주석
- [ ] 다중 매장 RBAC(요구 시) · 유령 예약 C안(Kyu)

### 로드맵 (10-12 · 유지) · 전 제품 공통(Sentry 확장 · 이름 원칙) · 머지 규칙(R0 APPROVE → squash · chore 직접 · ⑬ ⑭) · K0/T0/N0 변동 없음.
