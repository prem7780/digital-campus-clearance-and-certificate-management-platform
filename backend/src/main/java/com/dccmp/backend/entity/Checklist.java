package com.dccmp.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "handover_checklist_items")
public class Checklist {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public Long handoverId;
    public String code;
    public Boolean verified;
    public String note;
}
