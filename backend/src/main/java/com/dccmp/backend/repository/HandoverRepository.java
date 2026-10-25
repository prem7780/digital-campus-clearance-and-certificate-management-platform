package com.dccmp.backend.repository;

import com.dccmp.backend.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface HandoverRepository extends JpaRepository<Handover, Long> {
    Optional<Handover> findByApplicationId(Long applicationId);
}
