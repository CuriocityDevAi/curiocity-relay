# 인도네시아 POS 결제 단계·영수증 벤치마크 (Meros POS 참고용)

조사일 2026-11-04 · 오케 리서치 에이전트 · 범례: **[확인]** = 출처에서 직접 확인 · **[추정]** = 정황 추론 · **[미확인]** = 자료 없음

## 0. 한 줄 결론

인도네시아 POS의 공통 골격 = **① 결제수단 선택(Tunai / Non-Tunai) → ② 현금이면 "Uang Pas" + 프리셋 금액 + Custom 입력 → 거스름돈 자동 → "Proses Bayar" → ③ "Transaksi Berhasil" 화면에서 Cetak / Bagikan Struk(WA·Email) → ④ 카드는 대부분 "기록만"(비통합) + 선택적 ECR 통합(BCA/BRI) → ⑤ QRIS는 PG 통합 시 동적 QR + 자동 확인 + 수동 "Cek Pembayaran" 백업 → ⑥ 시프트 = Kas Awal → Kas Masuk/Keluar → Tutup Kasir(실제 현금 입력 → 시스템 vs 실제 → Selisih)**. 가장 문서화가 잘 된 레퍼런스 = **Majoo**(UI 라벨까지 공개)와 **Moka**(시프트 리포트 필드).

## 1. 제품별 상세

### 1-1. Moka POS (GoTo)
- **현금** [확인-부분]: Charge → 결제수단 → Charge. 성공 후 Print Receipt 또는 이메일/휴대폰 Send. 프리셋 버튼 세부 [미확인].
- **카드/EDC** [확인]: 27.8.0(2022-04) **GoBiz PLUS EDC 통합(Visa/MC)**, "ECR Link"로 총액 자동 전송. 정산 T+1. 비통합 카드는 기록만 [추정].
- **QRIS** [확인]: GoPay QRIS 직접 통합, 정산 H+1~3, 최소 IDR 10,000. 2024-07 타 e-wallet 통합 비활성 이슈 → "QRIS로 모든 지갑 수납" 해명. 28.4.0 결제수단별 QR 인쇄. 동적 QR 화면·타임아웃 [미확인].
- **영수증** [확인]: Backoffice Receipt 설정(로고·이름·주소·전화·SNS). 이메일/SMS, **WA는 2025-02-10부터 WhatsApp Business 앱 경유(Android)**. 재전송 = ACTIVITY > 거래 검색 > Send Receipt.
- **환불** [확인]: ACTIVITY → Issue Refund → 품목 → Reason 필수 → 온라인 필수.
- **시프트** [확인]: Starting Cash in Drawer → Start Shift; Expense/Income; End Shift에서 Actual Ending Cash → Confirm → Print Summary. 리포트 필드: Total Expected / Actual / Difference; Cash 섹션(starting, sales, refunds, income/expense, Expected Ending, Actual); **E-Wallet / EDC / Other** 섹션.

### 1-2. Majoo (가장 상세한 레퍼런스)
- **현금** [확인]: Bayar → Pembayaran 화면 좌측 Metode 리스트 **Tunai** → 중앙 **Uang Pas** / **Lainnya**(프리셋 팝업) / **Custom**(수기) → 상단 총액·잔액·거스름돈 → **Proses Bayar** → "Transaksi Berhasil". **Pisah Bayar**(Pisah Jumlah / Pisah Produk) 지원; 잔액은 Daftar Order > Detail > Bayar 후결제.
- **카드/EDC** [확인]: Nontunai > Kartu Kredit/Debit > Pilih Bank. (A) 비통합: Catatan·Bank·Nomor Kartu·Nama Pemilik → Simpan → Proses. (B) 통합: "Integrasi majoo ECR" → **Kirim ECR** → "Sedang diproses…" → 단말 완료 시 자동 paid. 통합 은행 **BCA, BRI**. 승인번호/last4 저장 [미확인].
- **QRIS** [확인]: **Dinamis**(팝업 QR, Bagikan Kode QRIS WA/Email, **Cek Pembayaran** + 자동 전환) / **Statis**(Tampilkan → Refresh → 체크) / **Online**(PT majoo MID). **QRIS on Bill**(빌 하단 동적 QR 인쇄). Lock & Release, 입금 알림음, MDR 0.7%, 정산 H+1. 장애 시 고객 화면 RRN 캡처 → CS 3~5일.
- **영수증** [확인]: Header/Footer/Catatan, 세율% 토글, **재인쇄 횟수 제한**, 대기번호 prefix/suffix, 로고 모드, 거래·상품 정보 체크박스, QR & Barcode, SNS, Deposit 잔액. 디지털: Bagikan Struk → WA/Email/SMS.
- **시프트** [확인]: Kas Kasir(+Transaksi: 증빙 사진·Masuk/Keluar·금액·메모) / Kasir(saldo awal/akhir, Ringkasan — Produk·**Pembayaran 탭**, **Tutup Kasir**: nominal kas akhir → PIN → Cetak). Laporan Tutup Kasir: Total penerimaan, Modal awal, Kas masuk/keluar, Saldo akhir, 현금/비현금/온라인, 환불, 미결, **Total tunai sistem / aktual / Selisih**, Excel.

