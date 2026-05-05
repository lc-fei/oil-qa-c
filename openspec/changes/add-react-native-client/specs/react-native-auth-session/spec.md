## ADDED Requirements

### Requirement: RN app supports account login
The system SHALL allow users to log in with the same account and password credentials used by the C端 backend.

#### Scenario: Successful login
- **WHEN** the user submits a valid account and password
- **THEN** the app stores the token and current user snapshot and opens the chat workspace

#### Scenario: Failed login
- **WHEN** the backend rejects the credentials
- **THEN** the app remains on the login screen and displays the error state

### Requirement: RN app maintains token session
The system SHALL persist JWT login state across app restarts using RN-compatible storage.

#### Scenario: App restarts with valid token
- **WHEN** the user reopens the app after a successful login
- **THEN** the app restores the token and attempts to load the current user

#### Scenario: Current user request fails with auth error
- **WHEN** the restored token is invalid or expired
- **THEN** the app clears the token and routes to login

### Requirement: RN app supports logout
The system SHALL provide a logout action that clears local session state and returns to login.

#### Scenario: User logs out
- **WHEN** the user taps logout
- **THEN** the token, current user, and protected app state are cleared
