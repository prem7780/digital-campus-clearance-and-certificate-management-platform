package com.dccmp.backend.controller;

import com.dccmp.backend.dto.Records;
import com.dccmp.backend.entity.Staff;
import com.dccmp.backend.repository.StaffRepository;
import com.dccmp.backend.service.*;
import com.dccmp.backend.security.Access;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;

import java.util.*;

@RestController
@RequestMapping("/api/staff")
public class StaffController {
    private final Access access;
    private final StaffRepository staff;
    private final WorkflowService flow;
    private final StaffDashboardService dashboard;

    public StaffController(Access access, StaffRepository staff, WorkflowService flow, StaffDashboardService dashboard) {
        this.access = access;
        this.staff = staff;
        this.flow = flow;
        this.dashboard = dashboard;
    }

    private Staff actor(HttpServletRequest req) {
        return access.currentStaff(req, staff, "STAFF");
    }

    @GetMapping("/overview")
    public Map<String, Object> overview(HttpServletRequest r, @RequestParam(defaultValue = "all") String period, @RequestParam(required = false) String start, @RequestParam(required = false) String end, @RequestParam(defaultValue = "monthly") String grouping) {
        return dashboard.overview(actor(r), period, start, end, grouping);
    }

    @GetMapping("/requests")
    public Map<String, Object> requests(HttpServletRequest r, @RequestParam(defaultValue = "0") int page, @RequestParam(required = false) String status, @RequestParam(required = false) String roll, @RequestParam(required = false) String name, @RequestParam(required = false) String branch, @RequestParam(defaultValue = "newest") String sort) {
        return dashboard.applications(actor(r), page, status, roll, name, branch, sort);
    }

    @GetMapping("/search")
    public Map<String, Object> search(HttpServletRequest r, @RequestParam String roll, @RequestParam(defaultValue = "0") int page) {
        if (roll.trim().length() < 3) throw WorkflowService.bad("Enter at least 3 roll-number characters");
        return dashboard.applications(actor(r), page, null, roll, null, null, "newest");
    }

    @GetMapping("/requests/{id}")
    public Map<String, Object> detail(HttpServletRequest r, @PathVariable long id) {
        return dashboard.details(actor(r), id);
    }

    @GetMapping("/history")
    public Map<String, Object> history(HttpServletRequest r, @RequestParam(defaultValue = "0") int page) {
        return dashboard.history(actor(r), page);
    }

    @PostMapping("/bulk-approve")
    public Map<String, Object> bulk(HttpServletRequest r, @RequestBody BulkInput body) {
        return dashboard.bulk(actor(r), body.ids(), body.remarks());
    }

    public record BulkInput(List<Long> ids, String remarks) {
    }

    @PatchMapping("/approvals/{id}/approve")
    public Map<String, Object> approve(HttpServletRequest r, @PathVariable long id, @RequestBody(required = false) Records.DecisionInput body) {
        Staff s = actor(r);
        long appId = flow.decideDepartment(s, id, true, body == null ? "" : body.remarks()).id;
        return dashboard.details(s, appId);
    }

    @PatchMapping("/approvals/{id}/reject")
    public Map<String, Object> reject(HttpServletRequest r, @PathVariable long id, @RequestBody Records.DecisionInput body) {
        Staff s = actor(r);
        long appId = flow.decideDepartment(s, id, false, body.remarks()).id;
        return dashboard.details(s, appId);
    }
    // Never expose Alumni records or cross-department decisions to shared staff accounts.
}
