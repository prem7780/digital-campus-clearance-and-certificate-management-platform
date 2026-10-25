package com.dccmp.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "certificate_handovers")
public class Handover {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public Long applicationId;
    public Long adminId;
    public LocalDateTime verifiedAt;
    public LocalDateTime handedOverAt;
    @Column(columnDefinition = "TEXT")
    public String remarks;
}
