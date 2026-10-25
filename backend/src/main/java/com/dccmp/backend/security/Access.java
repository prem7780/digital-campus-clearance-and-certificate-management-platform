package com.dccmp.backend.security;

import com.dccmp.backend.entity.*;
import com.dccmp.backend.repository.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.stereotype.Component;

@Component
public class Access {
    private Object attr(HttpServletRequest r, String n) {
        HttpSession s = r.getSession(false);
        return s == null ? null : s.getAttribute(n);
    }

    public long student(HttpServletRequest r) {
        Object o = attr(r, "studentId");
        if (!(o instanceof Long))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Verify your college email first");
        return (Long) o;
    }

    public long employee(HttpServletRequest r, String... roles) {
        Object o = attr(r, "staffId"), role = attr(r, "role");
        if (!(o instanceof Long)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Employee login required");
        boolean allowed = false;
        for (String v : roles) if (v.equals(role)) allowed = true;
        if (!allowed) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Role not permitted");
        return (Long) o;
    }

    public Staff currentStaff(HttpServletRequest r, StaffRepository repo, String... roles) {
        long id = employee(r, roles);
        Staff s = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!Boolean.TRUE.equals(s.active) || !s.role.equals(attr(r, "role")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is disabled");
        HttpSession session = r.getSession(false);
        Object token = session.getAttribute("sessionKey");
        if (s.sessionKey == null || !s.sessionKey.equals(token)) {
            session.invalidate();
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "A newer login or credential change ended this session");
        }
        Object last = session.getAttribute("lastActivity");
        long now = System.currentTimeMillis();
        if (!(last instanceof Long) || now - (Long) last >= 30 * 60 * 1000L) {
            session.invalidate();
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session expired after 30 minutes of inactivity");
        }
        if ("1".equals(r.getHeader("X-User-Activity"))) session.setAttribute("lastActivity", now);
        return s;
    }

    public void checkStudentOwner(HttpServletRequest r, Application a) {
        if (!a.studentId.equals(student(r)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your application");
    }
}
