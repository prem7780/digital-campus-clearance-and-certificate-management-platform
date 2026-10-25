package com.dccmp.backend.service;
import com.dccmp.backend.entity.*;
import com.dccmp.backend.repository.*;
import com.dccmp.backend.dto.Records;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class WorkflowRulesTest {
 @Test void rollNormalization(){assertEquals("23NG1A0501",IdentityService.normalizedRoll(" 23ng1a0501 "));}
 @Test void regularAndLateralRollPatterns(){String regex="^[0-9][0-9]NG[15]A[0-9][0-9][0-9][0-9]$";assertTrue("23NG1A0501".matches(regex));assertTrue("24NG5A0501".matches(regex));assertFalse("24NG7A0501".matches(regex));}
 @Test void allSixPhysicalChecksExist(){assertEquals(6,HandoverService.REQUIRED.size());assertTrue(HandoverService.REQUIRED.contains("printed_form"));assertTrue(HandoverService.REQUIRED.contains("deposit_receipt_or_affidavit"));}
 @Test void mandatoryInputRejected(){assertThrows(org.springframework.web.server.ResponseStatusException.class,()->WorkflowService.mandatory("  ","Test"));}
}
