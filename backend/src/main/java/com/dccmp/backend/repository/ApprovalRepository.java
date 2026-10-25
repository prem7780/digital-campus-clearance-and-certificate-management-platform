package com.dccmp.backend.repository;

import com.dccmp.backend.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import jakarta.persistence.LockModeType;

public interface ApprovalRepository extends JpaRepository<Approval, Long> {
    List<Approval> findByApplicationIdOrderByDepartmentId(Long applicationId);

    Optional<Approval> findByApplicationIdAndDepartmentId(Long applicationId, Long departmentId);

    List<Approval> findByDepartmentIdOrderByIdDesc(Long departmentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Approval p where p.id=:id")
    Optional<Approval> lockById(@Param("id") Long id);

    @Query(value="select p from Approval p join Application a on a.id=p.applicationId join Student s on s.id=a.studentId where p.departmentId=:departmentId and (:state is null or p.status=:state) and (:roll is null or lower(s.rollNumber) like :roll) and (:name is null or lower(a.studentName) like :name) and (:branch is null or lower(a.branch) like :branch) order by a.submittedAt asc,p.id asc",
           countQuery="select count(p) from Approval p join Application a on a.id=p.applicationId join Student s on s.id=a.studentId where p.departmentId=:departmentId and (:state is null or p.status=:state) and (:roll is null or lower(s.rollNumber) like :roll) and (:name is null or lower(a.studentName) like :name) and (:branch is null or lower(a.branch) like :branch)")
    Page<Approval> searchOldest(@Param("departmentId") Long departmentId,@Param("state") String state,@Param("roll") String roll,@Param("name") String name,@Param("branch") String branch,Pageable page);

    @Query(value="select p from Approval p join Application a on a.id=p.applicationId join Student s on s.id=a.studentId where p.departmentId=:departmentId and (:state is null or p.status=:state) and (:roll is null or lower(s.rollNumber) like :roll) and (:name is null or lower(a.studentName) like :name) and (:branch is null or lower(a.branch) like :branch) order by a.submittedAt desc,p.id desc",
           countQuery="select count(p) from Approval p join Application a on a.id=p.applicationId join Student s on s.id=a.studentId where p.departmentId=:departmentId and (:state is null or p.status=:state) and (:roll is null or lower(s.rollNumber) like :roll) and (:name is null or lower(a.studentName) like :name) and (:branch is null or lower(a.branch) like :branch)")
    Page<Approval> searchNewest(@Param("departmentId") Long departmentId,@Param("state") String state,@Param("roll") String roll,@Param("name") String name,@Param("branch") String branch,Pageable page);

    @Query(value="select p from Approval p join Application a on a.id=p.applicationId join Student s on s.id=a.studentId where p.departmentId=:departmentId and (:state is null or p.status=:state) and (:roll is null or lower(s.rollNumber) like :roll) and (:name is null or lower(a.studentName) like :name) and (:branch is null or lower(a.branch) like :branch) order by lower(a.studentName) asc,a.submittedAt asc",
           countQuery="select count(p) from Approval p join Application a on a.id=p.applicationId join Student s on s.id=a.studentId where p.departmentId=:departmentId and (:state is null or p.status=:state) and (:roll is null or lower(s.rollNumber) like :roll) and (:name is null or lower(a.studentName) like :name) and (:branch is null or lower(a.branch) like :branch)")
    Page<Approval> searchByName(@Param("departmentId") Long departmentId,@Param("state") String state,@Param("roll") String roll,@Param("name") String name,@Param("branch") String branch,Pageable page);

    @Query(value="select p from Approval p join Application a on a.id=p.applicationId join Student s on s.id=a.studentId where p.departmentId=:departmentId and (:state is null or p.status=:state) and (:roll is null or lower(s.rollNumber) like :roll) and (:name is null or lower(a.studentName) like :name) and (:branch is null or lower(a.branch) like :branch) order by lower(s.rollNumber) asc,a.submittedAt asc",
           countQuery="select count(p) from Approval p join Application a on a.id=p.applicationId join Student s on s.id=a.studentId where p.departmentId=:departmentId and (:state is null or p.status=:state) and (:roll is null or lower(s.rollNumber) like :roll) and (:name is null or lower(a.studentName) like :name) and (:branch is null or lower(a.branch) like :branch)")
    Page<Approval> searchByRoll(@Param("departmentId") Long departmentId,@Param("state") String state,@Param("roll") String roll,@Param("name") String name,@Param("branch") String branch,Pageable page);
}
