CREATE TABLE department_decision_events (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 application_id BIGINT NOT NULL,
 department_id BIGINT NOT NULL,
 account_id BIGINT NOT NULL,
 action VARCHAR(24) NOT NULL,
 remarks TEXT,
 decided_at DATETIME(6) NOT NULL,
 cycle_started_at DATETIME(6),
 INDEX ix_decision_dept_time (department_id, decided_at),
 INDEX ix_decision_app_dept (application_id, department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE staff ADD COLUMN session_key VARCHAR(64) NULL;
