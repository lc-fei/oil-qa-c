## ADDED Requirements

### Requirement: RN app is part of the monorepo
The system SHALL provide a React Native mobile app under `apps/mobile` and include it in the existing pnpm workspace workflow.

#### Scenario: Workspace discovers mobile app
- **WHEN** dependencies are installed from the repository root
- **THEN** the mobile app package is available as a workspace package

#### Scenario: Mobile app exposes standard scripts
- **WHEN** a developer opens the mobile package manifest
- **THEN** it defines scripts for starting, type checking, and platform-specific development entry points

### Requirement: RN app provides mobile navigation shell
The system SHALL provide a mobile navigation shell for authentication, chat, sessions, evidence, and favorites.

#### Scenario: Unauthenticated launch
- **WHEN** a user opens the app without a valid token
- **THEN** the app routes to the login screen

#### Scenario: Authenticated launch
- **WHEN** a user opens the app with a valid token
- **THEN** the app routes to the chat workspace

### Requirement: RN app supports runtime API configuration
The system SHALL allow the mobile app to configure the backend base URL without changing business code.

#### Scenario: Developer changes API base URL
- **WHEN** a developer updates the mobile runtime config
- **THEN** all SDK transport calls use the configured backend base URL
