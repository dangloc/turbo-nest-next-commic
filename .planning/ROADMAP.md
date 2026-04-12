# Roadmap: WordPress to NestJS Migration

Milestone: v1.14 - Identity & Account Experience
Created: 2026-04-12
Status: In Progress

## Overview

Identity & Account Experience: Frontend UIs for authentication and account management, consuming local auth endpoints and imported legacy financial data.

## Phases

### Phase 35: Frontend Local Authentication

Status: Planned

Goal: Build responsive login and registration UI forms with client-side validation, error handling, and session integration.

Requirements: AUTH-01, AUTH-02

Scope:
- Responsive login form (username/email + password, client-side validation).
- Registration form with password strength validation and duplicate detection.
- Error messaging for invalid credentials and network failures.
- Session state integration with existing token management.
- commic_session cookie storage and bearer token support.

Success Criteria:
- User can login with username or email, receives token and cookie immediately.
- User can register with email/username uniqueness validation and auto-login on success.
- Password strength meets complexity requirements (8+ chars, letter + number).
- Duplicate email/username returns clear, actionable error messages.
- Forms display client-side validation errors before submission.

Plans:
- [ ] 35-01-PLAN.md - implement local auth feature module and login/register UI integration

### Phase 36: User Profile & Security Management

Status: Planned

Goal: Build profile management UI allowing users to view/edit their profile and change passwords securely.

Requirements: ACCOUNT-01

Scope:
- Profile view with prefilled current user data (name, email).
- Profile edit form with validation and confirmation messaging.
- Password change form with current password verification.
- Password strength validation consistent with registration requirements.
- Form error and success feedback.

Success Criteria:
- User can view their current profile information.
- User can edit name and email; changes persist and confirm immediately.
- Password change requires current password verification before accepting new password.
- Password strength rules (8+ chars, letter + number) enforced on change.
- Form validation prevents empty fields and invalid formats.

Plans:
- [ ] 36-01-PLAN.md - extend dashboard profile identity editing and secure password change

### Phase 37: Wallet and Purchase History Dashboard

Status: Planned

Goal: Display user's wallet balance, VIP level, and purchased chapter history from legacy ETL'd data.

Requirements: ACCOUNT-02

Scope:
- Wallet balance and VIP tier display (from legacy financial ETL).
- Purchased chapters list with title, author, purchase date, and unlock status.
- Integration with chapter reader access control (locked/unlocked state).
- Dashboard section responsive design and performance.

Success Criteria:
- Wallet balance and current VIP level display correctly for each user.
- Purchased chapters list shows all user's historical purchases with metadata.
- Unlock status accurately reflects whether user can read each chapter.
- List performs well with 100+ chapters (pagination or virtualization).
- Dashboard integrates with existing account section navigation.

Plans:
- [ ] 37-01-PLAN.md (pending planning phase)

## Progress

| Phase | Requirements | Status | Plans | Completion |
|-------|--------------|--------|-------|------------|
| 35 | AUTH-01, AUTH-02 | Planned | 0/1 | 0% |
| 36 | ACCOUNT-01 | Planned | 0/1 | 0% |
| 37 | ACCOUNT-02 | Planned | 0/1 | 0% |

---

Next Action: Run `/gsd:plan-phase 35` to create detailed execution plan for Phase 35.
