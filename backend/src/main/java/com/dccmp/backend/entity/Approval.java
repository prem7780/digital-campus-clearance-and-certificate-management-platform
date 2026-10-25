package com.dccmp.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "department_approvals")
public class Approval {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public Long applicationId;
    public Long departmentId;
    public Long staffId;
    public String status;
    @Column(columnDefinition = "TEXT")
    public String remarks;
    public LocalDateTime decidedAt;
    @Version
    public Long version;
}
