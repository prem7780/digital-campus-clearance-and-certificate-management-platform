package com.dccmp.backend.service;

import com.dccmp.backend.entity.*;
import com.dccmp.backend.repository.*;
import com.dccmp.backend.dto.Records;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.*;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WorkflowService {
    final StudentRepository students;
    final DepartmentDecisionEventRepository decisions;
    final AlumniRepository alumni;
    final FriendRepository friends;
    final ApplicationRepository apps;
    final DepartmentRepository departments;
    final ApprovalRepository approvals;
    final PrincipalDecisionRepository principals;
    final StaffRepository staff;
    final AuditEventRepository audit;
    final ReopeningRepository reopenings;
    final GeneratedFormRepository forms;
    final EmailDeliveryRepository emails;
    final HandoverRepository handovers;

    public WorkflowService(DepartmentDecisionEventRepository decisions, StudentRepository students, AlumniRepository alumni, FriendRepository friends, ApplicationRepository apps, DepartmentRepository departments, ApprovalRepository approvals, PrincipalDecisionRepository principals, StaffRepository staff, AuditEventRepository audit, ReopeningRepository reopenings, GeneratedFormRepository forms, EmailDeliveryRepository emails, HandoverRepository handovers) {
        this.decisions = decisions;
        this.students = students;
        this.alumni = alumni;
        this.friends = friends;
        this.apps = apps;
        this.departments = departments;
        this.approvals = approvals;
        this.principals = principals;
        this.staff = staff;
        this.audit = audit;
        this.reopenings = reopenings;
        this.forms = forms;
        this.emails = emails;
        this.handovers = handovers;
    }

    public static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    public static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    public static String mandatory(String v, String n) {
        if (v == null || v.isBlank()) throw bad(n + " is required");
        return v.trim();
    }

    public static String optional(String v) {
        return v == null ? "" : v.trim();
    }

    void event(Long appId, String role, Long userId, String action, String details) {
        AuditEvent e = new AuditEvent();
        e.applicationId = appId;
        e.actorType = role;
        e.actorId = userId;
        e.action = action;
        e.details = details;
        e.createdAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        audit.save(e);
    }

    public GeneratedFormRepository forms() {
        return forms;
    }

    public HandoverRepository handovers() {
        return handovers;
    }

    public Application getApp(long id) {
        return apps.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
    }

    @Transactional
    public Alumni registerAlumni(long studentId, Records.AlumniInput in) {
        if (alumni.findByStudentId(studentId).isPresent()) throw conflict("Alumni Registration already submitted");
        if (in == null || in.friends() == null || in.friends().size() != 5)
            throw bad("Five friends with names and phone numbers are required");
        Student s = students.findById(studentId).orElseThrow(() -> bad("Identity not found"));
        Alumni a = new Alumni();
        a.studentId = studentId;
        a.name = mandatory(in.name(), "Name");
        a.fatherName = mandatory(in.fatherName(), "Father's name");
        a.yearOfStudy = mandatory(in.yearOfStudy(), "Year of study");
        a.branch = mandatory(in.branch(), "Branch");
        a.address = mandatory(in.address(), "Permanent address");
        a.mobile = mandatory(in.mobile(), "Mobile");
        a.email = s.email;
        a.hobbies = optional(in.hobbies());
        a.academicAchievements = optional(in.academicAchievements());
        a.awards = optional(in.awards());
        a.placementDetails = optional(in.placementDetails());
        a.jobDetails = optional(in.jobDetails());
        a.futurePlans = optional(in.futurePlans());
        a.submittedAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        a = alumni.save(a);
        for (int i = 0; i < 5; i++) {
            Records.FriendInput f = in.friends().get(i);
            Friend e = new Friend();
            e.alumniId = a.id;
            e.slot = i + 1;
            e.name = mandatory(f.name(), "Friend name");
            e.phone = mandatory(f.phone(), "Friend phone");
            friends.save(e);
        }
        return a;
    }

    @Transactional
    public Application submitNoDues(long studentId, Records.NoDuesInput in) {
        Alumni a = alumni.findByStudentId(studentId).orElseThrow(() -> bad("Submit Alumni Registration first"));
        if (apps.findByStudentIdOrderBySubmittedAtDesc(studentId).stream().anyMatch(v -> !"APPROVED".equals(v.status)))
            throw conflict("An active No Dues application already exists");
        if (in == null || !Boolean.TRUE.equals(in.declaration())) throw bad("Student declaration is mandatory");
        if (!mandatory(in.studentName(), "Student name").equalsIgnoreCase(a.name) || !mandatory(in.branch(), "Branch").equalsIgnoreCase(a.branch))
            throw bad("No Dues name and branch must match Alumni Registration");
        Application v = new Application();
        v.studentId = studentId;
        v.alumniId = a.id;
        v.studentName = mandatory(in.studentName(), "Student name");
        v.branch = mandatory(in.branch(), "Branch");
        v.address = mandatory(in.address(), "Address");
        v.phone = mandatory(in.phone(), "Phone");
        v.email = a.email;
        v.declaration = true;
        v.status = "PENDING_DEPARTMENTS";
        v.submittedAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        v = apps.save(v);
        List<Department> list = departments.findAll();
        if (list.size() != 17 || list.stream().anyMatch(d -> !Boolean.TRUE.equals(d.active)))
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "All 17 departments must be configured and active");
        for (Department d : list) {
            Approval p = new Approval();
            p.applicationId = v.id;
            p.departmentId = d.id;
            p.status = "PENDING";
            approvals.save(p);
        }
        event(v.id, "STUDENT", studentId, "SUBMITTED", "No Dues application created with 17 approvals");
        return v;
    }

    public Records.ApplicationView view(Application v) {
        Student s = students.findById(v.studentId).orElseThrow();
        List<Records.ApprovalView> p = approvals.findByApplicationIdOrderByDepartmentId(v.id).stream().map(a -> {
            Department d = departments.findById(a.departmentId).orElseThrow();
            String who = a.staffId == null ? null : staff.findById(a.staffId).map(z -> z.name).orElse("Unknown");
            return new Records.ApprovalView(a.id, d.id, d.name, d.code, a.status, who, a.remarks, a.decidedAt);
        }).toList();
        PrincipalDecision principal = principals.findByApplicationId(v.id).orElse(null);
        GeneratedForm form = forms.findByApplicationId(v.id).orElse(null);
        List<EmailDelivery> mail = emails.findByApplicationIdOrderByCreatedAtDesc(v.id);
        return new Records.ApplicationView(v.id, s.rollNumber, v.studentName, v.branch, v.address, v.phone, v.email, v.status, v.submittedAt, p, principal == null ? "PENDING" : principal.status, principal == null || principal.staffId == null ? null : staff.findById(principal.staffId).map(x -> x.name).orElse(null), principal == null ? null : principal.remarks, principal == null ? null : principal.decidedAt, form != null && !Boolean.TRUE.equals(form.revoked), form == null ? null : form.verificationId, mail.isEmpty() ? "NOT_GENERATED" : mail.getFirst().state, handovers.findByApplicationId(v.id).map(h -> h.handedOverAt == null ? "VERIFICATION_PENDING" : "HANDED_OVER").orElse("NOT_COLLECTED"));
    }

    public Records.ApplicationView studentView(Application app) {
        Records.ApplicationView v = view(app);
        List<Records.ApprovalView> safe = v.approvals().stream()
                .map(a -> new Records.ApprovalView(a.id(), a.departmentId(), a.department(), a.code(), a.status(), null, a.remarks(), a.decidedAt())).toList();
        return new Records.ApplicationView(v.id(), v.rollNumber(), v.studentName(), v.branch(), v.address(), v.phone(), v.email(), v.status(), v.submittedAt(), safe,
                v.principalStatus(), null, v.principalRemarks(), v.principalDate(), v.pdfReady(), v.verificationId(), v.emailStatus(), v.handoverStatus());
    }

    @Transactional
    public Application decideDepartment(Staff actor, long approvalId, boolean approve, String remarks) {
        if (!"STAFF".equals(actor.role)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        Approval a = approvals.lockById(approvalId).orElseThrow(() -> bad("Approval not found"));
        if (actor.departmentId == null || !actor.departmentId.equals(a.departmentId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Different department");
        if (!"PENDING".equals(a.status)) throw conflict("This decision is not pending");
        Application v = getApp(a.applicationId);
        if (!List.of("PENDING_DEPARTMENTS", "ACTION_REQUIRED").contains(v.status))
            throw conflict("Application is no longer in departmental review");
        String cleaned = approve ? optional(remarks) : mandatory(remarks, "Rejection remarks");
        LocalDateTime cycleStart = reopenings.findByApplicationIdOrderByCreatedAtDesc(v.id).stream()
                .filter(r -> Objects.equals(r.approvalId, a.id)).map(r -> r.createdAt)
                .findFirst().orElse(v.submittedAt);
        a.status = approve ? "APPROVED" : "REJECTED";
        a.remarks = cleaned;
        a.staffId = actor.id;
        a.decidedAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        approvals.saveAndFlush(a);
        DepartmentDecisionEvent d = new DepartmentDecisionEvent();
        d.applicationId = v.id;
        d.departmentId = a.departmentId;
        d.accountId = actor.id;
        d.action = a.status;
        d.remarks = a.remarks;
        d.decidedAt = a.decidedAt;
        d.cycleStartedAt = cycleStart;
        decisions.save(d);
        List<Approval> current = approvals.findByApplicationIdOrderByDepartmentId(v.id);
        if (current.stream().anyMatch(z -> "REJECTED".equals(z.status))) v.status = "ACTION_REQUIRED";
        else if (current.size() == 17 && current.stream().allMatch(z -> "APPROVED".equals(z.status)))
            v.status = "PENDING_PRINCIPAL";
        else v.status = "PENDING_DEPARTMENTS";
        apps.save(v);
        event(v.id, "STAFF", actor.id, approve ? "DEPARTMENT_APPROVED" : "DEPARTMENT_REJECTED", actor.code + ": " + a.remarks);
        return v;
    }

    @Transactional
    public Application decidePrincipal(Staff actor, long applicationId, boolean approve, String remarks) {
        if (!"PRINCIPAL".equals(actor.role)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        Application v = getApp(applicationId);
        if (!"PENDING_PRINCIPAL".equals(v.status)) throw conflict("All 17 approvals are required first");
        List<Approval> all = approvals.findByApplicationIdOrderByDepartmentId(v.id);
        if (all.size() != 17 || all.stream().anyMatch(x -> !"APPROVED".equals(x.status)))
            throw conflict("Incomplete departmental clearance");
        PrincipalDecision p = principals.findByApplicationId(v.id).orElseGet(PrincipalDecision::new);
        p.applicationId = v.id;
        p.staffId = actor.id;
        p.status = approve ? "APPROVED" : "REJECTED";
        p.remarks = approve ? optional(remarks) : mandatory(remarks, "Principal rejection remarks");
        p.decidedAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        principals.save(p);
        v.status = approve ? "APPROVED" : "PRINCIPAL_ACTION_REQUIRED";
        apps.save(v);
        event(v.id, "PRINCIPAL", actor.id, approve ? "PRINCIPAL_APPROVED" : "PRINCIPAL_REJECTED", p.remarks);
        return v;
    }

    @Transactional
    public Application reopen(Staff actor, Records.ReopenInput in) {
        String reason = mandatory(in.reason(), "Reopening reason");
        if (!"ADMIN".equals(actor.role)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        Application v = getApp(in.applicationId());
        Reopening r = new Reopening();
        r.applicationId = v.id;
        r.adminId = actor.id;
        r.reason = reason;
        r.createdAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        r.principalTarget = Boolean.TRUE.equals(in.principalTarget());
        if (r.principalTarget) {
            PrincipalDecision p = principals.findByApplicationId(v.id).orElseThrow(() -> bad("No principal rejection"));
            if (!"REJECTED".equals(p.status) || !"PRINCIPAL_ACTION_REQUIRED".equals(v.status))
                throw conflict("Principal decision is not rejected");
            p.status = "PENDING";
            p.staffId = null;
            p.decidedAt = null;
            principals.save(p);
            v.status = "PENDING_PRINCIPAL";
        } else {
            if (in.approvalId() == null) throw bad("Approval ID is required");
            Approval p = approvals.findById(in.approvalId()).orElseThrow(() -> bad("Approval not found"));
            if (!p.applicationId.equals(v.id) || !"REJECTED".equals(p.status))
                throw conflict("Approval is not rejected for this application");
            r.approvalId = p.id;
            p.status = "PENDING";
            p.staffId = null;
            p.decidedAt = null;
            p.remarks = null;
            approvals.save(p);
            List<Approval> remaining = approvals.findByApplicationIdOrderByDepartmentId(v.id);
            v.status = remaining.stream().anyMatch(q -> "REJECTED".equals(q.status)) ? "ACTION_REQUIRED" : "PENDING_DEPARTMENTS";
        }
        reopenings.save(r);
        apps.save(v);
        event(v.id, "ADMIN", actor.id, "REOPEN_AUTHORIZED", reason);
        return v;
    }
}
