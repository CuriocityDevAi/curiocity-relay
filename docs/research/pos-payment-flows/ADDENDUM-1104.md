# 정본 v0 부록 (Kyu 결정 · 2026-11-04 22:14~22:45)

이 부록이 `meros-payment-flow-spec-v0.md` 의 §10 결정 항목과 충돌하면 **부록이 우선**.

## 1. Kyu 결정
1. **현금 반올림 없음** → 영수증에 Rounding 줄 없음.
2. **세금 라벨/비율/표시 = Admin 설정, 기본 숨김**. 근거: 식당·카페(매장 취식)는 PBJT 10%(지방세) · 포장 과자점은 PBJT 대상 아님 · PPN은 PKP 등록(연매출 48억 IDR 초과) 사업자만 징수 → Soopsok 현재는 세금 줄 없음, PKP 등록 시 "PPN 11%" 켬. (Soopsok 세무 상태 Kyu 확인 필요)
3. **카드(비연동 EDC) 결과 입력: 승인번호 6자리 + 카드 마지막 4자리 필수**. 은행 필수. 브랜드·RRN·메모 선택.
4. **영수증 전달: OS 공유 시트(WhatsApp/Email) 먼저**, Receipt online 링크(`meros.id/r/<token>`)는 후속.
5. **분할 결제(Split tender)는 후순위(P6)** — UI에 토글 자리만.
6. **PG = Xendit**.
7. **Pre-order = 선결제. DP(계약금) 비율 Admin 설정 `preorder_deposit_pct`, 기본 100%.** 100%면 잔금 화면 생략. 다른 회사는 %를 바꿔 쓸 수 있게.

## 2. UI 언어 — 영어 전용 (Kyu 22:45)
Meros POS 앱·영수증·Admin 문구는 **모두 영어**. 인도네시아어는 법정 표기(세금 라벨 PBJT/PPN · NPWP · QRIS/NMID)만. 조사 문서의 현지 라벨은 참고용이며 아래로 치환:

| 조사/디자인 라벨 | 앱 문구 |
|---|---|
| Tunai / Kartu / QRIS | Cash / Card / QRIS |
| Uang diterima · Uang Pas · Lainnya · Custom | Amount received · Exact · (preset bills) · Custom |
| Total · Sisa · Kembalian | Total · Remaining · Change |
| Proses Bayar | Pay |
| Transaksi Berhasil / Pembayaran Berhasil | Payment successful |
| Serahkan | Hand over (Takeaway) · Send to production (Pre-order) · Pack (Delivery) |
| Cetak / Bagikan Struk | Print / Share receipt |
| Cetak ulang (COPY) | Reprint (COPY) |
| Cek Pembayaran | Check payment |
| Bagikan QR | Share QR |
| Menunggu Pembayaran | Awaiting payment |
| Pisah Bayar | Split payment |
| Kas Awal · Kas Masuk/Keluar · Tutup Kasir · Selisih | Opening cash · Cash in/out · Close shift · Difference |
| Struk online | Receipt online |
| Diterima / Kembalian (영수증) | Received / Change |
| Terima kasih | Thank you |

## 3. 거래 종류 · 재고 차감 원칙 (Kyu 22:24)
- Checkout 첫 단계 = **Order type**: Takeaway(기본) / Pre-order / Delivery.
- **영수증 발행 ≠ 재고 차감.** Medusa reservation(주문 시) → fulfillment(전달/출고 시) 차감.
  - Takeaway: 결제 → "Hand over" 버튼 → fulfilled + 차감.
  - Pre-order: 선결제(DP%) → 제작 큐 → 준비됨(WA 알림) → 픽업(잔금 있으면 수금) → Hand over.
  - Delivery: 결제/COD → Packed → Shipped(차감) → Delivered.
- 결제 완료 화면 = 영수증 출력 애니메이션 → 체크 → 큰 "Hand over" 버튼(직원 신호).

## 4. 디자인 캔버스 (Kyu 승인 22:36)
Claude Design "Meros POS 결제 흐름 화면 설계" 11장: 1 Checkout Cash · 2a Card EDC wait · 2b Card result sheet · 3 QRIS fullscreen · 4 Success + receipt · 5 My Orders · 6 Order detail (Payments + receipt card) · 7 Order type step · 8 Success animation + Hand over · 9 Pre-order balance · 10 Fulfillment stages. (캔버스 문구는 일부 인니어 — 구현은 §2 영어로)

## 5. 외부 신청 3건 (Kyu 할 일 · 일정 지배 요인)
- [ ] Xendit 가맹 KYC (PT Soopsok NPWP·NIB·계좌) — 샌드박스는 즉시, 라이브 키는 심사 뒤
- [ ] 은행 QRIS 정적 스티커 (P4 QRIS v1 용 · Xendit 전까지)
- [ ] Apple Developer 승인 메일 확인 → EAS dev build
- (후순위) Mandiri/MTI 또는 BCA/BRI ECR 연동 신청 — 영업·계약 단계 · BCAP 라인 활용 검토
