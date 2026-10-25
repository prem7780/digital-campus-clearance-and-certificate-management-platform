package com.dccmp.backend.service;
import com.dccmp.backend.entity.*;
import com.dccmp.backend.repository.*;
import com.dccmp.backend.dto.Records;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class WorkflowServiceTest {
 StudentRepository students=mock(StudentRepository.class);
 AlumniRepository alumni=mock(AlumniRepository.class);
 FriendRepository friends=mock(FriendRepository.class);
 ApplicationRepository apps=mock(ApplicationRepository.class);
 DepartmentRepository departments=mock(DepartmentRepository.class);
 ApprovalRepository approvals=mock(ApprovalRepository.class);
 PrincipalDecisionRepository principals=mock(PrincipalDecisionRepository.class);
 StaffRepository staff=mock(StaffRepository.class);
 AuditEventRepository audit=mock(AuditEventRepository.class);
 ReopeningRepository reopenings=mock(ReopeningRepository.class);
 GeneratedFormRepository forms=mock(GeneratedFormRepository.class);
 EmailDeliveryRepository emails=mock(EmailDeliveryRepository.class);
 HandoverRepository handovers=mock(HandoverRepository.class);
 WorkflowService flow=new WorkflowService(students,alumni,friends,apps,departments,approvals,principals,staff,audit,reopenings,forms,emails,handovers);
 @Test void studentSubmitsExactlySeventeenApprovals(){
  Alumni a=new Alumni();a.id=10L;a.name="Test Student";a.branch="CSE";a.email="23ng1a9999@usharama.in";
  when(alumni.findByStudentId(1L)).thenReturn(Optional.of(a));when(apps.findByStudentIdOrderBySubmittedAtDesc(1L)).thenReturn(List.of());
  List<Department> deps=new ArrayList<>();for(long i=1;i<=17;i++){Department d=new Department();d.id=i;d.active=true;deps.add(d);}when(departments.findAll()).thenReturn(deps);
  when(apps.save(any(Application.class))).thenAnswer(inv->{Application v=inv.getArgument(0);v.id=99L;return v;});
  flow.submitNoDues(1L,new Records.NoDuesInput("Test Student","CSE","Test address","9000000000",true));
  verify(approvals,times(17)).save(any(Approval.class));
  verify(audit,times(1)).save(any(AuditEvent.class));
 }
 @Test void principalCannotApprovePrematurely(){
  Staff principal=new Staff();principal.id=1L;principal.role="PRINCIPAL";
  Application a=new Application();a.id=20L;a.status="PENDING_DEPARTMENTS";
  when(apps.findById(20L)).thenReturn(Optional.of(a));
  assertThrows(ResponseStatusException.class,()->flow.decidePrincipal(principal,20L,true,""));
 }
 @Test void staffCannotDecideAnotherDepartment(){
  Staff employee=new Staff();employee.id=5L;employee.role="STAFF";employee.departmentId=3L;
  Approval approval=new Approval();approval.id=50L;approval.departmentId=8L;approval.applicationId=20L;approval.status="PENDING";
  when(approvals.findById(50L)).thenReturn(Optional.of(approval));
  assertThrows(ResponseStatusException.class,()->flow.decideDepartment(employee,50L,true,""));
 }
 @Test void reopeningRequiresAdmin(){
  Staff employee=new Staff();employee.id=8L;employee.role="STAFF";
  assertThrows(ResponseStatusException.class,()->flow.reopen(employee,new Records.ReopenInput(3L,9L,false,"Corrected")));
 }
}
