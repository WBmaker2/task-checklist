# Fullstack Website Orchestration Playbook

이 플레이북은 디자인, 프론트엔드, API, QA, 배포까지 이어지는 기본 리더-워커 흐름이다.

## 기본 아키텍처

- 리더 1명: `agents/tech-lead.md`
- 워커 4~5명:
  - `agents/product-designer.md`
  - `agents/frontend-builder.md`
  - `agents/api-builder.md`
  - `agents/qa-worker.md`
  - 필요 시 `agents/release-manager.md`

## 기본 흐름

1. 리더가 `update_plan` 으로 목표, 의존성, 완료 조건을 기록한다.
2. `_workspace/00_lead_project_brief.md` 에 핵심 요구를 정리한다.
3. 디자이너 워커를 시작해 `_workspace/01_design_wireframe.md` 와 `_workspace/01_design_component_map.md` 를 만든다.
4. 인터페이스가 정리되면 프론트엔드와 API 워커를 병렬로 시작한다.
5. 각 워커는 `_workspace/02_frontend_handoff.md`, `_workspace/02_api_contracts.md`, `_workspace/02_backend_handoff.md` 를 남긴다.
6. QA 워커는 구현 완료 직후 `_workspace/03_qa_report.md` 에 경계면 비교 결과를 기록한다.
7. 릴리스 매니저는 빌드, 배포, URL 확인을 거쳐 `_workspace/04_release_report.md` 를 작성한다.
8. 리더는 결과를 통합하고 더 이상 필요 없는 워커를 `close_agent` 로 정리한다.

## 권장 위임 메시지 포함 요소

- 작업 목적
- 담당 파일 또는 경로
- 읽어야 할 `_workspace/` 문서
- 남겨야 할 산출물 경로
- 성공 기준

## 주의

- 프론트와 API는 계약이 확정되기 전까지 각자 필드를 추정하지 않는다.
- QA는 전체 종료 시점 1회만 하지 말고 주요 단계 직후에도 수행한다.
- 배포 단계는 실제 접속 주소를 사용자에게 전달해야 완료로 본다.
