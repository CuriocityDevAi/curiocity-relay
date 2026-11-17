PR #348 · 연결 8 · Phase -1 없이 가능 4 · 미리 정할 T2 설계 5 · Kyu 질문 3

## 결과 요약

**PR**: https://github.com/CuriocityDevAi/storeport/pull/348  
**파일**: `docs/plans/todoboss-integration-check.md`

---

## T1~T8 판정 결과

| 항목 | Phase -1 없이 가능? | 핵심 발견 |
|------|---------------------|-----------|
| T1 직원 동기화 | ✅ | Todoboss user.id↔Medusa admin user 매핑 키 없음 |
| T2 주문 연동 | 계약만 ✅ · 실구현 ❌ | todoboss_bridge 스켈레톤만 · outbox 미생성 |
| T3 생산 확정→재고 | ✅ (주문 연결 제외) | TASK_OUTPUT source_type 선언 있음 · item 매핑 없음 |
| T4 발주 | ❌ 미결정 | 정본 미결정 |
| T5 품목 마스터 | ✅ (매핑 테이블만) | 양쪽 독립 item 모델 · 매핑 없음 |
| T6 근태 | ✅ | pos-import 엑셀 → register_session API 대체 가능 |
| T7 알림 | ✅ | PushService 스켈레톤 존재 (PUSH_ENABLED=false) |
| T8 픽업 완료 | ❌ | tb_promise_order Phase -1 완료 필요 |

**Phase -1 없이 가능**: 4개 (T1·T3재고·T6·T7)  
**Phase -1 필요**: 2개 (T2 실구현·T8)  
**미결정**: 1개 (T4 발주 정본)

---

## T2 설계 미리 정할 사항 (5개)

1. 이벤트 이름 형식 — `commerce.order.created.v1` 등 (현재 주석만)
2. `external_ref_kind = 'anchor_pos'` 공식 선언 (두 레포 계약 파일)
3. outbox 멱등 키 형식 — `{source_system}:{order_id}:{event_type}`
4. Todoboss `PosConnector.fetchData()` payload 필드 계약 (order_id·product_id 등)
5. HMAC 서명 키 관리 방식

---

## Kyu 결정 Q1~Q3

- **Q1**: Todoboss user.id ↔ MEROS Medusa 사용자 연결 키 (email 단일화 or store_code+이름?)
- **Q2**: T3 item 매핑 위치 — MEROS variant metadata vs Todoboss item.external_ref 컬럼?
- **Q3**: T8 단기 연동 방식 — 폴링 vs MEROS→Todoboss 웹훅 푸시?

---

## 권장 착수 순서

- Round A (30분, docs-only): T2 계약 고정 · Q1~Q3 결정
- Round B (45분): T6 근태 직접 API 연결
- Round C (45분): T3 재고 주입 엔드포인트 (주문 연결 없이)
- Round D (30분, Phase -1 후): T8 픽업 완료 연결
- Round E (Phase -1 후): T2 주문 연동 실구현
