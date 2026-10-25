package com.dccmp.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "department_decision_events")
public class DepartmentDecisionEvent {
 @Id
 @GeneratedValue(strategy = GenerationType.IDENTITY)
 public Long id;

 @Column(name = "application_id", nullable = false)
 public Long applicationId;

 @Column(name = "department_id", nullable = false)
 public Long departmentId;

 @Column(name = "account_id", nullable = false)
 public Long accountId;

 @Column(name = "action", nullable = false, length = 24)
 public String action;

 @Column(name = "remarks", columnDefinition = "TEXT")
 public String remarks;

 @Column(name = "decided_at", nullable = false)
 public LocalDateTime decidedAt;

 @Column(name = "cycle_started_at")
 public LocalDateTime cycleStartedAt;
}
