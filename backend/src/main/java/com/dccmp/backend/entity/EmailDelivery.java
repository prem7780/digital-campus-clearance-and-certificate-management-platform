package com.dccmp.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_deliveries")
public class EmailDelivery {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public Long applicationId;
    public String recipient;
    public String type;
    public String state;
    public Integer attempts;
    @Column(columnDefinition = "TEXT")
    public String lastError;
    public LocalDateTime sentAt;
    public LocalDateTime createdAt;
}
