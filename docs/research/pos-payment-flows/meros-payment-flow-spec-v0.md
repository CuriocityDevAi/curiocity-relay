# Meros POS 결제·영수증 흐름 정본 v0 (오케 종합 · 2026-11-04)

입력: `global-reference.md`(Square·Toast·Shopify·Lightspeed·Loyverse·Odoo·Clover·Medusa) + `indonesia-reference.md`(Moka·Majoo·Pawoon·Olsera·Qasir·iReap·Kasir Pintar·BI/BRI/Midtrans). Kyu 원문(11-04): 현금 수령 입력·서랍 반영 / EDC 전송·결과·카드 영수증 디지털본 / QRIS 동적 QR·승인 결과 / **Meros 자체 영수증 포맷(EDC 전표 스타일)을 주문 상세에**.

설계 원칙: **결제 "과정"은 지금 완성도 있게 만들고, 돈이 실제로 오가는 자리(provider)만 나중에 끼운다.** 그래서 모든 흐름을 "상태 머신 + 텐더 레코드 + 영수증 스냅샷"으로 먼저 고정하고, provider는 `pp_cash` · `pp_edc_manual` · `pp_qris_<pg>` 3개의 Medusa Payment Provider 자리로 둔다.

---

## 1. 공통 결제 화면 (Tender)

**레이아웃** (Majoo/Kasir Pintar + Square 합성)
- 상단 고정: **Total** · **Sisa**(남은 금액) · **Kembalian**(거스름돈) — 분할 결제도 같은 자리.
- 좌측: 결제수단 리스트 — Tunai(기본 선택) · Kartu(EDC) · QRIS · (추후) Transfer/Lainnya.
- 중앙: 수단별 서브 패널(아래 2~4).
- 하단: **Proses Bayar** 단일 버튼 · "Pisah Bayar"(분할) 토글.
- 분할: 첫 텐더 금액 기본 = 전액 → 성공하면 텐더 라인 추가 → **Sisa가 다음 텐더 기본값** → Sisa 0이면 완료. 중간 이탈 시 성공한 전자결제는 void/refund 보상(v1에선 "분할 중 취소 금지" 경고로 대체 가능).
- 반올림: IDR 현금만 100 단위(설정) 반올림 · 영수증에 `Pembulatan` 라인.

**완료 화면 "Transaksi Berhasil"**: 영수증 미리보기(§5 포맷) · Cetak · Bagikan(WA/Email/링크) · "주문 보기" · "새 주문".

## 2. 현금 (Tunai) — 상태 머신

```
tender_cash: input → confirmed → captured
```
- `input`: Uang Diterima 입력. 기본값 = 반올림 총액. **Uang Pas** 버튼 · 지폐 프리셋(총액 올림: 20k · 50k · 100k · 다음 단위) · Custom 숫자패드. Kembalian 실시간 = 받은 돈 − 총액. 부족하면 Proses 비활성(또는 분할 전환).
- `confirmed`: Proses Bayar → 서랍 킥(프린터 경유 · 없으면 스킵) → 영수증.
- 저장(텐더 레코드): `method=cash, amount, tendered, change, rounding, drawer_session_id, cashier_id, at`.
- 서랍: `register_session.cash_expected += amount` (환불은 −). Tutup Kasir에서 시스템 vs 실제 vs Selisih.

## 3. 카드 (Kartu / EDC) — 상태 머신

```
tender_card: select_bank → sent → in_progress → approved | declined | canceled | timeout
                                               ↘ comm_error → status_check → approved | unknown → manual_confirm
```
**v1 (비연동 EDC · 지금 구현)**: `select_bank` → 캐셔가 단말에서 거래 → 화면은 **"EDC에서 카드 거래를 진행해 주세요"**(대기 상태 · 금액 크게 · 취소 버튼) → 캐셔가 **승인 / 거절** 버튼 → 승인이면 **결과 입력 시트**: 은행(필수) · 승인번호(선택 · 6자리) · 카드 브랜드(Visa/MC/GPN/기타 · 선택) · 마지막 4자리(선택) · 메모 → 저장 → `approved(entry_mode=manual_confirm)`. 거절이면 `declined` + 다른 수단 선택.
**v2 (ECR 연동 · Mandiri/MTI 또는 BCA/BRI)**: `sent`(금액 전송) → `in_progress`(단말 응답 대기 · 90~300초 타임아웃) → 응답으로 `approved/declined` 자동 · 통신 실패 시 `status_check` → `unknown`이면 v1의 수기 시트가 **Force Done** 역할.
- 저장: `method=card, amount, bank, brand, last4, entry_mode, auth_code, rrn, trace, tid, mid, batch, approved_amount, raw_response`. v1은 bank·auth_code·brand·last4만.
- **카드 영수증 디지털본**: §5 영수증의 결제 블록에 EDC 전표 형식(가맹점·TID/MID·카드·승인번호·금액·APPROVE)으로 렌더. v1은 입력한 필드만 · 빈 칸은 "-".

