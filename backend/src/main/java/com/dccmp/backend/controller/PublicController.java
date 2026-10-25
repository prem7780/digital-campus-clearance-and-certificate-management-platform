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
public class PublicController {
    private final IdentityService identity;
    private final DepartmentRepository departments;
    private final WorkflowService flow;

    public PublicController(IdentityService identity, DepartmentRepository departments, WorkflowService flow) {
        this.identity = identity;
        this.departments = departments;
        this.flow = flow;
    }

    @GetMapping("/public/csrf")
    public Map<String, String> csrf(HttpServletRequest request) {
        CsrfToken t = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        return Map.of("token", t.getToken());
    }

    @GetMapping("/public/health")
    public Map<String, Object> health() {
        return Map.of("status", "UP", "service", "DCCMP");
    }

    @PostMapping("/public/otp/send")
    public Map<String, String> send(@RequestBody Records.OtpStart in) {
        identity.send(in);
        return Map.of("message", "Verification code sent to college email");
    }

    @PostMapping("/public/otp/verify")
    public Map<String, Object> verify(@RequestBody Records.OtpCheck in, HttpServletRequest req) {
        Student s = identity.verify(in, req);
        return Map.of("rollNumber", s.rollNumber, "email", s.email, "verified", true);
    }

    @GetMapping("/public/departments")
    public List<Department> departmentList() {
        return departments.findAll().stream().filter(d -> Boolean.TRUE.equals(d.active)).sorted(Comparator.comparing(d -> d.id)).toList();
    }

    @GetMapping("/public/verify/{token}")
    public Map<String, Object> verifyQr(@PathVariable String token) {
        GeneratedForm f = flow.forms().findByVerificationId(token).orElse(null);
        if (f == null || Boolean.TRUE.equals(f.revoked))
            return Map.of("valid", false, "message", "Not issued or revoked");
        Application a = flow.getApp(f.applicationId);
        return Map.of("valid", "APPROVED".equals(a.status), "documentType", "No Dues Clearance Form", "issuedAt", f.issuedAt.toString(), "verificationId", f.verificationId, "collectionStatus", flow.handovers().findByApplicationId(a.id).isPresent() ? "COLLECTED" : "NOT_COLLECTED");
    }
}
