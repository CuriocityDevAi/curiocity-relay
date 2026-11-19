fork #207 CHANGES · fork #209 APPROVE

# R0C-1119-X — fork #207 / #209 클라우드 리뷰 (2026-11-19)

## #207 (M2-1119-S·T) — CHANGES
- head 579128c · 코멘트: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/207#issuecomment-7008525560
- ① 슬립 통일 **미충족**
  - 컴포넌트는 둘 다 `PaymentSlipCard` 로 같음
  - 데이터가 다름: 결제 중 슬립은 storeName=null 에 storeHeader 도 없어서 상단이 비어 있음. 완료 화면 슬립은 snapshot.store.name + header 텍스트만 나옴
  - 로고·주소·WA 는 둘 다 없음
  - StockLocation.name 은 더 이상 안 씀 (O)
- ① Ref **불일치**: 결제 중 = payment_request_id(reference_no), 완료 화면 = qris_receipt_id. qris_receipt_id 가 없으면 "Xendit ID" 라벨이 붙음. 결제 직후 Ref 가 없을 때는 줄만 생략됨
- ② Next customer **O**
  - 순서: draft 손님 캐시 비움 → POST /registers/:id/next-customer(서버가 손님 화면 리셋) → /products
  - 카트는 결제 완료로 이미 새 draft
  - Hand over 전에도 누를 수 있음 (takeaway 분기 한정)
  - 작은 문제: register 세션이 없으면 서버 호출을 조용히 건너뜀
- ③ **O**: 'entering' 이 뜨려면 polled_at 이 15초 안이어야 하고(기존) polled_at ≥ paid_at 이어야 함(신규)
- ④ **미충족 가능성 높음**
  - 버튼이 flex-1(basis 0) + numberOfLines=1 이라 줄바꿈 대신 "…" 로 잘림
  - 360px 브라우저 재현: 6개 모두 한 줄 · 각 53px · 전부 잘림
  - Done 을 마지막 줄 전체 폭으로 보내는 처리 없음
- 검증 (로컬)
  - vitest 786 pass · 1 file fail (splitview-capture.spec, master 와 같음)
  - tsc 14 error = master 와 같은 목록, 신규 0
  - expo lint 0 error
- CI: playwright 실패 = m1-1105-ao·m3-1105-d·m3-1105-p 3개뿐이고, master 에서도 실패하던 것 (run 44510298662). #207 변경과 무관

## #209 (M3-1119-P) — APPROVE
- head ef9a15e · 코멘트: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/209#issuecomment-7008527685
- concurrency
  - lint.yml 에만 추가. lint job 하나뿐이고 배포 job 은 없음 → master push 때 끊겨도 문제 없음
  - ci.yml 은 원래부터 같은 설정
  - 그룹 이름에 workflow 가 들어가서 CI 와 Lint 가 서로 끊지 않음
- playwright 수정
  - testID 이름 변경·숫자 키패드 전환을 따라간 것이고, 검증을 뺀 곳은 없음
  - m3-1105-p C-7 이 보낸 값(approval·last4)을 그대로 확인함
  - m1-1105-ao 기댓값이 cashButtonSet 계산과 맞음
  - 작은 공백(nit): 100k 버튼이 보이는 경우를 확인하는 케이스는 없음
- CI run 44516069812: 전부 초록 · playwright 27/27 PASS
- 로컬 vitest·tsc·lint 결과 = master 와 같음

## 충돌
- #207 ∩ #209: 겹치는 파일 없음 · 자동 머지 OK
- #207 ∩ #208: `app/checkout/success/[orderId].tsx` 를 같이 건드리지만 다른 블록이라 자동 머지 OK
  - 의미상 주의: #208 은 완료 화면에 들어갈 때 'paid' 를 보내고, #207 Next customer 는 next-customer POST 를 보냄. 바로 누르면 두 요청의 순서가 엇갈릴 수 있음 → 실기에서 확인 권장

push·머지 없음.
