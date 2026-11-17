# M1-1117-H Report — PR #177

**PR:** https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/177  
**Date:** 2026-11-17  
**Status:** ✅ push + PR 발의 완료

---

## 작업 내용

- `fix/M1-1117-G` 브랜치를 `origin/master` (#172 등 머지됨) 기반으로 신규 생성
- G 커밋(`de91c34`) cherry-pick → `origin/fix/M1-1117-G` push
- `gh pr create` → PR #177 발의

## PR 본문 요약 (G 리포트 기반)

- ② split 영수증 `CASH (1st Slip)` / `QRIS (2nd Slip)` 오디널 레이블
- ③ 환불 실패 후 PIN 재진입 시 이전 값 초기화 버그 수정
- ④ QRIS 주문 Void 시트 → "Go to Refund" 버튼으로 Refund 모드 전환

## Kyu 확인 항목

- [ ] Cash 50,000 먼저 → Payment 1 of 2 슬립
- [ ] 최종 영수증: CASH (1st Slip) / QRIS (2nd Slip)
- [ ] 환불 실패 후 같은 창에서 PIN 다시 입력 가능
- [ ] QRIS 주문 Void → [Go to Refund] 클릭 → Refund 모드 전환
