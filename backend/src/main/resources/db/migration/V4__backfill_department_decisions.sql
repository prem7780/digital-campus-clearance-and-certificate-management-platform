-- Preserve historical decisions already present in the original audit table.
INSERT INTO department_decision_events (application_id, department_id, account_id, action, remarks, decided_at, cycle_started_at)
SELECT e.application_id, actor.department_id, e.actor_id,
 CASE WHEN e.action='DEPARTMENT_APPROVED' THEN 'APPROVED' ELSE 'REJECTED' END,
 CASE WHEN e.details LIKE '%: %' THEN SUBSTRING(e.details, LOCATE(': ',e.details)+2) ELSE COALESCE(e.details,'') END,
 e.created_at,
 COALESCE((SELECT MAX(r.created_at) FROM approval_reopenings r
    INNER JOIN department_approvals p ON p.id=r.approval_id
    WHERE r.application_id=e.application_id AND p.department_id=actor.department_id
      AND r.created_at <= e.created_at), app.submitted_at)
FROM audit_events e
INNER JOIN staff actor ON actor.id=e.actor_id AND actor.department_id IS NOT NULL
INNER JOIN no_dues_applications app ON app.id=e.application_id
WHERE e.action IN ('DEPARTMENT_APPROVED','DEPARTMENT_REJECTED');
