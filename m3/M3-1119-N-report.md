storeport PR #399 · POS M 46.9% · 기존 CD M 69.9% · 채택 65%(312px) · 빌드 53db27df-6597-4b66-b7a5-4ff7505e5fb6 IN_QUEUE · 설치 URL -

# M3-1119-N 완료 보고

## [REQ] #1 기준 측정

| 아이콘 | M 높이 (px) | 캔버스 비율 | POS 대비 |
|--------|------------|-----------|---------|
| POS (icon.png 실측) | 480px | 46.9% | 100% (기준) |
| POS (SVG 기준) | 512px | 50.0% | — |
| 기존 CD (icon.png 실측) | 716px | 69.9% | **149.2%** ← 문제 |
| 기존 CD (icon-hp.svg 기준) | 410px | 40.0% | 85.4% |

## [REQ] #2 시안 3개

| 시안 | CD M 높이 | 캔버스 비율 | POS 대비 |
|------|---------|-----------|---------|
| 75% | 360px | 35.2% | 75.0% |
| **65% (채택)** | **312px** | **30.5%** | **65.0%** |
| 55% | 264px | 25.8% | 55.0% |

**채택 이유**: 75%는 CUSTOMER 텍스트 추가 고려 시 여전히 POS 대비 크게 보일 수 있음.
65%가 M + CUSTOMER 조합으로 POS 단독 M 과 나란히 놓았을 때 가장 자연스러운 비율.
55%는 M 존재감이 약해짐.

## [REQ] #3 비교 이미지
`assets/brand/M3-1119-N-icon-compare.png` 생성 · PR 본문 첨부 완료

## [REQ] #4 적용 완료
65% 시안 → `assets/icon.png` 적용 · `scripts/gen-icons.mjs` 업데이트

## [REQ] #5 EAS 빌드
빌드 ID: 53db27df-6597-4b66-b7a5-4ff7505e5fb6
상태: IN_QUEUE (2026-11-19T11:02:05Z 시작)
플랫폼: iOS · 프로파일: development
앱: customer-display (id.storeport.customerdisplay)
커밋: f8a6e6e — fix(customer-display): M3-1119-N — CD 아이콘 M 크기 축소 (65% of POS M)
설치 URL: 빌드 완료 후 EAS 대시보드에서 확인 (아직 IN_QUEUE)
