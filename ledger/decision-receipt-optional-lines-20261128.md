# 영수증 — 프린터에 없는 줄(NPWP·봉사료) Kyu 결정 (2026-11-28 10:14 WIB)

배경: M3-1128-E 진단 — storeport 패키지가 프린터와 8곳 다름(패키지 7 · fork#292 어댑터 1). 그중 NPWP·Service charge 줄은 패키지에만 있고 매장 프린터(fork master)에는 없음.
질문(오케 10:0x): 데이터가 있을 때만 찍기(추천) vs 프린터처럼 아예 빼기.
Kyu 10:14: "데이터가 있을때만 찍어줘"
결정: NPWP·Service charge 줄은 값이 있을 때만 출력 · 없으면 프린터와 바이트 동일. 나머지 원칙은 decision-receipt-single-source-20261127 그대로(프린터가 원본 · 금액 표기만 Rp).
구현: M0-1128-D (storeport 패키지 + 프린터 기준 파일 비교) → 다음 fork#292 어댑터.
