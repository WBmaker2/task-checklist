---
name: qa-pipeline
description: Verify fullstack website work through boundary checks, smoke tests, regression passes, and release-readiness notes. Trigger when UI, API, or deploy changes need evidence-backed validation.
---

# QA Pipeline

## 목표

- 구현 결과를 단순 시연이 아니라 경계면 비교로 검증한다.

## 절차

1. 디자인, 프론트, API 핸드오프 문서를 읽는다.
2. 성공 경로와 실패 경로를 각각 점검한다.
3. 가능하면 기존 테스트 명령을 먼저 실행한다.
4. 부족하면 최소 스모크 테스트를 설계해 실행한다.
5. `_workspace/03_qa_report.md` 에 재현 절차, 명령, 결과, blocker 여부를 남긴다.

## 반드시 비교할 것

- UI 기대값 vs API 응답 shape
- 저장 전 상태 vs 저장 후 상태
- 정상 처리 vs 오류 처리
- 명시된 요구사항 vs 실제 렌더링

## 출력

- 확인한 항목
- 실패 근거
- 미검증 영역
- 릴리스 차단 여부
