package com.dccmp.backend.repository;

import com.dccmp.backend.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface FriendRepository extends JpaRepository<Friend, Long> {
    List<Friend> findByAlumniIdOrderBySlot(Long alumniId);
}