### 1-3. Pawoon (BCA 계열)
- **결제** [확인]: Tunai / Kartu / e-wallet + Split. **BCA EDC 단말 위에서 앱 구동**, BCA QRIS 통합; Mandiri·BNI QRIS 가이드 존재(본문 미열람). Pembulatan(반올림) 설정 문서 존재.
- **영수증** [확인]: 프린터(BT/LAN) 또는 이메일.
- **시프트** [확인]: **Rekap Kas** — 미결 거래 처리 → 결제수단별 수입 + Kas Masuk/Keluar → 제출 → Cetak Struk → Laporan Rekap Kas.

### 1-4. Olsera
- **결제수단** [확인]: Tunai(기본)/Hutang/Kartu Debit/Kartu Kredit; 커스텀 수단(Transfer, QRIS Statis, "QRIS BCA (tidak terintegrasi)"); **Tagihan Tambahan(%)** 카드 서차지. 분할·DP·POD.
- **QRIS** [확인-마케팅]: "QRIS Dinamis 통합 — 거래별 금액 포함 QR 자동 생성, 알림". 공급자 [미확인].
- **영수증** [확인]: Judul Resi(헤더), Catatan Resi(푸터), No. Transaksi 숨김, 이메일 전용 헤더.
- **시프트** [확인]: Aktifkan Shift + Kas Awal di Laci + **마감 기대금액 숨김** 옵션. Mulai Shift → Ringkasan → Total Diharapkan vs Kas Aktual → Riwayat Cetak.

### 1-5. Qasir
- **현금** [확인]: Tunai / Pembayaran Online / Lainnya → jumlah lain 추천 → Uang Pas.
- **비현금** [확인]: DANA/GOPAY/OVO/VISA/MC/Kredit/Debit/Lainnya — **"기록만"** 명시.
- **온라인/QRIS** [확인]: Pembayaran Online(VA / e-wallet / QR) — 최소 IDR 10,000, **"Menunggu Pembayaran"** 큐, Batalkan, 기한 초과 "Batal – Expired Link"; 성공 "Pembayaran Berhasil"; VA 정산 H+2, 수수료 Rp3,108/건.
- **영수증** [확인]: kirim struk → OS 공유 시트. 분할은 "Pecah Pembayaran" 표기.
- **취소** [확인]: Riwayat > Batalkan → 환불 수단 선택(**QRIS·커스텀 불가**) → Kembalikan Dana. 분할 거래는 취소/환불 불가.
- **시프트** [확인]: **Wajib Buka Kasir**, **Pisah Uang Kas Awal**, Buka Kasir(modal) → Masuk/Keluar → Tutup → **Penerimaan Aktual**(현금 수기, 비현금 자동) → Selisih; **Sembunyikan Selisih**(직원 숨김).

### 1-6. iReap POS Pro
- **결제** [확인]: Cash / Card / E-Money / Credit-Sales; "기록·모니터링만".
- **QRIS** [확인]: PG **Espay** → QR 생성 → 화면 표시 또는 인쇄 → 자동 알림, 미반영 시 "check payment status". 0.7%, 정산 3일·Rp5,000/회.

### 1-7. Kasir Pintar
- **현금** [확인]: 수기 또는 **지폐 프리셋 버튼**; 같은 화면 Piutang·Pelanggan·Meja·Keterangan·Diskon·Tax·Metode → 완료 → 즉시 인쇄 또는 Email/WA 공유(템플릿). Multi Payment.
- **EDC** [확인]: "coming soon" → 통합 없음. 결제수단별 **MDR 설정**.
- **QRIS** [확인-간접]: 가이드·입금 알림음·Winpay[추정]. 4.1.4(2026-08) QR Order/Kiosk.
- **영수증** [확인]: 로고, **Kode Struk**(반품 조회), 순번, 단위, Nomor Struk, 총수량, 서명란, 포인트, 세율 숨김, **Struk Online 링크/QR**, Header/Footer, 번호 리셋 주기, Preview/Test Print.
- **시프트** [확인]: 캐시드로어 선택 → 시작 현금 → Mulai; 거래 폼 "Masukkan ke / Ambil dari Cashdrawer / Catat di Rekap"; 종료 **Tunai Diterima** + 메모 → Rekap(Aktual/Sistem, Kas Awal, Penjualan Tunai, Pemasukan, Pengeluaran) → 열프린터.

