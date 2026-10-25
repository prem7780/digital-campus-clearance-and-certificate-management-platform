package com.dccmp.backend.repository;

import com.dccmp.backend.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface AlumniRepository extends JpaRepository<Alumni, Long> {
    Optional<Alumni> findByStudentId(Long studentId);
}
