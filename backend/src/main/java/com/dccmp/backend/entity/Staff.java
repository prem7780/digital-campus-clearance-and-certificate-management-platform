package com.dccmp.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "staff")
public class Staff {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public String code;
    public String passwordHash;
    public String name;
    public String role;
    public Long departmentId;
    public Boolean active;
    public String sessionKey;
}
