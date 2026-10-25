package com.dccmp.backend.service;

import com.dccmp.backend.dto.Records;
import com.dccmp.backend.entity.Application;
import com.dccmp.backend.entity.Checklist;
import com.dccmp.backend.entity.GeneratedForm;
import com.dccmp.backend.entity.Handover;
import com.dccmp.backend.entity.Staff;
import com.dccmp.backend.repository.ChecklistRepository;
import com.dccmp.backend.repository.GeneratedFormRepository;
import com.dccmp.backend.repository.HandoverRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class HandoverService {

    public static final List<String> REQUIRED = List.of(
            "printed_form",
            "student_identity",
            "student_id_or_receipt",
            "deposit_receipt_or_affidavit",
            "semester_marks",
            "photograph"
    );

    private final WorkflowService flow;
    private final HandoverRepository handovers;
    private final ChecklistRepository checklist;
    private final GeneratedFormRepository forms;

    // Inject GeneratedFormRepository directly rather than reading flow.forms.
    public HandoverService(
            WorkflowService flow,
            HandoverRepository handovers,
            ChecklistRepository checklist,
            GeneratedFormRepository forms
    ) {
        this.flow = flow;
        this.handovers = handovers;
        this.checklist = checklist;
        this.forms = forms;
    }

    @Transactional
    public Handover complete(Staff actor, Records.HandoverInput in) {
        Application application = flow.getApp(in.applicationId());

        if (!"APPROVED".equals(application.status)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Issued approved form required"
            );
        }

        GeneratedForm issued = forms.findByApplicationId(application.id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.CONFLICT, "Issued approved form required"
                ));

        if (in.verificationId() == null
                || !issued.verificationId.equals(in.verificationId())) {
            throw WorkflowService.bad(
                    "Verification ID must match the printed approved form"
            );
        }

        if (handovers.findByApplicationId(application.id).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Certificates already handed over"
            );
        }

        if (in.checklist() == null
                || REQUIRED.stream().anyMatch(
                item -> !Boolean.TRUE.equals(in.checklist().get(item))
        )) {
            throw WorkflowService.bad(
                    "All six physical checks must be verified before handover"
            );
        }

        Handover handover = new Handover();
        handover.applicationId = application.id;
        handover.adminId = actor.id;
        handover.verifiedAt = LocalDateTime.now(ZoneId.of("Asia/Kolkata"));
        handover.handedOverAt = LocalDateTime.now(ZoneId.of("Asia/Kolkata"));
        handover.remarks = WorkflowService.optional(in.remarks());
        handover = handovers.save(handover);

        for (String item : REQUIRED) {
            Checklist entry = new Checklist();
            entry.handoverId = handover.id;
            entry.code = item;
            entry.verified = true;
            entry.note = in.alternatives() == null
                    ? ""
                    : in.alternatives().getOrDefault(item, "");
            checklist.save(entry);
        }

        flow.event(
                application.id,
                "ADMIN",
                actor.id,
                "CERTIFICATES_HANDED_OVER",
                "Physical checklist complete; " + handover.remarks
        );
        return handover;
    }
}
