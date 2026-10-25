package com.dccmp.backend.service;

import com.dccmp.backend.entity.*;
import com.dccmp.backend.repository.*;
import com.dccmp.backend.dto.Records;

import java.time.LocalDateTime;
import java.util.*;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class HandoverService {
    public static final List<String> REQUIRED = List.of("printed_form", "student_identity", "student_id_or_receipt", "deposit_receipt_or_affidavit", "semester_marks", "photograph");
    private final WorkflowService flow;
    private final HandoverRepository handovers;
    private final ChecklistRepository checklist;

    public HandoverService(WorkflowService flow, HandoverRepository a, ChecklistRepository b) {
        this.flow = flow;
        handovers = a;
        checklist = b;
    }

    @Transactional
    public Handover complete(Staff actor, Records.HandoverInput in) {
        Application v = flow.getApp(in.applicationId());
        if (!"APPROVED".equals(v.status) || flow.forms.findByApplicationId(v.id).isEmpty())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Issued approved form required");
        GeneratedForm issued = flow.forms.findByApplicationId(v.id).orElseThrow();
        if (in.verificationId() == null || !issued.verificationId.equals(in.verificationId()))
            throw WorkflowService.bad("Verification ID must match the printed approved form");
        if (handovers.findByApplicationId(v.id).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Certificates already handed over");
        if (in.checklist() == null || REQUIRED.stream().anyMatch(k -> !Boolean.TRUE.equals(in.checklist().get(k))))
            throw WorkflowService.bad("All six physical checks must be verified before handover");
        Handover h = new Handover();
        h.applicationId = v.id;
        h.adminId = actor.id;
        h.verifiedAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        h.handedOverAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        h.remarks = WorkflowService.optional(in.remarks());
        h = handovers.save(h);
        for (String item : REQUIRED) {
            Checklist c = new Checklist();
            c.handoverId = h.id;
            c.code = item;
            c.verified = true;
            c.note = in.alternatives() == null ? "" : in.alternatives().getOrDefault(item, "");
            checklist.save(c);
        }
        flow.event(v.id, "ADMIN", actor.id, "CERTIFICATES_HANDED_OVER", "Physical checklist complete; " + h.remarks);
        return h;
    }
}
