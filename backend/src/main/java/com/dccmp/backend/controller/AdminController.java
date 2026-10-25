package com.dccmp.backend.controller;

import com.dccmp.backend.dto.Records;
import com.dccmp.backend.entity.*;
import com.dccmp.backend.repository.*;
import com.dccmp.backend.service.*;
import com.dccmp.backend.security.Access;
import jakarta.servlet.http.*;
import org.springframework.http.*;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.util.*;
import java.util.stream.*;

@RestController
@RequestMapping("/api")
public class AdminController {
    private final Access access;
    private final StaffRepository staff;
    private final ApplicationRepository apps;
    private final WorkflowService flow;
    private final AuditEventRepository audit;
    private final DepartmentRepository departments;
    private final PasswordEncoder encoder;
    private final HandoverService handover;
    private final DocumentService documents;
    private final AnalyticsExportService exporter;

    public AdminController(Access access, StaffRepository staff, ApplicationRepository apps, WorkflowService flow, AuditEventRepository audit, DepartmentRepository departments, PasswordEncoder encoder, HandoverService handover, DocumentService documents, AnalyticsExportService exporter) {
        this.access = access;
        this.staff = staff;
        this.apps = apps;
        this.flow = flow;
        this.audit = audit;
        this.departments = departments;
        this.encoder = encoder;
        this.handover = handover;
        this.documents = documents;
        this.exporter=exporter;
    }

