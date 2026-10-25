package com.dccmp.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "alumni_registrations")
public class Alumni {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public Long studentId;
    public String name;
    public String fatherName;
    public String yearOfStudy;
    public String branch;
    @Column(columnDefinition = "TEXT")
    public String address;
    public String mobile;
    public String email;
    @Column(columnDefinition = "TEXT")
    public String hobbies;
    @Column(columnDefinition = "TEXT")
    public String academicAchievements;
    @Column(columnDefinition = "TEXT")
    public String awards;
    @Column(columnDefinition = "TEXT")
    public String placementDetails;
    @Column(columnDefinition = "TEXT")
    public String jobDetails;
    @Column(columnDefinition = "TEXT")
    public String futurePlans;
    public LocalDateTime submittedAt;
}
