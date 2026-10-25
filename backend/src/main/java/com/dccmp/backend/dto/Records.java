package com.dccmp.backend.dto;

import java.time.LocalDateTime;
import java.util.*;

public final class Records {
    private Records() {
    }

    public record FriendInput(String name, String phone) {
    }

    public record AlumniInput(String name, String fatherName, String yearOfStudy, String branch, String address,
                              String mobile, String hobbies, String academicAchievements, String awards,
                              String placementDetails, String jobDetails, String futurePlans,
                              List<FriendInput> friends) {
    }

    public record NoDuesInput(String studentName, String branch, String address, String phone, Boolean declaration) {
    }

    public record OtpStart(String rollNumber, String email) {
    }

    public record OtpCheck(String rollNumber, String otp) {
    }

    public record Login(String code, String password, String captcha) {
    }

    public record DecisionInput(String remarks) {
    }

    public record DepartmentInput(String name) {
    }

    public record StaffInput(String code, String name, String password, String role, Long departmentId,
                             Boolean active) {
    }

    public record ReopenInput(Long approvalId, Long applicationId, Boolean principalTarget, String reason) {
    }

    public record HandoverInput(Long applicationId, String verificationId, Map<String, Boolean> checklist,
                                Map<String, String> alternatives, String remarks) {
    }

    public record ApprovalView(Long id, Long departmentId, String department, String code, String status,
                               String staffName, String remarks, LocalDateTime decidedAt) {
    }

    public record ApplicationView(Long id, String rollNumber, String studentName, String branch, String address,
                                  String phone, String email, String status, LocalDateTime submittedAt,
                                  List<ApprovalView> approvals, String principalStatus, String principalName,
                                  String principalRemarks, LocalDateTime principalDate, Boolean pdfReady,
                                  String verificationId, String emailStatus, String handoverStatus) {
    }
}
