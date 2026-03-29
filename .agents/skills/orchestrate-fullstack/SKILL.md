---
name: orchestrate-fullstack
description: Lead a fullstack website pipeline from wireframe through deployment using a tech lead plus design, frontend, API, QA, and release workers. Trigger when work spans multiple layers or needs coordinated parallel delivery.
---

# Orchestrate Fullstack

이 스킬은 리더가 디자인, 프론트엔드, API, QA, 배포를 단계형 파이프라인으로 조율할 때 사용한다.

## 사용할 때

- 새 웹사이트나 큰 기능을 와이어프레임부터 배포까지 끝내야 할 때
- React 또는 Next.js 프론트와 API 또는 백엔드가 함께 바뀔 때
- 디자인 핸드오프, 계약, QA, 릴리스 보고를 파일로 추적하고 싶을 때

## 기본 팀 구성

- `agents/tech-lead.md`
- `agents/product-designer.md`
- `agents/frontend-builder.md`
- `agents/api-builder.md`
- `agents/qa-worker.md`
- `agents/release-manager.md`

## 오케스트레이션

1. `update_plan`으로 작업과 의존성을 기록한다.
2. `_workspace/README.md`의 파일 규칙을 확인한다.
3. 디자인 산출물이 먼저 필요하면 디자이너부터 시작한다.
4. 인터페이스가 정리되면 프론트와 API를 병렬로 `spawn_agent` 한다.
5. 각 워커는 `_workspace/{phase}_{agent}_{artifact}.md`에 산출물을 남긴다.
6. QA는 구현이 끝난 뒤 한 번만 하지 말고, 주요 모듈 완료 직후에도 끼운다.
7. 릴리스 단계에서는 최종 접속 주소를 반드시 보고한다.
8. 더 이상 쓰지 않는 워커는 `close_agent` 로 정리한다.

## 권장 `_workspace/` 산출물

- `_workspace/00_project_brief.md`
- `_workspace/01_design_wireframe.md`
- `_workspace/01_design_component_map.md`
- `_workspace/02_api_contracts.md`
- `_workspace/02_frontend_handoff.md`
- `_workspace/02_backend_handoff.md`
- `_workspace/03_qa_report.md`
- `_workspace/04_release_report.md`

## 리더 체크포인트

- 디자인은 빈 상태, 로딩, 오류, 성공 상태를 모두 다뤘는가
- 프론트와 API가 같은 데이터 shape를 기대하는가
- QA가 경계면 비교를 했는가
- 릴리스 보고에 실제 접속 주소가 있는가

## 기대 출력

- 현재 단계별 산출물과 담당 역할이 명확하다
- 병렬 가능한 작업은 분리되고, 의존 작업은 순차로 정리된다
- 최종 릴리스 시 URL, 검증 결과, 남은 리스크가 함께 보고된다
