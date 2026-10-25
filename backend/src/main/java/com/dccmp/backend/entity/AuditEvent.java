package com.dccmp.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_events")
public class AuditEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public Long applicationId;
    public String actorType;
    public Long actorId;
    public String action;
    @Column(columnDefinition = "TEXT")
    public String details;
    public LocalDateTime createdAt;
}
