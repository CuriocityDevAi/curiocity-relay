# PIM / PS 매장 정보 (Kyu 11-25 11:32 · PS 매장 만들기 setup-multi-store 입력값)

원문:
- PIM 매장 정식 이름 : Soopsok sweets PIM3, 주소 : Pd. Indah Mall 3, Jl. Kartika Utama No.11 Lt. LG, RT.6/RW.3, Pd. Pinang, Kec. Kebayoran Lama, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12310
- PS 매장 정식 이름 : Soopsok sweets Plaza Senayan, 주소 : Jl. Asia Afrika No.8, RT.1/RW.3, Gelora, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10270
- "PS 는 PB1 세금을 안붙여."
- 11:39 표기: "브랜드를 표현할때는 대문자를 쓰나? 그러면 대문자 방식으로 해주고" → **Soopsok Sweets** (title case) 확정.

정리:
| 매장 | 정식 이름 (= stock location name) | 주소 (pos_settings location store_address) | PB1 |
|---|---|---|---|
| PIM | Soopsok Sweets PIM3 | Pd. Indah Mall 3, Jl. Kartika Utama No.11 Lt. LG, RT.6/RW.3, Pd. Pinang, Kec. Kebayoran Lama, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12310 | 붙임(현행 10%) |
| PS | Soopsok Sweets Plaza Senayan | Jl. Asia Afrika No.8, RT.1/RW.3, Gelora, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10270 | 안 붙임 |

스크립트가 안 하는 것(apply 뒤 Admin 손작업): PS PB1 끄기(매장 override · 기본은 브랜드 PB1 상속) · PS 닉네임 지정(주문번호 접두).

상태 / 경로:
- 11:32 railway login 만료 → 11:38 재로그인 후 dry-run → `postgres.railway.internal` ENOTFOUND (railway run 은 Mac 에서 실행 · 내부 DB 주소 접근 불가).
- 11:44 Postgres 변수 이름 확인: DATABASE_PUBLIC_URL 없음(TCP 프록시 꺼짐). 
- 다음 = 경로 A(권장) `railway ssh --service commerce-core` 로 컨테이너 안에서 실행 — 컨테이너 안 스크립트 위치(src/ 또는 .medusa/server/src/scripts/*.js) 확인부터. 경로 B = Postgres 바깥 접속 임시 켜기(끝나면 끄기).
