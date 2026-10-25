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
public class PrincipalController {
    private final Access access;
    private final StaffRepository staff;
    private final ApplicationRepository apps;
    private final WorkflowService flow;
    private final DocumentService documents;
    private final PrincipalDashboardService dashboard;
    private final AnalyticsExportService exporter;

    public PrincipalController(Access access, StaffRepository staff, ApplicationRepository apps, WorkflowService flow, DocumentService documents, PrincipalDashboardService dashboard, AnalyticsExportService exporter) {
        this.access = access;
        this.staff = staff;
        this.apps = apps;
        this.flow = flow;
        this.documents = documents;
        this.dashboard = dashboard;
        this.exporter=exporter;
    }

    @GetMapping("/principal/pending")
    public List<Records.ApplicationView> principalPending(HttpServletRequest req) {
        access.currentStaff(req, staff, "PRINCIPAL");
        return apps.findByStatusOrderBySubmittedAtDesc("PENDING_PRINCIPAL").stream().map(flow::view).toList();
    }

    @PatchMapping("/principal/applications/{id}/approve")
    public Records.ApplicationView principalApprove(@PathVariable long id, @RequestBody(required = false) Records.DecisionInput in, HttpServletRequest req) {
        Staff s = access.currentStaff(req, staff, "PRINCIPAL");
        Application a = flow.decidePrincipal(s, id, true, in == null ? "" : in.remarks());
        documents.issue(a.id);
        documents.sendForm(a.id);
        return flow.view(a);
    }

    @PatchMapping("/principal/applications/{id}/reject")
    public Records.ApplicationView principalReject(@PathVariable long id, @RequestBody Records.DecisionInput in, HttpServletRequest req) {
        return flow.view(flow.decidePrincipal(access.currentStaff(req, staff, "PRINCIPAL"), id, false, in.remarks()));
    }

    @GetMapping("/principal/overview")
    public Map<String,Object> overview(HttpServletRequest req,@RequestParam(defaultValue="all") String period,@RequestParam(required=false) String start,@RequestParam(required=false) String end){
        access.currentStaff(req,staff,"PRINCIPAL");return dashboard.summary(period,start,end);
    }
    @GetMapping("/principal/applications")
    public Map<String,Object> applications(HttpServletRequest req,@RequestParam(defaultValue="0") int page,@RequestParam(required=false) String roll,@RequestParam(required=false) String name,@RequestParam(required=false) String branch,@RequestParam(required=false) String status,@RequestParam(defaultValue="newest") String sort){
        access.currentStaff(req,staff,"PRINCIPAL");return dashboard.applications(roll,name,branch,status,page,sort);
    }
    @GetMapping("/principal/students")
    public Map<String,Object> students(HttpServletRequest req,@RequestParam String roll){access.currentStaff(req,staff,"PRINCIPAL");return dashboard.searchStudent(roll);}
    @GetMapping("/principal/departments")
    public List<Map<String,Object>> departments(HttpServletRequest req,@RequestParam(defaultValue="all") String period,@RequestParam(required=false) String start,@RequestParam(required=false) String end){
        access.currentStaff(req,staff,"PRINCIPAL");return dashboard.departments(period,start,end);
    }
    @GetMapping("/principal/history")
    public Map<String,Object> history(HttpServletRequest req,@RequestParam(defaultValue="0") int page){
        access.currentStaff(req,staff,"PRINCIPAL");return Map.of("items",dashboard.history(page),"total",dashboard.historyTotal());
    }
    @GetMapping("/principal/forms/{id}/download")
    public ResponseEntity<byte[]> downloadForm(@PathVariable long id,HttpServletRequest req){
        access.currentStaff(req,staff,"PRINCIPAL");return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
        .header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=No-Dues-"+id+".pdf").body(documents.pdf(id));
    }
    @GetMapping("/principal/reports")
    public ResponseEntity<byte[]> reports(HttpServletRequest req,@RequestParam(defaultValue="csv") String format,@RequestParam(defaultValue="all") String period,@RequestParam(required=false) String start,@RequestParam(required=false) String end){
        access.currentStaff(req,staff,"PRINCIPAL");return exporter.export(format,period,start,end);
    }
}
