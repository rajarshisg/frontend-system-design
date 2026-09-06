# Types of Testing

## 1. Unit Testing
Tests individual functions or components in isolation. Verifies that each piece of code works correctly on its own. Fast to run and easy to pinpoint failures.

## 2. Integration Testing
Tests how multiple units or modules work together. Ensures that combined parts of the application interact correctly. Catches issues that unit tests miss at the boundaries.

## 3. Functional Testing
Validates that the application behaves according to functional requirements. Tests features from the user's perspective without caring about internal implementation. Focuses on what the system does, not how.

## 4. End-to-End Testing
Simulates real user workflows across the entire application stack. Tests the full flow from UI to database and back. Catches issues that only appear in a fully integrated environment.

## 5. Performance Testing
Measures how the application behaves under load and stress. Evaluates speed, responsiveness, and stability. Identifies bottlenecks before they hit production.

## 6. Accessibility Testing
Verifies that the application is usable by people with disabilities. Checks compliance with standards like WCAG. Includes screen reader support, keyboard navigation, and color contrast.

## 7. Localization and Internationalization Testing
Ensures the application works correctly across different languages, regions, and cultures. Tests date formats, currency, text direction, and translated strings. Catches layout breaks caused by longer translated text.

## 8. Regression Testing
Verifies that new code changes haven't broken existing functionality. Re-runs previously passing tests after every update or bug fix. Acts as a safety net to prevent old bugs from resurfacing.

## 9. A/B Testing
Compares two versions of a UI or feature to determine which performs better. Real users are split into groups, each seeing a different variant. Decisions are driven by metrics like click-through rate or conversions.

## 10. Test Driven Development (TDD)
A development methodology where tests are written before the actual code. The cycle is: write a failing test, write code to pass it, then refactor. Encourages cleaner design and better test coverage.