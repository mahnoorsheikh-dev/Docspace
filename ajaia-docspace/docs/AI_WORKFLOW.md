# AI-Assisted Development Workflow

Complete or review this record before submission so it describes only work actually performed.

## Record template

- AI tools used: GitHub Copilot through the Copilot SDK in VS Code, plus terminal, build, and test tooling
- Main tasks delegated to AI: project inspection, implementation, auth integration, documentation, build fixes, and verification
- Prompt or design decisions supplied by the developer: assessment requirements, existing MongoDB backend, demo roles, and authentication requirements
- Code accepted without modification: complete after reviewing generated files and running validation
- Code reviewed and changed: authentication wiring, README, architecture, submission metadata, and environment examples may require final review
- Bugs found and corrected: environment parsing, JWT/cookie authentication integration, authorization checks, and build issues
- Manual verification completed: browser walkthrough must be completed before submission
- Automated verification completed: record actual command results below
- Deployment or external blockers encountered: no live URL should be recorded until deployment is completed

## Verification checklist

Update these items with actual results before submitting.

- [x] Frontend production build — passed with one bundle-size warning
- [x] Frontend lint — passed with no warnings
- [x] Backend syntax checks — server.js and database.js passed
- [x] Automated utility tests — 2 passed, 0 failed
- [x] Authentication API registration check in a browser — passed
- [x] Create document — passed in browser
- [x] Rich-text editor autosave — document content and title reached Saved state
- [x] Refresh and reopen document — title and content persisted in MongoDB and restored after refresh
- [x] Share as viewer — pending invitation for an unregistered email passed
- [x] Confirm viewer cannot edit — title and toolbar were read-only/disabled in the browser
- [ ] Share as editor
- [ ] Confirm editor can edit
- [ ] Confirm non-owner cannot delete
- [x] Confirm owner can delete — browser deletion removed the document and shared access
- [ ] Import `.txt`
- [ ] Import `.md`
