package com.dccmp.backend.repository;

import com.dccmp.backend.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface OtpRepository extends JpaRepository<Otp, Long> {
    List<Otp> findTop10ByEmailOrderByCreatedAtDesc(String email);
}
