## ADDED Requirements

### Requirement: RN SDK adapter is the business entry point
The system SHALL require RN screens, hooks, and stores to call business capabilities through a mobile SDK façade backed by the compiled Rust SDK.

#### Scenario: Screen submits a question
- **WHEN** the chat screen sends a user question
- **THEN** it calls the mobile SDK façade instead of directly calling an HTTP service

#### Scenario: Screen loads evidence
- **WHEN** the evidence screen loads message evidence
- **THEN** it calls the mobile SDK façade with the message identifier

### Requirement: RN SDK adapter isolates platform transport
The system SHALL isolate native Rust SDK invocation, platform storage, and SDK event delivery inside the mobile SDK adapter.

#### Scenario: Authenticated request
- **WHEN** the mobile SDK invokes an authenticated method
- **THEN** the transport attaches the persisted JWT token to the request

#### Scenario: Token expires
- **WHEN** the backend returns an unauthenticated response
- **THEN** the SDK adapter clears local auth state and emits an expired-login outcome for the app shell

### Requirement: RN SDK adapter preserves method contract
The system SHALL preserve the existing SDK method + payload contract for auth, sessions, chat, evidence, and favorites.

#### Scenario: Method dispatch
- **WHEN** the mobile SDK receives a supported method name and payload
- **THEN** it invokes the compiled Rust SDK through the RN native module and returns normalized data

### Requirement: Rust SDK compiles for Android and iOS
The system SHALL provide a mobile binding layer that compiles the Rust SDK into Android and iOS native artifacts.

#### Scenario: Android native library build
- **WHEN** the mobile SDK build script runs for Android targets
- **THEN** it produces `liboil_qa_sdk.so` artifacts for the configured Android ABIs

#### Scenario: iOS framework build
- **WHEN** the mobile SDK build script runs for iOS targets
- **THEN** it produces an `OilQaSdk.xcframework` usable by the iOS RN project

### Requirement: RN native module exposes Rust SDK invoke
The system SHALL expose the compiled Rust SDK to JavaScript through an RN native module.

#### Scenario: Invoke SDK method from JavaScript
- **WHEN** JavaScript calls `OilQaSdk.invoke` with a method name and JSON payload
- **THEN** the native module calls the Rust SDK and returns the JSON result

#### Scenario: Receive streaming event
- **WHEN** the Rust SDK emits a stream event
- **THEN** the native module forwards that event to JavaScript subscribers