## 2. 비교표

| 제품 | 현금 | 카드/EDC | QRIS | 영수증 | 이력/환불 | 시프트 |
|---|---|---|---|---|---|---|
| Moka | Charge→수단→Charge | GoBiz PLUS EDC 통합(ECR Link) T+1 | GoPay 통합 H+1 | 로고·매장정보·Email/SMS·WA Business | ACTIVITY 재전송·Issue Refund | Starting→Expense/Income→Actual; Expected/Actual/Diff + EDC/E-Wallet/Other |
| Majoo | Uang Pas / Lainnya / Custom · 잔액·거스름돈 | 비통합(은행·카드번호·명의) / ECR(BCA·BRI) "Sedang diproses…" | Dinamis(팝업+공유+Cek) / Statis / Online / on Bill · 알림음 | 헤더·푸터·세율·재인쇄 제한·대기번호·QR·WA | Daftar Order 후결제 · Pisah Bayar | Kas Kasir(증빙사진) / Tutup PIN / tunai sistem·aktual·selisih |
| Pawoon | [미확인] | BCA EDC 위 구동 | BCA/Mandiri/BNI | 인쇄·Email | [미확인] | Rekap Kas(수단별 수기+모달+출금) |
| Olsera | Tunai | 커스텀 수단·서차지% | "Dinamis 통합" | Judul/Catatan·No 숨김 | 변경이력 | Kas Awal → Diharapkan vs Aktual · 숨김 옵션 |
| Qasir | jumlah lain→Uang Pas | 기록만 | Online(VA/e-wallet/QR) Menunggu·Expired·Batal H+2 | OS 공유 · Pecah 표기 | Batalkan→환불수단(QRIS 불가) | Wajib Buka · Pisah Kas Awal · Penerimaan Aktual · Selisih 숨김 |
| iReap | Other→수단 | 기록만 | Espay 동적 QR 화면/인쇄 · 상태조회 | [미확인] | [미확인] | [미확인] |
| Kasir Pintar | 수기+지폐 프리셋 · 동일화면 | 없음 · MDR 설정 | 알림음 · Winpay[추정] | 토글 多 · Struk Online 링크/QR · 번호 리셋 | Retur/Batal | Cashdrawer 선택 · 폼 체크박스 · Tunai Diterima vs 시스템 |

## 3. 규제·포맷 참고
- **QRIS MPM (BI 사회화 자료)** [확인]: Statis vs **Dinamis(거래마다 생성·금액 포함)**. QR에 QRIS·GPN 로고·가맹점명·NMID·acquirer. **"QRIS 거래 물리 영수증 의무 없음"**. MDR 일반 0.7%, UMI ≤Rp500k 0% / 초과 0.3%.
- **동적 QR API(BRI SNAP MPM v1.1)** [확인]: 요청 `partnerReferenceNo`·`amount`·`merchantId`·`terminalId` → `qrContent`·`referenceNo`; 조회 `latestTransactionStatus`(00~07), `issuerRrn`, `issuerName`, `customerName`, `mpan`. **Midtrans** [확인]: `order_id`·`gross_amount` → `qr_string`, pending→settlement/expire, **만료 15분**, webhook + 폴링, "고객 화면 성공 ≠ acquirer 확인".
  → Meros: QRIS 거래에 **provider ref + issuer RRN + issuer 명 + 만료시각 + 상태 enum** 저장이 표준; 영수증에 RRN 표기가 분쟁 대응에 필수.
- **EDC 영수증(BCA)** [확인]: "APPROVE" 영수증 2매(고객용+가맹점용), trace number로 재인쇄, 정산 마감 **22:00 WIB**, 가맹점번호 885 = 직불. 필드 전체 목록 [미확인]. **비통합 카드는 "은행 + 메모 + (선택) 카드번호" 수준이 현지 관행** [추정] — Majoo조차 승인코드·last4 입력 필드 없음.
- **PB1/PBJT** [확인]: UU HKPD(1/2022) → Pajak Restoran → **PBJT Makanan/Minuman**, 영수증 표기 PBJT 권고(Bapenda DKI). 포장 전용 과자점이 PBJT인지 PPN인지는 지자체 해석 [미확인] — 각 POS가 **세율 라벨·% 표시 토글**로 대응.

