package com.dccmp.backend.repository;

import com.dccmp.backend.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface PrincipalDecisionRepository extends JpaRepository<PrincipalDecision, Long> {
    Optional<PrincipalDecision> findByApplicationId(Long applicationId);
}
