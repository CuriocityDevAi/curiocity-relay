# CurioCity 열린 요구 원장 (오케 유지 · Kyu 원문 기준)

갱신: 2026-11-07 12:30 · 규칙: 새 요구 = 여기 먼저 등재(Kyu 원문 그대로 · 오케 번역은 괄호) · 소유 허브 필수 · 착지·실기 통과 시 ✅ · 이 파일이 챗보다 우선
**발부 규약(09-16)**: 모든 프롬프트 작성 직전 이 파일을 읽고, 프롬프트 첫 줄 아래 `원장 대사:` 한 줄에 포함 항목을 적는다. 없으면 발부 금지. Kyu가 같은 요구를 두 번 말하면 🔴 · 다음 발부에 무조건 포함. 터미널 "별건/이연"은 Kyu 원문과 대조해 명시 요구면 거부. 주 1회 "한 번도 발부 안 된 요구" 표를 Kyu에게 보고.
**갱신 규약(11-06 Kyu 지적)**: 오케는 Kyu 결정·착지가 생길 때마다(최소 하루 1회) 이 파일과 `ledger/work-queue.md` 를 갱신한다. **이 파일이 기억의 정본**이다.

## 🔴 Kyu 실기 피드백 (11-07 12:22 · iPad 현금 결제 첫 실기 · 원문 요지)
- **[버그] Orders 탭에 방금 결제한 주문(#30)이 없음** — 소유 = 진단 M0-1105-N(코드 0 · 만든 허브 M3 아님) → 수정 주인 결정.
- **[버그] 영수증 시각이 UTC** ("2026-11-07 04:55:31" · 실제 11:55 WIB) + 영수증 번호와 날짜가 붙어 나옴("R-261107-00012026-…") — 앱 ReceiptCard(M3) · 서버 issued_at 은 ISO 그대로.
- **[요구] 영수증에 숲속의 과자점 로고** (Kyu 첨부 · 보라 로고 "숲속의 과자점 · MAKE YOUR DAY GREEN") — 매장 로고를 Admin 에서 올리고 영수증 머리에 표시. 서버(설정·업로드 · M0) + 앱 렌더(M3) + 프린터 비트맵(M2 · 나중).
- **[요구] 영수증 위아래 여백 더** — M3.
- **[요구] 세금 표기** — "Subtotal 밑에 service charge(Admin 설정 · 매장별 · 숲속의 과자점 2매장 모두 현재 0%) 와 PB1(자카르타 식당·카페 10% 고정) 레스토랑 텍스". 참고 영수증(Ta Wan): Subtotal 348,000 → Service Charge 19,140(5.5%) → PB1 36,714(= (Subtotal+SC)×10%) → Grand Total 403,854. (11-04 "세금 라벨 기본 숨김" 결정을 **대체**: PB1 기본 표시.) **Kyu 결정 대기**: ⓐ 메뉴 가격이 세금 포함가인지 별도 가산인지 ⓑ 2매장 모두 PB1 10% 인지 ⓒ SC 계산 기준(Subtotal) · PB1 기준(Subtotal+SC) 샘플대로인지.
- **[확인] Checkout 에 Cash/Card/QRIS 선택이 없고 "Pay" 버튼 하나 → 바로 현금 화면** — P2(현금만) 임시 동작. P4 에서 수단 탭 복귀(보드 1). Kyu "의도된 거면 OK".
- ✅ 품절 상세 진입 · 현금 결제 → Payment successful · R-번호 · Hand over/Reprint/Share/View order 표시.

## 방법론 (Kyu 승인 11-04 · 11-05~07 추가 ⑧~⑭)
- **① R0 리뷰 허브** — 상시. 체크리스트 ⑴ 깨끗한 환경 실기동 ⑵ 직전 Kyu 실기 ✗ 재현 ⑶ master clean merge ⑷ 지시 밖 변경 ⑸ 놓친 엣지 ⑹ 서버 계약 대조. 결함(11-07): R0 리포트가 relay 에 push 안 됨 → R0-1105-P 에서 push 지시.
- **② 파일 주인 명시** · **③ 계획 게이트**(M1-1105-L 첫 적용) · **⑤ kyu-gate 폐기** · **⑥ 4허브 worktree**.
- **④ claude-code-action** — 조용할 때 제안. **⑦ relay 감시** 5분/30분. **⑧ 목적 2~3줄 + 작업 큐**. **⑨ chore 직접 머지**(#28 #41 #42 #44). **⑩ 진단은 만든 허브가 아닌 허브에**. **⑪ R1** 미발동. **⑫ 상시 [REPORT]** ⓐⓑⓒⓓ. **⑬ 쌓인 PR 합쳐 머지**. **⑭ mock 은 서버 fixture 로**.
- **⑮ (11-07) Kyu Mac Node 22 설치 완료**(v22.23.4 · brew node@22). Expo `--tunnel` 은 Node 와 무관하게 `@expo/ws-tunnel` "s.WebSocket is not a constructor" 로 깨짐 → LAN(`npx expo start -c`)으로 실기 · 터널 버그 진단 M2 후속.

## Kyu 결정 정본 (11-04~07)
- (11-04) 반올림: 현금 Pembulatan 줄 없음. (11-06) % 계산 소수점 반올림.
- (11-04) 승인번호 6자리+카드 끝4자리 필수. 영수증 WA 공유 먼저. 분할 결제 P6. PG = Xendit. Pre-order 선결제 기본 100% · DP% Admin 설정.
- **(11-07 대체) 세금: PB1 10%(자카르타 식당·카페) + Service charge(매장별 % · 현재 0%) 를 영수증 Subtotal 아래 표시** — 세부 ⓐⓑⓒ Kyu 결정 대기(위 🔴).
- (11-04) **MEROS 앱 UI 전부 영어**.
- (11-04) 재고 차감 = 거래 종류별 전달/출고 이벤트만. (#194) preorder 는 paid_full + hand_over 에서 1회.
- **(11-07) 팔레트 = D1** — surface #FFFFFF · surface-muted #F2F2F0 · ink #0E1B18 · ink-muted #6F6F6F · ink-subtle #B5B5B5 · ink-disabled #C8C8C8 · line #E3E3E3 · accent(로고 점만) #E8A33D/#FBE4B6 · success #0E1B18/#EDEDEB · warning #9B6D1F/#FBF1DC · danger #C62828/#FBE3E3. 적용 = M3-1105-J.
- **(11-07) P5 교대 "전부 추천대로"**: ① Open shift 취소 불가(로그아웃만) ② 하루 복수 교대 = close→open 순차 · 각각 Z ③ tenders 에 cashier_user_id·register_session_id 자동 ④ Settings "Close shift" = Reset 위 · 세션 열릴 때만 ⑤ 캐셔 표기 first_name → 없으면 이메일 @ 앞. 서버 신규 0. 코딩 M1 α→β · M3 ReceiptCard.
- (11-05) 품절 탭 → 상세 + 회색 Sold out (a) — **Kyu 실기 ✓ 11-07**.
- (11-05) Admin 비밀번호 유지. **(11-07) Admin 탭 제목 "Meros Admin" Kyu 실기 ✓**.
- (11-05) 외부 신청: Apple(Pending) · Xendit KYC(미착수) · 은행(미착수).

## StorePort / Meros (M0~M3 · 최우선)

### 착지 ✅
- storeport main **946d31c (배포 ✓)**: #182 #183 #184 #187 #191 #192 #193. **#194 preorder 잔금 → R0-1105-P 대기.**
- fork master **26b6b78 · CI green**: #22~#44 (팔레트 초안 #37 #39 #40 close). **현금 결제 Kyu 실기 ✓(11-07 · 피드백 6건 위)**.
- 계획서: M1-1105-L P5 교대.

### 진행 중 (11-07)
- R0-1105-P #194 리뷰 · R0-1105-O 전 리포 감사(진행 중) · M3-1105-J 팔레트 D1 · **M0-1105-N Orders 미표시 진단(M0-M 보다 먼저 · 코드 0)** → M0-1105-M Delivery 단계(#194 머지 뒤) · M1-1105-M cashier/session 자동 · M2-1105-K Maestro 현금 플로

### 다음 (우선순위)
- [ ] **Orders 미표시 버그 수정** — 진단(M0-N) 결과의 주인
- [ ] **영수증 v2** — 시각 WIB + 번호/날짜 분리 + 여백(M3) · 로고 업로드 설정(M0) + 렌더(M3) · SC/PB1 줄(서버 계산 M0 · 앱 M3) — Kyu ⓐⓑⓒ 뒤 발부
- [ ] P5 α(M1 · M1-M 뒤) → β(M2) → ReceiptCard 캐셔(M3)
- [ ] P3 거래 종류 + 잔금 + Delivery 화면 — #194 + M0-M 뒤 M3
- [ ] P4 카드/QRIS 수단 탭 복귀 + EDC 결과 시트 — M3
- [ ] Expo 터널 버그(@expo/ws-tunnel) 진단 — M2(K 뒤)
- [ ] R0-O 결과 → raw hex·비영어·계약 잔재 수정
- [ ] J-c Xendit(key 선행) · EAS/프린터(Apple 선행) · Sentry `pos-app`(Kyu)
- [ ] 소소: images.* 좁히기 · hubs.json 스캔 · claude-code-action · R1 · Admin Receipt configuration(세금과 합류) · pickup_at UI 위치 · stubs 주석
- [ ] 다중 매장 RBAC — 요구 시 · 유령 예약 C안 Kyu 결정 대기

### 로드맵 (10-12 합의 · 유지)
- [ ] 싱가포르 리전 + Redis · RMA·픽업 예약·보류 · 고객·등급·크레딧·WA·Scan · Meta WhatsApp(K11)
- [ ] Kyu 결정 보류: Metabase 선행 · 이연 16 봉인 · 오프라인은 매장 투입 뒤

## 전 제품 공통
- [ ] Sentry 전 제품 확장: 서버 ✅ · 앱 코드 ✅ · 웹 재개 시.
- 이름 원칙: StorePort = 플랫폼 · Meros = 커머스 브랜드.

## 머지·실기 규칙
- 제품 PR: R0 APPROVE 뒤 오케 squash 머지 → Railway 자동 배포(/health.version 확인) / Kyu 클론 `git pull --ff-only` + `npx expo start -c`(LAN).
- chore/docs · rebase-only PR: 오케 직접 머지(⑨). 쌓인 PR ⑬ · fixture ⑭.

## test-portal (K0 · 동결) · Todoboss (T0) · GrowNest (N0 동면)
- 변동 없음.
