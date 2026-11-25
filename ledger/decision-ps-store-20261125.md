# PIM / PS 매장 정보 (Kyu 11-25 11:32 · PS 매장 만들기 setup-multi-store 입력값)

원문:
- PIM 매장 정식 이름 : Soopsok sweets PIM3, 주소 : Pd. Indah Mall 3, Jl. Kartika Utama No.11 Lt. LG, RT.6/RW.3, Pd. Pinang, Kec. Kebayoran Lama, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12310
- PS 매장 정식 이름 : Soopsok sweets Plaza Senayan, 주소 : Jl. Asia Afrika No.8, RT.1/RW.3, Gelora, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10270
- "PS 는 PB1 세금을 안붙여."
- 11:39 표기: "브랜드를 표현할때는 대문자를 쓰나? 그러면 대문자 방식으로 해주고" → **Soopsok Sweets** (title case) 확정.
- 13:17 PS 닉네임: "ps 로 해줘" → **PS** (주문번호 PS26B…).

정리:
| 매장 | 정식 이름 (= stock location name) | 주소 (pos_settings location store_address) | PB1 | 닉네임 |
|---|---|---|---|---|
| PIM | Soopsok Sweets PIM3 | Pd. Indah Mall 3, Jl. Kartika Utama No.11 Lt. LG, RT.6/RW.3, Pd. Pinang, Kec. Kebayoran Lama, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12310 | 붙임(현행 10%) | PIM (기존 · Kyu PIM/PIM3 결정 대기) |
| PS | Soopsok Sweets Plaza Senayan | Jl. Asia Afrika No.8, RT.1/RW.3, Gelora, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10270 | 안 붙임 (--ps-pb1 off) | PS (--ps-nickname PS) |

경로 / 상태:
- 11:38 Mac railway run → postgres.railway.internal ENOTFOUND · DATABASE_PUBLIC_URL 없음 → 경로 A(railway ssh 컨테이너 안 실행) 확정 (M0-1125-G: WORKDIR /app/.medusa/server · 컴파일 js · `--` 필수).
- storeport #432 (M0-1125-H) 머지 13:02 WIB — 2회 apply 멱등 · --ps-pb1 · --ps-nickname. R0-1125-Q APPROVE (운영 주의: --pim-name 생략 시 기본 "PIM" 으로 rename 됨 → 반드시 명시).
- 13:17 Kyu 에게 배포 확인 → 컨테이너 dry-run 안내. apply 는 dry-run 출력 확인 뒤.
