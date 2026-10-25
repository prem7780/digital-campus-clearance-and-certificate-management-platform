package com.dccmp.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "principal_approvals")
public class PrincipalDecision {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public Long applicationId;
    public Long staffId;
    public String status;
    @Column(columnDefinition = "TEXT")
    public String remarks;
    public LocalDateTime decidedAt;
}
