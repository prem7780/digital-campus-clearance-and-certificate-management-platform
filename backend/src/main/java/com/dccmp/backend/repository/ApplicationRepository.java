package com.dccmp.backend.repository;

import com.dccmp.backend.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByStudentIdOrderBySubmittedAtDesc(Long studentId);

    List<Application> findByStatusOrderBySubmittedAtDesc(String status);

    List<Application> findAllByOrderBySubmittedAtDesc();
}
