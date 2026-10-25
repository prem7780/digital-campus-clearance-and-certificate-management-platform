package com.dccmp.backend.repository;

import com.dccmp.backend.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface ReopeningRepository extends JpaRepository<Reopening, Long> {
    List<Reopening> findByApplicationIdOrderByCreatedAtDesc(Long applicationId);
}
