package com.dccmp.backend.repository;

import com.dccmp.backend.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface GeneratedFormRepository extends JpaRepository<GeneratedForm, Long> {
    Optional<GeneratedForm> findByApplicationId(Long applicationId);

    Optional<GeneratedForm> findByVerificationId(String verificationId);
}
