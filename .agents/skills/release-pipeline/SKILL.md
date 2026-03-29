---
name: release-pipeline
description: Prepare build, deployment, post-deploy verification, and final access URL reporting for fullstack website work. Trigger when a feature is ready to ship or when a user asks to deploy and hand off.
---

# Release Pipeline

## 목표

- 릴리스 준비부터 URL 보고까지 한 흐름으로 마무리한다.

## 절차

1. 최신 QA 결과와 남은 blocker를 확인한다.
2. 빌드와 배포 명령을 순서대로 실행한다.
3. 배포 후 실제 접속 주소를 확인한다.
4. `_workspace/04_release_report.md` 에 명령, 결과, URL, 남은 리스크를 남긴다.
5. 사용자에게 최종 접속 주소를 반드시 함께 알려준다.

## 출력

- 실행한 명령
- 배포 대상 환경
- 최종 접속 주소
- 후속 체크 항목

## 주의

- 배포 성공 메시지만으로 종료하지 않는다.
- 실제 URL을 확인하고 전달해야 릴리스가 완료된 것이다.