## 4. QRIS — 상태 머신

```
tender_qris: creating → qr_shown → customer_paying → settled | expired | canceled | failed
                                 ↘ unknown(고객 "냈다" · 미확인) → manual_check → settled | hold
```
- `creating`: 서버가 PG charge → `qr_string`, `reference_no`, `expires_at`(15분). 실패 → 재시도/다른 수단.
- `qr_shown`: **QR 전체화면 모드**(고객에게 돌려 보여줌) · 금액 · 카운트다운 · "Bagikan QR"(WA) · "Cek Pembayaran" 수동 버튼 · 취소.
- `customer_paying`: PG 중간 상태(BRI 02 등)가 오면 표시.
- `settled`: 서버 webhook → SSE/폴링(10초)로 POS 갱신 → 알림음 → 영수증. 저장: `method=qris, amount, pg, reference_no, issuer, issuer_rrn, paid_at`.
- `expired/canceled`: 캐셔 취소 시 반드시 Cancel API. 주문은 **"Menunggu Pembayaran"** 큐에 남김(Qasir 패턴) → 재생성 또는 다른 수단.
- `unknown`: "확인 중" 화면 + 수동 조회 + 주문 보류(`awaiting`). **settlement 전 상품 전달 금지** 문구.
- v1(PG 전): QRIS 선택 시 `qr_shown` 대신 **"정적 QR 안내 + 수기 확인"**(은행 QRIS 스티커 사용 가정) — issuer·RRN 수기 입력 선택. PG 붙으면 `pp_qris_<pg>`만 교체.

## 5. 영수증 (Struk) — Meros 자체 포맷

**원칙**: 주문당 불변 스냅샷(`receipt.snapshot` jsonb) · 주문 상세에서 **EDC 전표 스타일 카드**로 렌더 · 58mm(32자)/80mm(48자) 텍스트 레이아웃과 화면 렌더가 같은 데이터에서 나옴.

```
┌─ MEROS 영수증 마크(로고) ─┐
 {store_name} / {address} / {phone} / NPWP(선택)
 No. {receipt_no}   {issued_at}
 Kasir: {cashier}   Shift: {shift_no}   Order #{display_id}
 ─────────────────────────
 {item}            {qty} x {unit}   {line_total}
   diskon                             -{disc}
 ─────────────────────────
 Subtotal                          {subtotal}
 Diskon                            -{discounts}
 {tax_label} {rate}%               {tax}      ← 라벨·% 표시 토글(PBJT/PPN)
 Pembulatan                        {rounding}
 TOTAL                             {grand_total}
 ─────────────────────────
 [결제 블록 · 텐더별 반복]
 TUNAI       {amount}   Diterima {tendered}  Kembali {change}
 KARTU {bank} {brand} ****{last4}  APPROVAL {auth_code}  RRN {rrn}  TID {tid}  → "APPROVE"
 QRIS  {issuer}  RRN {issuer_rrn}  Ref {reference_no}  {paid_at}
 ─────────────────────────
 {footer_text}  · Struk online: {receipt_url 또는 QR}
 *** COPY *** (재인쇄 시)   /   REFUND (환불 영수증 · 원본 No 참조)
```
- `receipt_no` = `R-YYMMDD-####`(매장·레지스터별 시퀀스 · 리셋 주기 설정).
- `kind ∈ {sale, reprint, refund, void}` · `reprint_count` · 재인쇄 횟수 제한 설정.
- 전달: `delivered_via[] ∈ {print, whatsapp, email, link}` · WA는 OS 공유 시트(1차) · 공개 토큰 URL(`/r/{token}`)로 Struk Online.
- 설정(Admin): 헤더/푸터 텍스트 · 로고 모드 · 세금 라벨·% 토글 · 대기번호 · 거래번호 숨김 · 재인쇄 제한.

## 6. 주문 상세 (Order Detail)

- 상태 배지: `not_paid · awaiting · partially_paid · paid · partially_refunded · refunded · voided` (Medusa payment_status 집계 그대로).
- **텐더 라인 테이블**: 수단 · 금액 · 상태 · 참조(승인번호/RRN/Ref) · 시각 · 캐셔.
- **영수증 카드**: §5 렌더 (접기/펼치기) · 재인쇄 · 재발송 · 링크 복사.
- 타임라인: created · tender_* 이벤트 · captured · receipt_printed/sent · refunded · voided (+ raw payload 토글).
- 액션: 잔액 수금(분할/보류) · 환불(사유 필수 · 환불 수단 선택 · QRIS 환불 불가 안내) · 보이드.

