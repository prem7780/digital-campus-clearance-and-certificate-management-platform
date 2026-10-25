# DCCMP REST API

All paths are prefixed with `/api`. Browser requests must include the session cookie; after `GET /api/public/csrf`, state-changing requests must send `X-XSRF-TOKEN` with the returned token. The React frontend does this automatically.

## Student workflow

| Method | Path | Authorization | Request |
|---|---|---|---|
| GET | `/public/csrf` | Any | — |
| POST | `/public/otp/send` | Any | `{"rollNumber":"23NG1A0501","email":"23ng1a0501@usharama.in"}` |
| POST | `/public/otp/verify` | Any | `{"rollNumber":"23NG1A0501","otp":"123456"}` (use real delivered code) |
| GET | `/student/me` | Verified student | — |
| POST | `/student/alumni` | Verified student | All official alumni fields, plus `friends:[{name,phone} × 5]` |
| GET | `/student/alumni` | Verified student | — |
| POST | `/student/no-dues` | Verified student with alumni record | `{"studentName":"...","branch":"CSE","address":"...","phone":"...","declaration":true}` |
| GET | `/student/applications` | Verified student | — |
| GET | `/student/approved-form/{id}` | Same student | Returns application/pdf |
| GET | `/public/verify/{verificationId}` | Any | Minimal authenticity response (no student identity) |

## Employee workflow

| Method | Path | Authorization | Notes |
|---|---|---|---|
| POST | `/auth/login` | Any | `{"code":"STAFFCODE","password":"..."}` |
| POST | `/auth/logout` | Session holder | Invalidates session |
| GET | `/auth/me` | Employee | Sanitized profile |
| GET | `/staff/queue` | STAFF | Department scoped |
| PATCH | `/staff/approvals/{id}/approve` | Assigned STAFF | `{"remarks":"No dues"}` |
| PATCH | `/staff/approvals/{id}/reject` | Assigned STAFF | `{"remarks":"Reason is mandatory"}` |
| GET | `/staff/alumni` | Alumni STAFF | Complete registration including friends |
| GET | `/principal/pending` | PRINCIPAL | Only when 17/17 approved |
| PATCH | `/principal/applications/{id}/approve` | PRINCIPAL | Generates PDF then queues/sends email |
| PATCH | `/principal/applications/{id}/reject` | PRINCIPAL | Requires rejection remarks |

## Administration

| Method | Path | Role |
|---|---|---|
| GET | `/admin/dashboard` | ADMIN |
| GET | `/admin/applications` | ADMIN |
| GET | `/admin/staff` | ADMIN |
| POST | `/admin/staff` | ADMIN |
| PATCH | `/admin/staff/{id}` | ADMIN |
| PATCH | `/admin/departments/{id}` | ADMIN |
| POST | `/admin/reopenings` | ADMIN |
| GET | `/admin/audit/{applicationId}` | ADMIN |
| POST | `/admin/forms/{id}/issue` | ADMIN |
| POST | `/admin/forms/{id}/resend` | ADMIN |
| GET | `/admin/forms/{id}/download` | ADMIN |
| POST | `/admin/handovers` | ADMIN |

`POST /admin/reopenings` example:

```json
{"applicationId": 11, "approvalId": 82, "principalTarget": false, "reason": "Student supplied corrected paperwork"}
```

To reopen a Principal rejection, send `principalTarget:true` and omit `approvalId`.

`POST /admin/handovers` requires **the exact issued verification ID** in addition to all six checks:

```json
{
  "applicationId": 11,
  "verificationId": "issued-value-from-printout",
  "checklist": {
    "printed_form": true,
    "student_identity": true,
    "student_id_or_receipt": true,
    "deposit_receipt_or_affidavit": true,
    "semester_marks": true,
    "photograph": true
  },
  "alternatives": {"student_id_or_receipt": "Original ID checked"},
  "remarks": "Student collected original certificates in person"
}
```

Unauthorized routes return 401/403, invalid state transitions return 409 and validation problems return 400. Never send real student information into the included demonstration script.
