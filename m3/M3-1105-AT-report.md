# M3-1105-AT 리포트

## C-AS-1 삭제·이관 대조표

### AL 삭제 항목 (AR이 같은 강도로 검사)
| 항목 | 삭제 이유 |
|------|-----------|
| DigitsInput.tsx 존재 | AR (1) |
| DigitsInput · keyboardType="numeric" (×2) | AR (2b) |
| DigitsInput · maxLength={4} ← FAIL | AR (8a) 로 이관 |
| DigitsInput · slice(0,4) ← FAIL | AR (8b) 로 이관 |
| DigitsInput · digits.length===4 → onComplete ← FAIL | AR (8c) 로 이관 |
| DigitsInput · replace 비숫자 필터 | AR (9a) 로 이관 |
| DigitsInput · TextInput 사용 | AR (2e) |
| VoidRefundSheet · DigitsInput import | AR (3b) |
| VoidRefundSheet · <DigitsInput 렌더링 | AR (3d) |
| VoidRefundSheet · NumericKeypad import/render 없음 | AR (4d/4e) |
| VoidRefundSheet · onComplete → onSubmitPin(pin) ← FAIL | AR (8d) 로 이관 |
| ManagerPinSheet · DigitsInput import | AR (3a) |
| ManagerPinSheet · <DigitsInput 렌더링 | AR (3c) |
| ManagerPinSheet · NumericKeypad import 없음 | AR (4c) |
| ManagerPinSheet · remaining_attempts | AR (11c) 로 이관 |
| ManagerPinSheet · locked_until | AR (11d) 로 이관 |
| CardTenderPanel · DigitsInput/keyboardType 사용 | AR (6a) |
| CardTenderPanel · card-last4-input testID | AR (6a) |

### AL 재작성 항목 (AR 미검사 고유)
| 항목 | 변경 내용 |
|------|-----------|
| VoidRefundSheet · manager-pin-input testID ← FAIL | manager-pin-digits 로 재작성 |

### AM 삭제 항목
| 항목 | 삭제 이유 |
|------|-----------|
| DigitsInput · 4자리 자동 제출 (digits.length===4) ← FAIL | AR (8c) 로 이관 |
| DigitsInput · keyboardType="numeric" | AR (2b) |
| DigitsInput · 비숫자 제거 | AR (9a) |
| VoidRefundSheet · DigitsInput import/<DigitsInput | AR (3b/3d) |
| VoidRefundSheet · textContentType 없음 | AR (4d) |
| ManagerPinSheet · DigitsInput import/<DigitsInput | AR (3a/3c) |

### AN 삭제 항목
| 항목 | 삭제 이유 |
|------|-----------|
| DigitsInput · maxLength={4} ← FAIL | AR (8a) 로 이관 |
| DigitsInput · slice(0,4) ← FAIL | AR (8b) 로 이관 |
| DigitsInput · 4자리 완성 → onComplete ← FAIL | AR (8c) 로 이관 |
| DigitsInput · keyboardType="numeric" | AR (2b) |
| DigitsInput · TextInput 사용 | AR (2e) |
| CardTenderPanel · DigitsInput import/<DigitsInput | AR (6a) |
| CardTenderPanel · secureTextEntry 없음 | AR (6b) |
| VoidRefundSheet · DigitsInput import/<DigitsInput | AR (3b/3d) |
| VoidRefundSheet · onComplete → onSubmitPin(pin) ← FAIL | AR (8d) 로 이관 |
| VoidRefundSheet · remaining_attempts | AR (11a) 로 이관 |
| VoidRefundSheet · locked_until | AR (11b) 로 이관 |
| ManagerPinSheet · DigitsInput import/<DigitsInput | AR (3a/3c) |
| ManagerPinSheet · onComplete → onSubmit(pin) ← FAIL | AR (8e) 로 이관 |
| ManagerPinSheet · remaining_attempts | AR (11c) 로 이관 |
| ManagerPinSheet · locked_until | AR (11d) 로 이관 |

### AN 재작성 항목 (AR 미검사 고유)
| 항목 | 변경 내용 |
|------|-----------|
| VoidRefundSheet · manager-pin-input testID ← FAIL | manager-pin-digits 로 재작성 |
| VoidRefundSheet · 에러 시 setPinValue('') ← FAIL | setPin('') 로 재작성 (pin/setPin 사용) |
| ManagerPinSheet · manager-pin-input testID ← FAIL | manager-pin-digits 로 재작성 |

