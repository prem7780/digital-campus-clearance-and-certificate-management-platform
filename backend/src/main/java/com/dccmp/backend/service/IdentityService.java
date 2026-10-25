package com.dccmp.backend.service;

import com.dccmp.backend.entity.*;
import com.dccmp.backend.repository.*;
import com.dccmp.backend.dto.Records;

import java.security.SecureRandom;
import java.util.concurrent.*;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.ByteArrayOutputStream;

import jakarta.servlet.http.HttpSession;

import java.time.*;
import java.util.*;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class IdentityService {
    private final StudentRepository students;
    private final OtpRepository otps;
    private final StaffRepository staff;
    private final JavaMailSender mail;
    private final PasswordEncoder encoder;
    private final SecureRandom random = new SecureRandom();
    private final ConcurrentHashMap<String, LoginFailures> failures = new ConcurrentHashMap<>();

    private static class LoginFailures {
        int count;
        long timestamp;
    }

    private static final String CAPTCHA_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private String challenge() {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < 6; i++) b.append(CAPTCHA_CHARS.charAt(random.nextInt(CAPTCHA_CHARS.length())));
        return b.toString();
    }

    public byte[] captcha(HttpServletRequest req) {
        HttpSession session = req.getSession(true);
        String answer = challenge();
        session.setAttribute("captchaText", answer);
        session.setAttribute("captchaExpires", System.currentTimeMillis() + 5 * 60 * 1000L);
        BufferedImage image = new BufferedImage(205, 70, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(new Color(239, 244, 250));
        g.fillRect(0, 0, 205, 70);
        g.setFont(new Font("SansSerif", Font.BOLD, 32));
        for (int i = 0; i < 6; i++) {
            g.setColor(new Color(35 + random.nextInt(85), 40 + random.nextInt(90), 70 + random.nextInt(90)));
            g.drawString(answer.substring(i, i + 1), 12 + i * 30, 43 + random.nextInt(10));
        }
        g.setColor(new Color(130, 160, 195));
        for (int i = 0; i < 11; i++)
            g.drawLine(random.nextInt(205), random.nextInt(70), random.nextInt(205), random.nextInt(70));
        g.dispose();
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "CAPTCHA generation failed");
        }
    }

    private boolean captchaValid(Records.Login input, HttpServletRequest req) {
        HttpSession ses = req.getSession(false);
        if (ses == null) return false;
        Object code = ses.getAttribute("captchaText"), expiry = ses.getAttribute("captchaExpires");
        ses.removeAttribute("captchaText");
        ses.removeAttribute("captchaExpires");
        return code instanceof String && expiry instanceof Long && (long) expiry >= System.currentTimeMillis() && ((String) code).equalsIgnoreCase(Objects.toString(input.captcha(), ""));
    }

    @Value("${app.student-roll-regex}")
    String rollRegex;
    @Value("${app.mail-from}")
    String mailFrom;

    public IdentityService(StudentRepository a, OtpRepository b, StaffRepository c, JavaMailSender d, PasswordEncoder e) {
        students = a;
        otps = b;
        staff = c;
        mail = d;
        encoder = e;
    }

    public static String normalizedRoll(String roll) {
        return Objects.toString(roll, "").trim().toUpperCase(Locale.ROOT);
    }

    public void send(Records.OtpStart start) {
        String roll = normalizedRoll(start.rollNumber());
        String email = Objects.toString(start.email(), "").trim().toLowerCase(Locale.ROOT);
        if (!roll.matches(rollRegex) || !email.equals(roll.toLowerCase(Locale.ROOT) + "@usharama.in"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Roll number and official email do not match");
        LocalDateTime now = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        List<Otp> old = otps.findTop10ByEmailOrderByCreatedAtDesc(email);
        if (!old.isEmpty() && old.getFirst().createdAt != null && old.getFirst().createdAt.isAfter(now.minusSeconds(60)))
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Wait one minute before requesting another OTP");
        String token = String.format("%06d", random.nextInt(1000000));
        Otp o = new Otp();
        o.email = email;
        o.hash = encoder.encode(token);
        o.attempts = 0;
        o.createdAt = now;
        o.expiresAt = now.plusMinutes(10);
        otps.save(o);
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(mailFrom);
        msg.setTo(email);
        msg.setSubject("DCCMP verification code");
        msg.setText("Your DCCMP verification code: " + token + "\nExpires in 10 minutes. Do not share this code.");
        try {
            mail.send(msg);
        } catch (Exception ex) {
            o.consumedAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
            otps.save(o);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Mail sending failed; check SMTP setup");
        }
    }

    public Student verify(Records.OtpCheck input, HttpServletRequest req) {
        String roll = normalizedRoll(input.rollNumber());
        if (!roll.matches(rollRegex)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid roll number");
        String email = roll.toLowerCase(Locale.ROOT) + "@usharama.in";
        Otp o = otps.findTop10ByEmailOrderByCreatedAtDesc(email).stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request an OTP first"));
        if (o.consumedAt != null || o.expiresAt.isBefore(LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"))) || o.attempts >= 5)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP expired, used, or locked");
        o.attempts++;
        if (!encoder.matches(Objects.toString(input.otp(), ""), o.hash)) {
            otps.save(o);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP");
        }
        o.consumedAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        otps.save(o);
        Student s = students.findByRollNumber(roll).orElseGet(Student::new);
        s.rollNumber = roll;
        s.email = email;
        s.verifiedAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        s = students.save(s);
        req.getSession(true).setAttribute("studentId", s.id);
        req.getSession().removeAttribute("staffId");
        req.getSession().removeAttribute("role");
        req.changeSessionId();
        return s;
    }

    public void changePassword(Staff account, String old, String updated) {
        if (!encoder.matches(Objects.toString(old, ""), account.passwordHash))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        if (updated == null || !updated.matches("^(?=.*[A-Za-z])(?=.*[0-9]).{8,}$"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password requires at least 8 characters with a letter and number");
        account.passwordHash = encoder.encode(updated);
        account.sessionKey = UUID.randomUUID().toString();
        staff.save(account);
    }

    public Map<String, Object> login(Records.Login login, HttpServletRequest req) {
        String code = Objects.toString(login.code(), "").trim().toUpperCase(Locale.ROOT);
        String key = code + "|" + req.getRemoteAddr();
        long now = System.currentTimeMillis();
        LoginFailures state = failures.computeIfAbsent(key, k -> new LoginFailures());
        synchronized (state) {
            if (now - state.timestamp >= 15 * 60 * 1000L) state.count = 0;
            if (state.count >= 3 && !captchaValid(login, req))
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "CAPTCHA_REQUIRED: Enter the security code shown in the image");
            Staff a = staff.findByCode(code).orElse(null);
            if (a == null || !Boolean.TRUE.equals(a.active) || !encoder.matches(Objects.toString(login.password(), ""), a.passwordHash)) {
                state.count++;
                state.timestamp = now;
                if (state.count >= 3)
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "CAPTCHA_REQUIRED: Invalid credentials; security code required");
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid staff credentials");
            }
            failures.remove(key);
            a.sessionKey = UUID.randomUUID().toString();
            staff.save(a);
            HttpSession session = req.getSession(true);
            req.changeSessionId();
            session.setAttribute("staffId", a.id);
            session.setAttribute("role", a.role);
            session.setAttribute("sessionKey", a.sessionKey);
            session.setAttribute("lastActivity", now);
            session.removeAttribute("studentId");
            return Map.of("id", a.id, "name", a.name, "code", a.code, "role", a.role, "departmentId", a.departmentId == null ? 0 : a.departmentId);
        }
    }
}