    private Map<String, Object> profile(Staff s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.id);
        m.put("code", s.code);
        m.put("name", s.name);
        m.put("role", s.role);
        m.put("departmentId", s.departmentId);
        m.put("active", s.active);
        return m;
    }

    private ResponseEntity<byte[]> pdfResponse(long id) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=No-Dues-" + id + ".pdf").body(documents.pdf(id));
    }

    @GetMapping("/admin/applications")
    public List<Records.ApplicationView> all(HttpServletRequest req) {
        access.currentStaff(req, staff, "ADMIN");
        return apps.findAllByOrderBySubmittedAtDesc().stream().map(flow::view).toList();
    }

    @GetMapping("/admin/dashboard")
    public Map<String, Object> summary(HttpServletRequest req) {
        access.currentStaff(req, staff, "ADMIN");
        List<Application> all = apps.findAll();
        return Map.of("total", all.size(), "departments", departments.count(), "pendingDepartments", all.stream().filter(a -> "PENDING_DEPARTMENTS".equals(a.status)).count(), "actionRequired", all.stream().filter(a -> "ACTION_REQUIRED".equals(a.status) || "PRINCIPAL_ACTION_REQUIRED".equals(a.status)).count(), "pendingPrincipal", all.stream().filter(a -> "PENDING_PRINCIPAL".equals(a.status)).count(), "approved", all.stream().filter(a -> "APPROVED".equals(a.status)).count(), "handedOver", flow.handovers().count());
    }

    @GetMapping("/admin/audit/{appId}")
    public List<AuditEvent> history(@PathVariable Long appId, HttpServletRequest req) {
        access.currentStaff(req, staff, "ADMIN");
        return audit.findByApplicationIdOrderByCreatedAtDesc(appId);
    }

    @GetMapping("/admin/staff")
    public List<Map<String, Object>> employeeList(HttpServletRequest req) {
        access.currentStaff(req, staff, "ADMIN");
        return staff.findAll().stream().map(this::profile).toList();
    }

    @PostMapping("/admin/staff")
    public Map<String, Object> createStaff(@RequestBody Records.StaffInput in, HttpServletRequest req) {
        access.currentStaff(req, staff, "ADMIN");
        if("STAFF".equals(in.role())) throw WorkflowService.bad("Use the existing shared department account. New department staff accounts are disabled");
        Staff s = new Staff();
        s.code = WorkflowService.mandatory(in.code(), "Staff code").toUpperCase(Locale.ROOT);
        if (staff.findByCode(s.code).isPresent()) throw WorkflowService.conflict("Staff code already exists");
        s.name = WorkflowService.mandatory(in.name(), "Name");
        s.role = role(in.role());
        s.departmentId = departmentForRole(s.role, in.departmentId());
        String pass = WorkflowService.mandatory(in.password(), "Password");
        if (!pass.matches("^(?=.*[A-Za-z])(?=.*[0-9]).{8,}$")) throw WorkflowService.bad("Password must have at least 8 characters including a letter and number");
        s.passwordHash = encoder.encode(pass);
        s.active = true;
        return profile(staff.save(s));
    }

    @PatchMapping("/admin/staff/{id}")
    public Map<String, Object> updateStaff(@PathVariable Long id, @RequestBody Records.StaffInput in, HttpServletRequest req) {
        Staff self = access.currentStaff(req, staff, "ADMIN");
        Staff s = staff.findById(id).orElseThrow(() -> WorkflowService.bad("Staff not found"));
        if ("STAFF".equals(s.role)) {
            if(in.role()!=null && !"STAFF".equals(in.role())) throw WorkflowService.bad("Department accounts cannot change roles");
            if(in.departmentId()!=null && !in.departmentId().equals(s.departmentId)) throw WorkflowService.bad("Department assignment is fixed");
            if(Boolean.FALSE.equals(in.active())) throw WorkflowService.bad("Department accounts cannot be deactivated");
        }
        if(in.code()!=null && !in.code().isBlank() && !in.code().equalsIgnoreCase(s.code)){
           String proposed=in.code().trim().toUpperCase(Locale.ROOT);
           if(!proposed.matches("[A-Z0-9_]{4,30}")||Set.of("ADMIN","PRINCIPAL","PRINCIPAL001").contains(proposed))throw WorkflowService.bad("Invalid or reserved login ID");
           if(staff.findByCode(proposed).isPresent()) throw WorkflowService.conflict("Login ID already exists");
           s.code=proposed;s.sessionKey=null;
        }
        if (in.name() != null && !in.name().isBlank()) s.name = in.name().trim();
        if (in.role() != null) {
            s.role = role(in.role());
            s.departmentId = departmentForRole(s.role, in.departmentId());
        } else if (in.departmentId() != null) s.departmentId = departmentForRole(s.role, in.departmentId());
        if (in.active() != null) {
            if (self.id.equals(id) && !in.active()) throw WorkflowService.bad("You cannot disable yourself");
            s.active = in.active();
            s.sessionKey=null;
        }
        if (in.password() != null && !in.password().isEmpty()) {
            if (!in.password().matches("^(?=.*[A-Za-z])(?=.*[0-9]).{8,}$")) throw WorkflowService.bad("Password must have at least 8 characters including a letter and number");
            s.passwordHash = encoder.encode(in.password());s.sessionKey=null;
        }
        return profile(staff.save(s));
    }

    private String role(String r) {
        if (!List.of("STAFF", "PRINCIPAL", "ADMIN").contains(r)) throw WorkflowService.bad("Invalid employee role");
        return r;
    }

    private Long departmentForRole(String role, Long id) {
        if (!"STAFF".equals(role)) return null;
        if (id == null) throw WorkflowService.bad("Department required for staff");
        if (!Boolean.TRUE.equals(departments.findById(id).orElseThrow(() -> WorkflowService.bad("Unknown department")).active))
            throw WorkflowService.bad("Inactive department");
        return id;
    }

    @PatchMapping("/admin/departments/{id}")
    public Department renameDepartment(@PathVariable Long id, @RequestBody Records.DepartmentInput in, HttpServletRequest req) {
        access.currentStaff(req, staff, "ADMIN");
        Department d = departments.findById(id).orElseThrow(() -> WorkflowService.bad("Department not found"));
        d.name = WorkflowService.mandatory(in.name(), "Department name");
        return departments.save(d);
    }

    @PostMapping("/admin/reopenings")
    public Records.ApplicationView reopen(@RequestBody Records.ReopenInput in, HttpServletRequest req) {
        return flow.view(flow.reopen(access.currentStaff(req, staff, "ADMIN"), in));
    }

    @PostMapping("/admin/handovers")
    public Map<String, Object> handover(@RequestBody Records.HandoverInput in, HttpServletRequest req) {
        Handover h = handover.complete(access.currentStaff(req, staff, "ADMIN"), in);
        return Map.of("applicationId", h.applicationId, "handedOverAt", h.handedOverAt.toString(), "ok", true);
    }

    @PostMapping("/admin/forms/{id}/issue")
    public Map<String, Object> issue(@PathVariable long id, HttpServletRequest req) {
        access.currentStaff(req, staff, "ADMIN");
        GeneratedForm f = documents.issue(id);
        return Map.of("verificationId", f.verificationId, "emailStatus", documents.sendForm(id));
    }

    @PostMapping("/admin/forms/{id}/resend")
    public Map<String, String> resend(@PathVariable long id, HttpServletRequest req) {
        access.currentStaff(req, staff, "ADMIN");
        return Map.of("emailStatus", documents.sendForm(id));
    }

    @GetMapping("/admin/forms/{id}/download")
    public ResponseEntity<byte[]> adminPdf(@PathVariable long id, HttpServletRequest req) {
        access.currentStaff(req, staff, "ADMIN");
        return pdfResponse(id);
    }
    @GetMapping("/admin/reports")
    public ResponseEntity<byte[]> analyticsReport(HttpServletRequest req,@RequestParam(defaultValue="csv") String format,@RequestParam(defaultValue="all") String period,@RequestParam(required=false) String start,@RequestParam(required=false) String end){
        access.currentStaff(req,staff,"ADMIN");return exporter.export(format,period,start,end);
    }
}