## 7. 시프트/서랍 (register_session 확장)

- Buka Kasir: Kas Awal(강제 옵션) · 캐시드로어 선택.
- 운영: Kas Masuk/Keluar(금액·사유·증빙 사진 선택).
- Tutup Kasir: 결제수단별 시스템 집계(현금·카드[은행별]·QRIS[발급사별]) · **현금 시스템 vs 실제 입력 → Selisih** · "직원에게 기대금액 숨김" 옵션 · PIN · Z 리포트 인쇄(§영수증 프린터).
- Z 리포트 구조: 헤더 / 매출(총·할인·환불·순·세금·반올림) / 수단별 정산(건수·금액·환불) / 현금 조정(시작·in/out·기대·실제·차액) / 카운터(주문·보이드·재인쇄).

## 8. Medusa 매핑 (provider 자리)

| 개념 | 구현 |
|---|---|
| 텐더 1건 | `payment_collection` 1건(amount = 텐더 금액) — 주문:컬렉션 1:N · `payment_status` 집계 공짜 |
| 현금 | `pp_cash` provider: authorize가 `{tendered, change, rounding, drawer_session_id}`를 data로 → 즉시 capture |
| 카드 v1 | `pp_edc_manual`: initiate no-op · authorize가 캐셔 입력 검증 → authorized → capture |
| 카드 v2 | `pp_edc_<bank>`: initiate = 단말 전송 · getPaymentStatus = 폴링 · webhook = 콜백 |
| QRIS | `pp_qris_<pg>`: initiate = charge → `data{qr_string, expires_at}` · authorize = settlement면 authorized 아니면 pending_authorization · webhook → captured · cancel = Cancel API |
| 영수증 | 신규 모듈 `receipt`(order link · snapshot · receipt_no seq · kind · delivered_via) |
| 시프트 | 기존 `register_session` 확장(opening_float · pay_in/out · expected_by_method · counted · diff) |
| 앱 ↔ 서버 | `POST /admin/pos/orders/{id}/tenders`(수단·금액·입력값) · `GET …/tenders/{id}/status`(SSE 또는 폴링) · `POST …/receipt/{reprint|send}` |

주의: provider `initiatePayment` data는 공개됨 → PG 키·원본 응답 금지(qr_string·expires_at만).

## 9. 라운드 분할 제안 (계획 게이트 입력)

| 라운드 | 내용 | 리포 | PG 필요 |
|---|---|---|---|
| **P1 서버 골격** | `receipt` 모듈 · `pp_cash`·`pp_edc_manual`·`pp_qris_manual` provider · 텐더 API · register_session 확장 · 영수증 스냅샷 생성 | storeport | ✗ |
| **P2 현금 화면** | Tender 레이아웃 · Tunai 패널(Uang Pas·프리셋·Custom·Kembalian) · 완료 화면 · 영수증 카드(주문 상세) | fork | ✗ |
| **P3 카드 v1** | EDC 대기 화면 · 승인/거절 · 결과 입력 시트 · 전표 스타일 렌더 | fork | ✗ |
| **P4 QRIS v1 + 미결 큐** | 정적 QR 안내 · 수기 확인 · Menunggu Pembayaran 큐 · 만료/취소 | fork | ✗ |
| **P5 시프트 화면** | Buka/Tutup Kasir · Kas Masuk/Keluar · Selisih · Z 인쇄 | fork(+storeport) | ✗ |
| **P6 분할·환불** | Pisah Bayar · 환불 수단·사유 · 환불 영수증 | both | ✗ |
| **P7 QRIS 동적(PG)** | `pp_qris_xendit` · webhook · SSE · QR 전체화면 | both | **Xendit/Midtrans 결정** |
| **P8 EDC 연동** | MTI ECR / BCA·BRI ECR | both | 은행 API |

각 라운드는 계획 게이트 뒤 PR 1~2개 · 파일 주인 명시 · R0 리뷰 · Kyu 아이패드 실기.

## 10. Kyu 결정 필요 (사업/UX)
1. IDR 현금 반올림 단위(100? 500? 없음?) · 2. 세금 라벨(PBJT vs PPN · 표시 여부) · 3. 비연동 카드 결과 입력에서 승인번호를 **필수**로 할지(현지 관행은 선택) · 4. 영수증 전달 채널 우선순위(WA 공유 시트 vs 링크) · 5. 분할 결제 v1 포함 여부 · 6. PG(Xendit/Midtrans) — P7 전까지.
