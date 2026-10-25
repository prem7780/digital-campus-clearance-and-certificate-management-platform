package com.dccmp.backend.repository;

import com.dccmp.backend.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface ChecklistRepository extends JpaRepository<Checklist, Long> {
    List<Checklist> findByHandoverId(Long handoverId);
}
