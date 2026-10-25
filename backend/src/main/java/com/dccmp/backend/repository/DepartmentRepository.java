package com.dccmp.backend.repository;

import com.dccmp.backend.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    Optional<Department> findByCode(String code);
}
