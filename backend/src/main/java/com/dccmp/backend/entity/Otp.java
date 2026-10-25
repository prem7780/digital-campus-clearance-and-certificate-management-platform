package com.dccmp.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_otps")
public class Otp {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public String email;
    public String hash;
    public LocalDateTime expiresAt;
    public Integer attempts;
    public LocalDateTime consumedAt;
    public LocalDateTime createdAt;
}
