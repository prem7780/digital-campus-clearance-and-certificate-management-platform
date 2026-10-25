package com.dccmp.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "no_dues_applications")
public class Application {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public Long studentId;
    public Long alumniId;
    public String studentName;
    public String branch;
    @Column(columnDefinition = "TEXT")
    public String address;
    public String phone;
    public String email;
    public Boolean declaration;
    public String status;
    public LocalDateTime submittedAt;
}
