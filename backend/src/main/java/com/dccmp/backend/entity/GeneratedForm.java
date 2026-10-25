package com.dccmp.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "generated_forms")
public class GeneratedForm {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public Long applicationId;
    public String verificationId;
    public String pdfPath;
    public LocalDateTime issuedAt;
    public Boolean revoked;
}