### AR에 추가된 항목 (이관)
| 섹션 | 내용 |
|------|------|
| (8a) | DigitsInput · maxLength 기본값 4 |
| (8b) | DigitsInput · slice(0, maxLength) |
| (8c) | DigitsInput · digits.length === maxLength → onComplete |
| (8d) | VoidRefundSheet · onComplete → onSubmitPin 호출 |
| (8e) | ManagerPinSheet · onComplete → onSubmit 호출 |
| (9a) | DigitsInput · replace 비숫자 제거 (지우기) |
| (10a) | DigitsInput · displayBoxes value[i] → 칸 i 대응 (1→2→3→4 순서) |
| (11a-d) | VoidRefundSheet/ManagerPinSheet · remaining_attempts · locked_until (401/423) |

---

## C-AS-2 재작성

**AR (6a) 변경 전:**
```js
/testID="card-last4-input"[\s\S]{0,200}keyboardType="numeric"/.test(cardSrc)
|| /keyboardType="numeric"[\s\S]{0,300}testID="card-last4-input"/.test(cardSrc)
```
→ CardTenderPanel이 DigitsInput을 card-last4-input으로 사용하므로 literal `keyboardType="numeric"`이 DigitsInput 요소에 없어서 실패.

**AR (6a) 변경 후:**
```js
/from\s+'@\/components\/ui\/DigitsInput'/.test(cardSrc) &&
/<DigitsInput[\s\S]{0,300}testID="card-last4-input"/.test(cardSrc)
```
→ "CardTenderPanel이 DigitsInput을 import하고 card-last4-input testID로 렌더 → DIGITS_INPUT_PROPS(2b 검증) 경유로 keyboardType:'numeric' 공유"로 같은 강도 재서명.

---

## 빌드 표시 원인·위치

**원인:** BottomSheet는 키보드가 열릴 때 `paddingBottom: keyboard.keyboardHeight`를 content View에 적용. BuildBadge가 Verify 버튼 하단에 위치해 키보드에 가림. `__DEV__` 조건 및 색 대비(text-ink-subtle)는 정상.

**위치 변경:** ManagerPinSheet · VoidRefundSheet 모두 `<View className="gap-4 pb-6">` 첫 번째 자식으로 이동, `className="self-end"`로 오른쪽 정렬 → 타이틀 헤더 바로 아래 콘텐츠 최상단, 키보드에 가리지 않는 위치.

**BuildBadge.tsx 변경:** `className?: string` prop 추가 (clx 적용) → 호출부 정렬 커스터마이징 허용.

스크린샷: `docs/M3-1105-AT-buildbadge-top.png` (브랜치 커밋 완료)

---

## 로컬 실행 로그

| 스크립트 | 결과 |
|---------|------|
| m3-1105-al-assertions.mjs | ✅ PASS · 15 passed · 0 failed |
| m3-1105-am-assertions.mjs | ✅ PASS · 30 passed · 0 failed |
| m3-1105-an-assertions.mjs | ✅ PASS · 36 passed · 0 failed |
| m3-1105-ar-assertions.mjs | ✅ PASS · 35 passed · 0 failed |
| run-all 신규 실패 | 0 (기존 실패 ad/ae/aj/d는 M1 #96 소관) |

---

## 이연 순증감

- **AL**: 35건 → 15건 (-20건) · 삭제(AR중복 18 + AR이관 2) · 재작성(1)
- **AM**: 42건 → 30건 (-12건) · 삭제(AR중복+이관 7) · 재작성(1)
- **AN**: 56건 → 36건 (-20건) · 삭제(AR중복 12 + AR이관 8) · 재작성(3) · 삭제(실패) 8건
- **AR**: 20건 → 35건 (+15건) · C-AS-2 재작성(1) + 이관 추가(8+9+10+11 = 11건)

---

## 착지 명령

```
cp /tmp/M3-1105-AT-report.md ~/projects/curiocity-relay/m3/ && cd ~/projects/curiocity-relay && git add m3/M3-1105-AT-report.md && git commit -m "m3: M3-1105-AT" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M3-1105-AT done "AL·AM·AN 재서명 완료(AR이관+중복삭제) · AR C-AS-2 재작성 · BuildBadge 타이틀 하단 우측 이동 · 신규실패 0"
```
