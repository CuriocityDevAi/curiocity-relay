# M1-1123-A · 리포트

**판정**: 완료 · docs-only · 코드 수정 없음

**PR URL**: https://github.com/CuriocityDevAi/storeport/pull/412

**문서 경로**: `docs/plans/pos-multi-customer-v3.md` · 212줄 · 커밋 `fea8019`  
브랜치: `docs/M1-1123-A-pos-multi-customer-v3` · storeport main 기준

---

## 라운드 표 요약

| 라운드 | 대상 | 주요 파일 | 예상 |
|--------|------|-----------|------|
| R1 서버 | commerce-core | service.ts (가드 제거 · paid 보존) · lifecycle.ts (우선순위 · EOB · phone_entry_open) · CD active route | 60분 |
| R2 POS Sell + 칩 | pos-m1 / fork | _layout.tsx · sell.tsx(신규) · draft-orders.tsx · OrderChips.tsx(신규) · CartBottomBar.tsx(신규) · CartSheet.tsx(신규) | 90분 |
| R3 CD 규칙 | customer-display | display-machine.ts (B 규칙) · useDisplayMachine.ts · QrisScreen.tsx | 60분 |
| R4 세로 레이아웃 | pos-m1 | sell.tsx · CartBottomBar.tsx · CartSheet.tsx · OrderChips.tsx | 45분 |

---

## 열린 질문

**Q1. computeLinkOpenUntil 영업 마감 계산**  
권장: register_session에 `closing_at` 추가. fallback = 당일 23:59 WIB.

**Q2. 카트 목록 — SecureStore vs in-memory**  
권장: in-memory 목록 + SecureStore는 현재 선택된 draft_id만 유지. 재시작 시 서버 재조회.

**Q3. "번호 없음" 칩 2분 타이머**  
권장: 클라이언트 타이머(paid_at + 2min). 서버 필드 추가 불필요.

---

_생성 시각: 2026-11-23 · 모델: Sonnet · 코드 수정 無 · PR #412_