## 4. Meros POS에 옮길 best practice [종합]
1. 결제 화면: 좌측 수단 리스트(Tunai 기본) + 상단 **Total / Sisa / Kembalian** 고정 + **Uang Pas·지폐 프리셋(20k/50k/100k)·Custom** + 단일 **Proses Bayar**.
2. 카드 1단계: Majoo 비통합 패턴(은행 선택 + 메모 + 선택 입력 — 승인코드는 **선택**). ECR 통합은 "Kirim → Sedang diproses… → 자동 paid" 상태머신 미리 설계(BCA/BRI).
3. QRIS: 동적 QR 팝업 + Bagikan(WA) + **Cek Pembayaran** 수동 + 자동 webhook + 만료 타이머(15분) + 알림음; 미결 큐("Menunggu Pembayaran") + Expired/Batal.
4. 영수증: 헤더/푸터, 세금 라벨·% 토글, 대기번호, **Struk Online 링크/QR**, 재인쇄 제한, 거래번호 숨김; 결제 블록에 수단·받은 돈·거스름돈·(QRIS) RRN·(카드) 은행/승인번호.
5. 이력: 거래 상세에 수단·상태·참조·시간·캐셔·시프트; 환불은 사유 필수 + 환불 수단 선택(QRIS 환불 불가 처리).
6. 시프트: Kas Awal(강제 옵션) → Kas Masuk/Keluar(증빙) → Tutup: **시스템 현금 vs 실제 → Selisih**, 비현금 수단별 자동 집계, **직원에게 기대금액 숨김**, 열프린터 레캅.

## Sources
- Majoo: https://majoo.id/panduan-pengguna/detail/65 · /68 · /69 · /307 · /283 · /350 · /322 · /323 · /261 · /314 · /313 · /206 · /662 · https://majoo.id/layanan/majoo-pay · https://finance.detik.com/moneter/d-6320359/
- Moka: https://help.mokapos.com/materi-8-menggunakan-aplikasi-moka · /cara-memulai-shift · /cara-melihat-laporan-shift · /cara-mencetak-laporan-shift · /cara-mengatur-tampilan-struk-penjualan · /share-moka-whatsapp-receipt · /cara-membatalkan-transaksi-refund · /cara-melihat-dan-mengunduh-riwayat-transaksi · /tentang-gopay · https://apps.apple.com/id/app/moka-pos-aplikasi-kasir/id955811575 · https://katadata.co.id/digital/fintech/6684febd5a461/ · https://www.mokapos.com/blog/qris
- Pawoon: https://news.dailysocial.id/post/penggunakan-aplikasi-kasir-pawoon/ · https://ocean.bca.co.id/en/produk/solusi-digital/Pawoon · https://www.pawoon-helpcenter.com/ (robots 차단)
- Olsera: https://crm.olsera.co.id/knowledge-base/article/cara-menambah-metode-pembayaran-di-olsera · /cara-mengaktifkan-fitur-shift · /cara-mengubah-tampilan-resi-di-olsera-catatan-resi · https://www.olsera.com/en/pos/features
- Qasir: https://bantuan.qasir.id/id/articles/1444114 · /2557725 · /5796136 · /2624511 · /4019382 · /1829275 · /5756416
- iReap: https://ireappos.com/en/how-to-ireappos-pro/how-to-transaction-payment-using-qris-in-mobile-cashier-android-ireap-pos-pro.php · /using-pay-method.php
- Kasir Pintar: https://help.kasirpintar.co.id/ (Transaksi POS · Tampilan Struk · Memulai/Mengakhiri Shift · Release 4.1.4)
- 규제/PG: https://www.bi.go.id/id/edukasi/Documents/Bahan-Sosialisasi-QRIS.pdf · https://developers.bri.co.id/en/docs/qris-merchant-presented-mode-mpm-dinamis-v11 · https://medium.com/midtrans/how-you-can-integrate-pos-device-with-gopay-an-qris-payment-easily-and-quickly-a0eb1d11de · https://gopay.co.id/bantuan-merchant/pembayaran-qris/cara-menerima-pembayaran-qris · https://www.bca.co.id/id/informasi/Edukatips/2021/04/16/08/02/si-biru-mesin-edc-bca-begini-tips-dan-cara-penggunaannya · https://support.dealpos.com/en/articles/7054767-integrate-with-bca-edc-machine · https://ikpi.or.id/kenapa-pb1-hilang-dari-struk-restoran-ini-penjelasan-lengkapnya/

접근 제한: support.mokapos.com · help.olsera.com · pawoon-helpcenter.com · help.kasirpintar.co.id 일부 — Pawoon·Kasir Pintar QRIS 화면은 Kyu 실기 캡처로 보완 권장.
