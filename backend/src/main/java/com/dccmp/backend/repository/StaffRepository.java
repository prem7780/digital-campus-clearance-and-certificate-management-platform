package com.dccmp.backend.repository;

import com.dccmp.backend.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface StaffRepository extends JpaRepository<Staff, Long> {
    Optional<Staff> findByCode(String code);

    List<Staff> findByDepartmentId(Long departmentId);
}
