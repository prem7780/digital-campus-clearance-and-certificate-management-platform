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
public class StudentController {
    private final Access access;
    private final StudentRepository students;
    private final AlumniRepository alumni;
    private final FriendRepository friends;
    private final WorkflowService flow;
    private final ApplicationRepository apps;
    private final DocumentService documents;

    public StudentController(Access access, StudentRepository students, AlumniRepository alumni, FriendRepository friends, WorkflowService flow, ApplicationRepository apps, DocumentService documents) {
        this.access = access;
        this.students = students;
        this.alumni = alumni;
        this.friends = friends;
        this.flow = flow;
        this.apps = apps;
        this.documents = documents;
    }

    @GetMapping("/student/me")
    public Map<String, Object> studentMe(HttpServletRequest req) {
        Long id = access.student(req);
        Student s = students.findById(id).orElseThrow();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("rollNumber", s.rollNumber);
        m.put("email", s.email);
        m.put("alumniSubmitted", alumni.findByStudentId(id).isPresent());
        return m;
    }

    @PostMapping("/student/alumni")
    public Alumni alumni(@RequestBody Records.AlumniInput input, HttpServletRequest req) {
        return flow.registerAlumni(access.student(req), input);
    }

    @GetMapping("/student/alumni")
    public Object ownAlumni(HttpServletRequest req) {
        return alumni.findByStudentId(access.student(req)).map(a -> Map.of("registration", a, "friends", friends.findByAlumniIdOrderBySlot(a.id))).orElseThrow(() -> WorkflowService.bad("Alumni Registration not yet submitted"));
    }

    @PostMapping("/student/no-dues")
    public Records.ApplicationView submit(@RequestBody Records.NoDuesInput input, HttpServletRequest req) {
        return flow.studentView(flow.submitNoDues(access.student(req), input));
    }

    @GetMapping("/student/applications")
    public List<Records.ApplicationView> ownApps(HttpServletRequest req) {
        return apps.findByStudentIdOrderBySubmittedAtDesc(access.student(req)).stream().map(flow::studentView).toList();
    }

    @GetMapping("/student/approved-form/{id}")
    public ResponseEntity<byte[]> ownForm(@PathVariable long id, HttpServletRequest req) {
        Application a = flow.getApp(id);
        access.checkStudentOwner(req, a);
        return pdfResponse(id);
    }

    private ResponseEntity<byte[]> pdfResponse(long id) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=No-Dues-" + id + ".pdf").body(documents.pdf(id));
    }
}
