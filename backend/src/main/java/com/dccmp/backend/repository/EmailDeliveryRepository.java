package com.dccmp.backend.repository;

import com.dccmp.backend.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface EmailDeliveryRepository extends JpaRepository<EmailDelivery, Long> {
    List<EmailDelivery> findByApplicationIdOrderByCreatedAtDesc(Long applicationId);
}
