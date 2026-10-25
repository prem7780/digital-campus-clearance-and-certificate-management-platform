package com.dccmp.backend.repository;

import com.dccmp.backend.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {
    List<AuditEvent> findByApplicationIdOrderByCreatedAtDesc(Long applicationId);
}
