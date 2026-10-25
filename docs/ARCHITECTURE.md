# Architecture and core state transitions

```mermaid
flowchart TD
  S[Student OTP verified] --> A[Alumni Registration]
  A --> N[No Dues submission]
  N --> D[17 parallel departmental decisions]
  D -->|rejection| R[Action required]
  R -->|Admin reopens only rejected decision| D
  D -->|17 approved| P[Principal final decision]
  P -->|rejection| PR[Principal action required]
  PR -->|Admin reopens| P
  P -->|approval| PDF[Official No Dues PDF + 17-label Annex + QR]
  PDF --> M[SMTP email]
  M --> V[Physical Admin / AO verification]
  V --> C[Original certificate handover]
```

## ER overview

```mermaid
erDiagram
  student_identities ||--o| alumni_registrations : registers
  alumni_registrations ||--|{ alumni_friends : names
  student_identities ||--o{ no_dues_applications : requests
  no_dues_applications ||--|{ department_approvals : includes
  departments ||--o{ department_approvals : decides
  staff ||--o{ department_approvals : signs
  no_dues_applications ||--o| principal_approvals : final
  no_dues_applications ||--o| generated_forms : issued
  no_dues_applications ||--o{ email_deliveries : delivered
  no_dues_applications ||--o| certificate_handovers : closed
  certificate_handovers ||--|{ handover_checklist_items : verifies
  no_dues_applications ||--o{ audit_events : logs
```

## State dimensions

- Clearance: `PENDING_DEPARTMENTS`, `ACTION_REQUIRED`, `PENDING_PRINCIPAL`, `PRINCIPAL_ACTION_REQUIRED`, `APPROVED`.
- Department: `PENDING`, `APPROVED`, `REJECTED`.
- Principal: `PENDING`, `APPROVED`, `REJECTED`.
- Email: `EMAIL_PENDING`, `EMAIL_SENT`, `EMAIL_FAILED`.
- Handover: `NOT_COLLECTED`, `HANDED_OVER`.

There are no automatic department exemptions. Only department staff may decide for a department, and only Principal may finally approve. Admin may authorize reopening, issue/reissue PDF for already approved applications, and physically verify document collection. A generated PDF does not imply collected certificates.

## Layered Spring Boot backend packages

All backend Java classes are located under `com.dccmp.backend`. Spring Boot automatically scans its subpackages.

| Package | Responsibility |
|---|---|
| `controller` | Six role-focused controllers exposing the existing 34 API endpoints |
| `service` | Workflow, OTP/identity, PDF/email, and physical handover business logic |
| `repository` | Spring Data JPA repository interfaces |
| `entity` | Persistence entities for MySQL tables |
| `dto` | Typed API request/response records (`Records`) |
| `security` | Employee/student session and authorization checks |
| `config` | Spring Security and bootstrap account configuration |
| `exception` | Consistent API exception responses |

This refactor preserves the previous API paths so that frontend clients are compatible.
