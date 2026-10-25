package com.dccmp.backend.service;

import com.dccmp.backend.entity.*;
import com.dccmp.backend.repository.*;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.temporal.*;
import java.util.*;
import java.util.stream.*;

@Service
public class PrincipalDashboardService {
    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private final ApplicationRepository apps;
    private final ApprovalRepository approvals;
    private final DepartmentRepository departments;
    private final DepartmentDecisionEventRepository decisions;
    private final StaffRepository staff;
    private final StudentRepository students;
    private final AlumniRepository alumni;
    private final AuditEventRepository audit;
    private final WorkflowService flow;

    public PrincipalDashboardService(ApplicationRepository a, ApprovalRepository b, DepartmentRepository d,
                                     DepartmentDecisionEventRepository e, StaffRepository s, StudentRepository st, AlumniRepository al, AuditEventRepository au, WorkflowService f) {
        apps = a;
        approvals = b;
        departments = d;
        decisions = e;
        staff = s;
        students = st;
        alumni = al;
        audit = au;
        flow = f;
    }

    private LocalDate[] dates(String period, String start, String end) {
        LocalDate today = LocalDate.now(IST), from = LocalDate.of(1900, 1, 1), to = today;
        switch (Objects.toString(period, "all")) {
            case "today" -> from = today;
            case "week" -> from = today.with(DayOfWeek.MONDAY);
            case "month" -> from = today.withDayOfMonth(1);
            case "year" -> from = LocalDate.of(today.getYear(), 1, 1);
            case "custom" -> {
                try {
                    from = LocalDate.parse(start);
                    to = LocalDate.parse(end);
                } catch (Exception e) {
                    throw WorkflowService.bad("Valid custom dates required");
                }
                if (from.isAfter(to) || to.isAfter(today)) throw WorkflowService.bad("Invalid date range");
            }
        }
        return new LocalDate[]{from, to};
    }

    private boolean in(LocalDateTime t, LocalDate[] dates) {
        return t != null && !t.toLocalDate().isBefore(dates[0]) && !t.toLocalDate().isAfter(dates[1]);
    }

    public Map<String, Object> summary(String period, String start, String end) {
        LocalDate[] bounds = dates(period, start, end);
        List<Application> all = apps.findAll().stream().filter(a -> in(a.submittedAt, bounds)).toList();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("total", all.size());
        m.put("approved", all.stream().filter(a -> "APPROVED".equals(a.status)).count());
        m.put("pendingPrincipal", all.stream().filter(a -> "PENDING_PRINCIPAL".equals(a.status)).count());
        m.put("unresolvedRejected", all.stream().filter(a -> List.of("ACTION_REQUIRED", "PRINCIPAL_ACTION_REQUIRED").contains(a.status)).count());
        m.put("pendingDepartments", all.stream().filter(a -> "PENDING_DEPARTMENTS".equals(a.status)).count());
        return m;
    }

    public Map<String, Object> applications(String roll, String name, String branch, String status, int page, String sort) {
        String r = Objects.toString(roll, "").trim().toLowerCase(Locale.ROOT), n = Objects.toString(name, "").trim().toLowerCase(Locale.ROOT), b = Objects.toString(branch, "").trim().toLowerCase(Locale.ROOT);
        List<Application> list = apps.findAll().stream().filter(a -> a.studentName.toLowerCase(Locale.ROOT).contains(n) && a.branch.toLowerCase(Locale.ROOT).contains(b)
                        && (status == null || status.isBlank() || a.status.equals(status)) && students.findById(a.studentId).map(s -> s.rollNumber.toLowerCase(Locale.ROOT).contains(r)).orElse(false))
                .sorted(Comparator.comparing((Application a) -> a.submittedAt).thenComparing(a -> a.id).reversed()).toList();
        if ("oldest".equals(sort)) list = new ArrayList<>(list);
        if ("oldest".equals(sort)) Collections.reverse(list);
        int pg = Math.max(0, page), begin = (int) Math.min(list.size(), (long) pg * 10), end = Math.min(list.size(), begin + 10);
        return Map.of("items", list.subList(begin, end).stream().map(flow::view).toList(), "total", list.size(), "pages", (list.size() + 9) / 10, "page", pg);
    }

