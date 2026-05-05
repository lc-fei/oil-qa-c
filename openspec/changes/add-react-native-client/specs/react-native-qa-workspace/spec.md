## ADDED Requirements

### Requirement: RN app supports session workspace
The system SHALL allow users to view, switch, create, rename, and delete QA sessions from the mobile app.

#### Scenario: Load sessions
- **WHEN** the chat workspace opens
- **THEN** the app loads the user's session list through the mobile SDK

#### Scenario: Switch session
- **WHEN** the user selects a session
- **THEN** the app loads that session's messages and marks it as current

### Requirement: RN app supports streaming question answering
The system SHALL support sending a question and rendering streamed answer chunks and stage events.

#### Scenario: Stream starts
- **WHEN** the backend sends a `start` event
- **THEN** the app creates or updates the local active message state

#### Scenario: Stage updates
- **WHEN** the backend sends `stage` events for question understanding, task planning, retrieval, evidence ranking, generation, or archiving
- **THEN** the app updates the visible execution status without requiring a quality-check stage

#### Scenario: Answer chunks arrive
- **WHEN** the backend sends `chunk` events
- **THEN** the app appends the delta text to the active answer

#### Scenario: Stream completes
- **WHEN** the backend sends a `done` event
- **THEN** the app treats the message as complete and shows post-answer actions

### Requirement: RN app supports cancellation and failure states
The system SHALL allow users to stop generation and recover from stream errors.

#### Scenario: User cancels generation
- **WHEN** the user stops an active answer
- **THEN** the app calls the cancel endpoint through the mobile SDK and records the partial answer state

#### Scenario: Stream fails
- **WHEN** the stream emits an error or network failure
- **THEN** the app shows the failure state and keeps any partial answer that was received

### Requirement: RN app supports evidence view
The system SHALL allow users to open message evidence from a completed answer.

#### Scenario: Open evidence
- **WHEN** the user opens evidence for a message
- **THEN** the app loads entities, relations, graph summary, sources, timings, and confidence through the mobile SDK
