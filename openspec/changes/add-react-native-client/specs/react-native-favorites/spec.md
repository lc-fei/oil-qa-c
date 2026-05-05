## ADDED Requirements

### Requirement: RN app supports answer favorites
The system SHALL allow users to favorite and unfavorite completed answers.

#### Scenario: Favorite answer
- **WHEN** the user favorites a completed answer
- **THEN** the app calls the favorite method and updates local favorite state

#### Scenario: Unfavorite answer
- **WHEN** the user removes a favorite
- **THEN** the app calls the unfavorite method and updates local favorite state

### Requirement: RN app supports favorites browsing
The system SHALL provide a favorites list and detail experience for mobile users.

#### Scenario: Load favorites
- **WHEN** the favorites screen opens
- **THEN** the app loads paginated favorite summaries through the mobile SDK

#### Scenario: Open favorite detail
- **WHEN** the user opens a favorite item
- **THEN** the app loads the full question and answer detail on demand