    public Map<String, Object> searchStudent(String roll) {
        if (roll == null || roll.trim().length() < 3) throw WorkflowService.bad("Enter at least 3 characters");
        String match = roll.trim().toLowerCase(Locale.ROOT);
        List<Map<String, Object>> list = new ArrayList<>();
        for (Student s : students.findAll()) {
            if (!s.rollNumber.toLowerCase(Locale.ROOT).contains(match)) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("rollNumber", s.rollNumber);
            m.put("email", s.email);
            m.put("alumni", alumni.findByStudentId(s.id).orElse(null));
            m.put("applications", apps.findByStudentIdOrderBySubmittedAtDesc(s.id).stream().map(flow::view).toList());
            list.add(m);
        }
        return Map.of("items", list);
    }

    public List<Map<String, Object>> departments(String period, String start, String end) {
        LocalDate[] bounds = dates(period, start, end);
        List<Map<String, Object>> list = new ArrayList<>();
        for (Department d : departments.findAll()) {
            List<Approval> current = approvals.findByDepartmentIdOrderByIdDesc(d.id).stream().filter(p -> in(flow.getApp(p.applicationId).submittedAt, bounds)).toList();
            long approved = current.stream().filter(p -> "APPROVED".equals(p.status)).count(), rejected = current.stream().filter(p -> "REJECTED".equals(p.status)).count();
            List<DepartmentDecisionEvent> events = decisions.findByDepartmentIdOrderByDecidedAtDesc(d.id).stream().filter(e -> in(e.decidedAt, bounds)).toList();
            double avg = events.stream().filter(e -> e.cycleStartedAt != null).mapToLong(e -> Math.max(0, Duration.between(e.cycleStartedAt, e.decidedAt).toMinutes())).average().orElse(-1);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("department", d.name);
            m.put("code", d.code);
            m.put("departmentId", d.id);
            m.put("total", current.size());
            m.put("approved", approved);
            m.put("rejected", rejected);
            m.put("pending", current.stream().filter(p -> "PENDING".equals(p.status)).count());
            m.put("approvalRate", approved + rejected == 0 ? null : 100.0 * approved / (approved + rejected));
            m.put("averageMinutes", avg < 0 ? null : avg);
            m.put("historicalApprovals", events.stream().filter(e -> "APPROVED".equals(e.action)).count());
            m.put("historicalRejections", events.stream().filter(e -> "REJECTED".equals(e.action)).count());
            m.put("account", staff.findByDepartmentId(d.id).stream().filter(s -> "STAFF".equals(s.role)).map(s -> s.code).findFirst().orElse(d.code.toUpperCase(Locale.ROOT)));
            list.add(m);
        }
        return list;
    }

    public List<Map<String, Object>> history(int page) {
        List<AuditEvent> all = audit.findAll().stream().filter(e -> e.action.startsWith("DEPARTMENT_") || e.action.startsWith("PRINCIPAL_") || e.action.equals("REOPEN_AUTHORIZED"))
                .sorted(Comparator.comparing((AuditEvent e) -> e.createdAt).reversed()).toList();
        int start = Math.min(all.size(), Math.max(0, page) * 10), end = Math.min(all.size(), start + 10);
        return all.subList(start, end).stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("applicationId", e.applicationId);
            m.put("action", e.action);
            m.put("actorType", e.actorType);
            m.put("account", staff.findById(e.actorId).map(s -> s.code).orElse("Unknown"));
            m.put("at", e.createdAt);
            m.put("details", e.details);
            return m;
        }).toList();
    }

    public int historyTotal() {
        return (int) audit.findAll().stream().filter(e -> e.action.startsWith("DEPARTMENT_") || e.action.startsWith("PRINCIPAL_") || e.action.equals("REOPEN_AUTHORIZED")).count();
    }
}
