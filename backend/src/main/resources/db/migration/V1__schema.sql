CREATE TABLE student_identities (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 roll_number VARCHAR(255),
 email VARCHAR(255),
 verified_at DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE email_otps (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 email VARCHAR(255),
 hash VARCHAR(255),
 expires_at DATETIME(6),
 attempts INT,
 consumed_at DATETIME(6),
 created_at DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE alumni_registrations (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 student_id BIGINT,
 name VARCHAR(255),
 father_name VARCHAR(255),
 year_of_study VARCHAR(255),
 branch VARCHAR(255),
 address TEXT,
 mobile VARCHAR(255),
 email VARCHAR(255),
 hobbies TEXT,
 academic_achievements TEXT,
 awards TEXT,
 placement_details TEXT,
 job_details TEXT,
 future_plans TEXT,
 submitted_at DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE alumni_friends (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 alumni_id BIGINT,
 slot INT,
 name VARCHAR(255),
 phone VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE no_dues_applications (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 student_id BIGINT,
 alumni_id BIGINT,
 student_name VARCHAR(255),
 branch VARCHAR(255),
 address TEXT,
 phone VARCHAR(255),
 email VARCHAR(255),
 declaration BOOLEAN,
 status VARCHAR(255),
 submitted_at DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE departments (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(255),
 name VARCHAR(255),
 active BOOLEAN
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE staff (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(255),
 password_hash VARCHAR(255),
 name VARCHAR(255),
 role VARCHAR(255),
 department_id BIGINT,
 active BOOLEAN
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE department_approvals (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 application_id BIGINT,
 department_id BIGINT,
 staff_id BIGINT,
 status VARCHAR(255),
 remarks TEXT,
 decided_at DATETIME(6),
 version BIGINT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE principal_approvals (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 application_id BIGINT,
 staff_id BIGINT,
 status VARCHAR(255),
 remarks TEXT,
 decided_at DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE approval_reopenings (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 application_id BIGINT,
 approval_id BIGINT,
 principal_target BOOLEAN,
 admin_id BIGINT,
 reason TEXT,
 created_at DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE audit_events (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 application_id BIGINT,
 actor_type VARCHAR(255),
 actor_id BIGINT,
 action VARCHAR(255),
 details TEXT,
 created_at DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE generated_forms (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 application_id BIGINT,
 verification_id VARCHAR(255),
 pdf_path VARCHAR(255),
 issued_at DATETIME(6),
 revoked BOOLEAN
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE email_deliveries (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 application_id BIGINT,
 recipient VARCHAR(255),
 type VARCHAR(255),
 state VARCHAR(255),
 attempts INT,
 last_error TEXT,
 sent_at DATETIME(6),
 created_at DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE certificate_handovers (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 application_id BIGINT,
 admin_id BIGINT,
 verified_at DATETIME(6),
 handed_over_at DATETIME(6),
 remarks TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE handover_checklist_items (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 handover_id BIGINT,
 code VARCHAR(255),
 verified BOOLEAN,
 note VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE student_identities ADD UNIQUE KEY uq_student_roll(roll_number), ADD UNIQUE KEY uq_student_email(email);

ALTER TABLE departments ADD UNIQUE KEY uq_dept_code(code);

ALTER TABLE staff ADD UNIQUE KEY uq_staff_code(code);

ALTER TABLE alumni_registrations ADD UNIQUE KEY uq_alumni_student(student_id);

ALTER TABLE alumni_friends ADD UNIQUE KEY uq_friend_slot(alumni_id,slot);

ALTER TABLE department_approvals ADD UNIQUE KEY uq_application_dept(application_id,department_id);

ALTER TABLE principal_approvals ADD UNIQUE KEY uq_principal_app(application_id);

ALTER TABLE generated_forms ADD UNIQUE KEY uq_generated_app(application_id), ADD UNIQUE KEY uq_verification_id(verification_id);

ALTER TABLE certificate_handovers ADD UNIQUE KEY uq_handover_app(application_id);

ALTER TABLE handover_checklist_items ADD UNIQUE KEY uq_checklist(handover_id,code);

CREATE INDEX idx_approval_department_status ON department_approvals(department_id,status);

CREATE INDEX idx_application_student ON no_dues_applications(student_id);

CREATE INDEX idx_otp_email ON email_otps(email,created_at);

CREATE INDEX idx_audit_app ON audit_events(application_id,created_at);

ALTER TABLE alumni_registrations ADD CONSTRAINT fk_alumni_re_student_id FOREIGN KEY (student_id) REFERENCES student_identities(id);

ALTER TABLE alumni_friends ADD CONSTRAINT fk_alumni_fr_alumni_id FOREIGN KEY (alumni_id) REFERENCES alumni_registrations(id);

ALTER TABLE no_dues_applications ADD CONSTRAINT fk_no_dues_a_student_id FOREIGN KEY (student_id) REFERENCES student_identities(id);

ALTER TABLE no_dues_applications ADD CONSTRAINT fk_no_dues_a_alumni_id FOREIGN KEY (alumni_id) REFERENCES alumni_registrations(id);

ALTER TABLE staff ADD CONSTRAINT fk_staff_department FOREIGN KEY (department_id) REFERENCES departments(id);

ALTER TABLE department_approvals ADD CONSTRAINT fk_departmen_applicatio FOREIGN KEY (application_id) REFERENCES no_dues_applications(id);

ALTER TABLE department_approvals ADD CONSTRAINT fk_departmen_department FOREIGN KEY (department_id) REFERENCES departments(id);

ALTER TABLE principal_approvals ADD CONSTRAINT fk_principal_applicatio FOREIGN KEY (application_id) REFERENCES no_dues_applications(id);

ALTER TABLE generated_forms ADD CONSTRAINT fk_generated_applicatio FOREIGN KEY (application_id) REFERENCES no_dues_applications(id);

ALTER TABLE certificate_handovers ADD CONSTRAINT fk_certifica_applicatio FOREIGN KEY (application_id) REFERENCES no_dues_applications(id);

ALTER TABLE handover_checklist_items ADD CONSTRAINT fk_handover__handover_i FOREIGN KEY (handover_id) REFERENCES certificate_handovers(id);
