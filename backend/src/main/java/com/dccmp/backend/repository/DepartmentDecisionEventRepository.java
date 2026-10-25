package com.dccmp.backend.repository;
import com.dccmp.backend.entity.DepartmentDecisionEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import org.springframework.data.domain.*;
public interface DepartmentDecisionEventRepository extends JpaRepository<DepartmentDecisionEvent,Long> {
 List<DepartmentDecisionEvent> findByDepartmentIdOrderByDecidedAtDesc(Long departmentId);
 Page<DepartmentDecisionEvent> findByDepartmentIdOrderByDecidedAtDesc(Long departmentId,Pageable pageable);
 List<DepartmentDecisionEvent> findByApplicationIdAndDepartmentIdOrderByDecidedAtDesc(Long appId,Long deptId);
}
