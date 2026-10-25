package com.dccmp.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "approval_reopenings")
public class Reopening {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public Long applicationId;
    public Long approvalId;
    public Boolean principalTarget;
    public Long adminId;
    @Column(columnDefinition = "TEXT")
    public String reason;
    public LocalDateTime createdAt;
}
