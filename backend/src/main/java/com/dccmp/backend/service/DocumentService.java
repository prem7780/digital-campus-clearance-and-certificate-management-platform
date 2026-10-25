
package com.dccmp.backend.service;

import com.dccmp.backend.entity.*;
import com.dccmp.backend.repository.*;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;

import jakarta.mail.internet.MimeMessage;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.*;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.*;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class DocumentService {

 // Existing services and repositories
 private final WorkflowService flow;
 private final GeneratedFormRepository forms;
 private final EmailDeliveryRepository emails;
 private final JavaMailSender mail;
 private final StaffRepository staff;
 private final StudentRepository students;

 // FIX: Inject these repositories directly
 private final ApprovalRepository approvals;
 private final DepartmentRepository departments;
 private final PrincipalDecisionRepository principals;

 @Value("${app.base-url}")
 private String baseUrl;

 @Value("${app.pdf-template}")
 private String templatePath;

 @Value("${app.pdf-storage}")
 private String storageDir;

 @Value("${app.mail-from}")
 private String from;

 private final SecureRandom secure = new SecureRandom();

 // Corrected constructor
 public DocumentService(
         WorkflowService flow,
         GeneratedFormRepository forms,
         EmailDeliveryRepository emails,
         JavaMailSender mail,
         StaffRepository staff,
         StudentRepository students,
         ApprovalRepository approvals,
         DepartmentRepository departments,
         PrincipalDecisionRepository principals
 ) {
  this.flow = flow;
  this.forms = forms;
  this.emails = emails;
  this.mail = mail;
  this.staff = staff;
  this.students = students;

  this.approvals = approvals;
  this.departments = departments;
  this.principals = principals;
 }

 // -----------------------------------------
 // PDF TEXT HELPER
 // -----------------------------------------

 private static void txt(
         PDPageContentStream stream,
         PDFont font,
         int size,
         float x,
         float y,
         String value
 ) throws IOException {

  if (value == null) {
   return;
  }

  String text = value.replaceAll(
          "[^\\x20-\\x7E]", " "
  );

  if (text.length() > 90) {
   text = text.substring(0, 90);
  }

  stream.beginText();
  stream.setFont(font, size);
  stream.newLineAtOffset(x, y);
  stream.showText(text);
  stream.endText();
 }

 private static String shortVal(
         String value,
         int limit
 ) {
  if (value == null) {
   return "";
  }

  return value.length() > limit
          ? value.substring(0, limit - 2) + ".."
          : value;
 }

 // -----------------------------------------
 // QR CODE GENERATION
 // -----------------------------------------

 private BufferedImage qr(String value)
         throws WriterException {

  BitMatrix matrix = new MultiFormatWriter()
          .encode(
                  value,
                  BarcodeFormat.QR_CODE,
                  190,
                  190
          );

  BufferedImage image = new BufferedImage(
          matrix.getWidth(),
          matrix.getHeight(),
          BufferedImage.TYPE_INT_RGB
  );

  for (int y = 0; y < matrix.getHeight(); y++) {
   for (int x = 0; x < matrix.getWidth(); x++) {

    image.setRGB(
            x,
            y,
            matrix.get(x, y)
                    ? 0xff172544
                    : 0xffffffff
    );
   }
  }

  return image;
 }

 // -----------------------------------------
 // GENERATE APPROVED NO DUES PDF
 // -----------------------------------------

 private byte[] render(
         Application application,
         String verification
 ) throws Exception {

  Path template = Path.of(templatePath)
          .toAbsolutePath()
          .normalize();

  try (PDDocument doc =
               Files.isRegularFile(template)
                       ? Loader.loadPDF(template.toFile())
                       : new PDDocument()) {

   if (doc.getNumberOfPages() == 0) {
    doc.addPage(
            new PDPage(PDRectangle.A4)
    );
   }

   PDFont regular = new PDType1Font(
           Standard14Fonts.FontName.HELVETICA
   );

   PDFont bold = new PDType1Font(
           Standard14Fonts.FontName.HELVETICA_BOLD
   );

   Student student = students
           .findById(application.studentId)
           .orElseThrow();

   // Read departmental approvals directly
   // from the injected repository.
   List<Approval> current = approvals
           .findByApplicationIdOrderByDepartmentId(
                   application.id
           );

   Map<String, Approval> byCode = new HashMap<>();

   for (Approval approval : current) {

    Department department = departments
            .findById(approval.departmentId)
            .orElseThrow();

    byCode.put(
            department.code,
            approval
    );
   }

   // -------------------------------------
   // OFFICIAL NO DUES FORM
   // -------------------------------------

   PDPage source = doc.getPage(0);

   try (PDPageContentStream content =
                new PDPageContentStream(
                        doc,
                        source,
                        PDPageContentStream.AppendMode.APPEND,
                        true,
                        true
                )) {

    // Student details
    txt(content, bold, 9, 236, 693,
            shortVal(application.branch, 24));

    txt(content, bold, 9, 236, 669,
            shortVal(application.studentName, 24));

    txt(content, bold, 9, 236, 647,
            student.rollNumber);

    txt(content, regular, 8, 235, 610,
            shortVal(application.address, 29));

    txt(content, bold, 9, 236, 577,
            shortVal(application.phone, 25));

    txt(content, regular, 8, 235, 554,
            application.email);

    // Principal approval label
    txt(content, bold, 9, 432, 108,
            "APPROVED");

    // ---------------------------------
    // SEVEN HOD APPROVALS
    // ---------------------------------

    List<String> hods = List.of(
            "hod_civil",
            "hod_eee",
            "hod_mech",
            "hod_ece",
            "hod_cse",
            "hod_ai",
            "hod_it"
    );

    for (int i = 0; i < hods.size(); i++) {

     Approval approval = byCode.get(
             hods.get(i)
     );

     if (approval != null &&
             "APPROVED".equals(approval.status)) {

      txt(
              content,
              bold,
              7,
              457,
              673 - i * 21,
              "APPROVED"
      );

      txt(
              content,
              regular,
              5,
              457,
              665 - i * 21,
              "SEE ANNEX"
      );
     }
    }

    // ---------------------------------
    // TEN GENERAL DEPARTMENTS
    // ---------------------------------

    List<String> general = List.of(
            "hostel",
            "canteen",
            "accounts",
            "scholarship",
            "training_placements",
            "examinations",
            "sports",
            "alumni",
            "library",
            "special_team"
    );

    for (int i = 0; i < general.size(); i++) {

     Approval approval = byCode.get(
             general.get(i)
     );

     if (approval != null &&
             "APPROVED".equals(approval.status)) {

      txt(
              content,
              bold,
              7,
              248,
              474 - i * 21,
              "NO DUE"
      );

      txt(
              content,
              regular,
              6,
              378,
              474 - i * 21,
              "DIGITALLY VERIFIED - SEE ANNEX"
      );
     }
    }
   }

   // -------------------------------------
   // DIGITAL VERIFICATION ANNEX
   // -------------------------------------

   PDPage annex = new PDPage(
           PDRectangle.A4
   );

   doc.addPage(annex);

   try (PDPageContentStream content =
                new PDPageContentStream(doc, annex)) {

    txt(content, bold, 17, 46, 791,
            "DCCMP - DIGITAL APPROVAL VERIFICATION");

    txt(content, regular, 10, 46, 770,
            "URCET/5.4/FT 01  |  Official No Dues clearance annex");

    txt(content, bold, 10, 46, 744,
            "Student:");

    txt(content, regular, 10, 120, 744,
            shortVal(application.studentName, 46));

    txt(content, bold, 10, 46, 727,
            "Roll number:");

    txt(content, regular, 10, 120, 727,
            student.rollNumber);

    // Table headings
    txt(content, bold, 9, 46, 708,
            "DEPARTMENT");

    txt(content, bold, 9, 250, 708,
            "APPROVED BY");

    txt(content, bold, 9, 465, 708,
            "DATE");

    float y = 686;

    // List all 17 approvals
    List<Approval> all = approvals
            .findByApplicationIdOrderByDepartmentId(
                    application.id
            );

    for (Approval approval : all) {

     Department department = departments
             .findById(approval.departmentId)
             .orElseThrow();

     String approvedBy =
             approval.staffId == null
                     ? "Unassigned"
                     : staff.findById(
                             approval.staffId
                     )
                     .map(s -> s.name)
                     .orElse("Unknown");

     txt(content, regular, 9, 46, y,
             shortVal(department.name, 28));

     txt(content, regular, 9, 250, y,
             shortVal(approvedBy, 29)
                     + " / " + approval.status);

     txt(content, regular, 8, 465, y,
             approval.decidedAt == null
                     ? "-"
                     : approval.decidedAt.format(
                     DateTimeFormatter.ofPattern(
                             "dd MMM yyyy"
                     )
             )
     );

     content.moveTo(45, y - 6);
     content.lineTo(550, y - 6);
     content.stroke();

     y -= 24;
    }

    // ---------------------------------
    // PRINCIPAL FINAL APPROVAL
    // ---------------------------------

    PrincipalDecision principal = principals
            .findByApplicationId(application.id)
            .orElseThrow();

    String principalName = staff
            .findById(principal.staffId)
            .map(s -> s.name)
            .orElse("Principal");

    txt(content, bold, 10, 46, 260,
            "PRINCIPAL: APPROVED");

    txt(content, regular, 10, 236, 260,
            shortVal(principalName, 32));

    txt(content, regular, 9, 46, 243,
            "Date: " + principal.decidedAt.format(
                    DateTimeFormatter.ofPattern(
                            "dd MMM yyyy HH:mm"
                    )
            )
    );

    // ---------------------------------
    // VERIFICATION ID
    // ---------------------------------

    txt(content, bold, 9, 46, 218,
            "Verification ID:");

    txt(content, regular, 9, 145, 218,
            verification);

    txt(content, regular, 9, 46, 200,
            "Scan QR to check authenticity. This is not an original academic certificate.");

    // AO verification is physical
    txt(content, bold, 9, 46, 165,
            "AO / ADMIN VERIFICATION: PENDING PHYSICAL COLLECTION");

    txt(content, regular, 8, 46, 147,
            "Student must bring the printed form and original supporting documents to the college.");

    // ---------------------------------
    // QR CODE
    // ---------------------------------

    String verificationUrl =
            baseUrl.replaceAll("/$", "")
                    + "/verify/"
                    + verification;

    PDImageXObject qrImage =
            LosslessFactory.createFromImage(
                    doc,
                    qr(verificationUrl)
            );

    content.drawImage(
            qrImage,
            435,
            23,
            112,
            112
    );

    txt(content, regular, 8, 46, 39,
            "DCCMP digitally recorded approvals. No handwritten signatures reproduced.");
   }

   ByteArrayOutputStream output =
           new ByteArrayOutputStream();

   doc.save(output);

   return output.toByteArray();
  }
 }

 // -----------------------------------------
 // ISSUE PDF AFTER PRINCIPAL APPROVAL
 // -----------------------------------------

 @Transactional
 public GeneratedForm issue(long appId) {

  Application application = flow.getApp(appId);

  if (!"APPROVED".equals(application.status)) {
   throw new ResponseStatusException(
           HttpStatus.CONFLICT,
           "Principal approval required"
   );
  }

  Optional<GeneratedForm> existing =
          forms.findByApplicationId(appId);

  if (existing.isPresent()) {
   return existing.get();
  }

  byte[] randomBytes = new byte[24];
  secure.nextBytes(randomBytes);

  String verification =
          Base64.getUrlEncoder()
                  .withoutPadding()
                  .encodeToString(randomBytes);

  try {

   byte[] bytes = render(
           application,
           verification
   );

   Path root = Path.of(storageDir)
           .toAbsolutePath()
           .normalize();

   Files.createDirectories(root);

   Path file = root.resolve(
           "clearance-" + appId
                   + "-" + verification
                   + ".pdf"
   );

   Files.write(
           file,
           bytes,
           StandardOpenOption.CREATE_NEW
   );

   GeneratedForm form = new GeneratedForm();

   form.applicationId = appId;
   form.verificationId = verification;
   form.pdfPath = file.toString();
   form.issuedAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
   form.revoked = false;

   form = forms.save(form);

   flow.event(
           appId,
           "SYSTEM",
           null,
           "PDF_ISSUED",
           verification
   );

   return form;

  } catch (Exception ex) {

   throw new ResponseStatusException(
           HttpStatus.INTERNAL_SERVER_ERROR,
           "PDF generation failed: " + ex.getMessage(),
           ex
   );
  }
 }

 // -----------------------------------------
 // DOWNLOAD PDF
 // -----------------------------------------

 public byte[] pdf(long appId) {

  GeneratedForm form = forms
          .findByApplicationId(appId)
          .orElseThrow(() ->
                  new ResponseStatusException(
                          HttpStatus.NOT_FOUND,
                          "PDF is not issued yet"
                  )
          );

  if (Boolean.TRUE.equals(form.revoked)) {
   throw new ResponseStatusException(
           HttpStatus.GONE,
           "PDF revoked"
   );
  }

  try {

   return Files.readAllBytes(
           Path.of(form.pdfPath)
   );

  } catch (Exception ex) {

   throw new ResponseStatusException(
           HttpStatus.SERVICE_UNAVAILABLE,
           "Stored PDF missing",
           ex
   );
  }
 }

 // -----------------------------------------
 // EMAIL APPROVED PDF TO STUDENT
 // -----------------------------------------

 @Transactional
 public String sendForm(long appId) {

  Application application = flow.getApp(appId);

  if (!"APPROVED".equals(application.status)) {
   throw new ResponseStatusException(
           HttpStatus.CONFLICT,
           "Not approved"
   );
  }

  GeneratedForm form = forms
          .findByApplicationId(appId)
          .orElseThrow(() ->
                  new ResponseStatusException(
                          HttpStatus.CONFLICT,
                          "No generated PDF"
                  )
          );

  List<EmailDelivery> existing =
          emails.findByApplicationIdOrderByCreatedAtDesc(
                  appId
          );

  if (existing.stream().anyMatch(
          delivery ->
                  "APPROVED_PDF".equals(delivery.type)
                          && "EMAIL_SENT".equals(
                          delivery.state
                  )
  )) {
   return "EMAIL_SENT";
  }

  EmailDelivery delivery = new EmailDelivery();

  delivery.applicationId = appId;
  delivery.recipient = application.email;
  delivery.type = "APPROVED_PDF";
  delivery.state = "EMAIL_PENDING";
  delivery.attempts = 1;
  delivery.createdAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));

  delivery = emails.save(delivery);

  try {

   MimeMessage message = mail.createMimeMessage();

   MimeMessageHelper helper =
           new MimeMessageHelper(
                   message,
                   true
           );

   helper.setFrom(from);
   helper.setTo(application.email);

   helper.setSubject(
           "DCCMP No Dues clearance approved - "
                   + application.studentName
   );

   helper.setText(
           "Your No Dues clearance form is approved. "
                   + "Print the attached PDF and bring it "
                   + "with your photograph, ID and other "
                   + "original supporting documents for "
                   + "physical verification and collection.\n"
                   + "Verification ID: "
                   + form.verificationId
   );

   helper.addAttachment(
           "DCCMP-No-Dues-" + application.id + ".pdf",
           new ByteArrayResource(
                   pdf(appId)
           )
   );

   mail.send(message);

   delivery.state = "EMAIL_SENT";
   delivery.sentAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));

   flow.event(
           appId,
           "SYSTEM",
           null,
           "EMAIL_SENT",
           "Approved PDF relayed to SMTP"
   );

  } catch (Exception ex) {

   delivery.state = "EMAIL_FAILED";
   delivery.lastError = shortVal(
           ex.toString(),
           200
   );

   flow.event(
           appId,
           "SYSTEM",
           null,
           "EMAIL_FAILED",
           delivery.lastError
   );
  }

  emails.save(delivery);

  return delivery.state;
 }
}
