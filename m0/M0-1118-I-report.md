PR #375 · 페어링 풀림 원인 손님 iPad 가 cd_device_token 을 localStorage 단일 저장 → iOS Safari ITP 7일 규칙·저장 압박 축출 · 싱크 어긋남 5곳 · 개선 라운드 5개 (R1~R4 + 네이티브 전환 R5) · Kyu 결정 7건

# M0-1118-I 리포트 — customer-display 페어링 유지·POS 상태 싱크 딥다이브

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/375 (draft · docs-only · 머지 금지)
- **브랜치**: `docs/M0-1118-I-cd-sync`
- **커밋**: c10420a `docs(plans): M0-1118-I — customer-display 페어링 유지·POS 상태 싱크 딥다이브`
- **문서**: `docs/plans/customer-display-sync.md` (264 라인 신설 · docs-only PR)
- **모델**: opus · **용량 범위**: 50분 상한 내 완료

## 핵심 발견 요약

### 1) 페어링 풀림 — 주원인 (한 줄)
손님 iPad 쪽 `cd_device_token` 이 **localStorage 단일 저장**이라 iOS Safari ITP 7일 규칙 · 저장 공간 압박으로 축출된다. POS 쪽은 애초에 device token 을 저장하지 않으므로 "잃을 것이 없음". 서버 토큰은 자동 만료 없음.
- 유일 저장 경로: `apps/customer-display/src/lib/pairing.ts:13` `localStorage.setItem('cd_device_token', …)`
- 백업 수단(쿠키/IndexedDB/SecureStore) 전무
- 부트 시 서버-side 토큰 검증 endpoint 부재 → 첫 폴링 401 까지 알 수 없음

### 2) 싱크 어긋남 5곳
1. **담는 중 스냅샷 부재** — `useAddToDraftOrder` · `useUpdateDraftOrderItem` 뒤에 스냅샷 upsert 콜 없음 (POS fork)
2. **체크아웃 뒤로시 스냅샷 완전 소멸** — `DELETE /admin/pos/orders/:id/checkout-snapshot` 가 전부 지움. "cart 유지" 선택지 없음
3. **POS 화면 상태의 정본이 서버에 없음** — `OrderSnapshot.status` = `idle/cart/checkout/completed` 4종뿐
4. **paid 10분(`link_open_until`) 윈도우 레이스** — 결제 직후 다음 손님 응대 시작해도 10분간 paid 상태 유지
5. **POS 포그라운드 복귀 시 full-state resync 콜 없음** — 자발적 상태 재확립 수단 전무

### 3) 개선 라운드 5개
- **R1** OrderSnapshot v2.1 `pos_screen` 열거형 신설 (commerce-core · 45m)
- **R2** POS 화면 전이·cart 변경 debounced upsert 훅 + 재시도 큐 (fork · 45m)
- **R3** display-machine `pos_screen` 우선 분기 + 폴링 2000→1000ms (customer-display · 30m)
- **R4** 쿠키 이중화 + `/customer-display/me` 부트 검증 (commerce-core + customer-display · 45m)
- **R5** 네이티브 iPad 앱 전환 + `expo-secure-store` (별 티켓 · 90m+)

R1→R2→R3 직렬 · R4 병렬 · R5 는 R4 후속.

### 4) Kyu 결정 7건
1. 손님 화면이 "담는 중"을 실시간으로 보여줄지 (권장: 예)
2. 체크아웃 "뒤로" 때 손님 화면 (권장: cart 유지)
3. QR 화면 레이아웃 (권장: 큰 QR + 금액 2줄 · cart 하단 축소)
4. 결제 완료 후 "다음 손님" 즉시 받기 UX (권장: POS 명시 버튼)
5. 페어링 재확인 주기 (권장: 90일 미폴링 → revoke)
6. 재페어링 UX (권장: Settings → "Re-pair" 명시만 · 자동 X)
7. 네이티브 앱 전환 시점 (권장: R4 통과 후 R5 별 티켓 2~3주)

## 산출물

- `docs/plans/customer-display-sync.md` (264 라인 · 섹션 0~6)
  - §1 현재 구조 지도 (파일:라인 인용)
  - §2 페어링 풀림 원인 확정 + 재현 절차
  - §3 싱크 불일치 시나리오 (A)/(B) 단계별 표 + 어긋남 5곳
  - §4 바람직한 구조 제안 — 대응표 · 정본 소유 · 지연 목표 · 끊김 처리 · 페어링 영구화 · 라운드 분해 + 겹침 표
  - §5 Kyu 결정 7건 (쉬운 말 + 권장안)
  - §6 요약

## 다음 액션 (Kyu 결정 대기)

1. §5 7건 결정
2. 결정 수용 시 M0 가 R1 티켓부터 개설
3. R5 (네이티브 전환) 는 별 세션으로 유예
