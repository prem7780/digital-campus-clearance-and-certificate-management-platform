package com.dccmp.backend.service;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.*;

import java.io.*;
import java.awt.Color;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.zip.*;

/**
 * Exports aggregate analytics only. Individual student data must never enter this service.
 */
@Service
public class AnalyticsExportService {
    private final PrincipalDashboardService principal;

    public AnalyticsExportService(PrincipalDashboardService p) {
        principal = p;
    }

    private String csvCell(Object value) {
        return "\"" + Objects.toString(value, "").replace("\"", "\"\"") + "\"";
    }

    private String xml(Object v) {
        return Objects.toString(v, "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private List<List<String>> rows(String period, String start, String end) {
        Map<String, Object> summary = principal.summary(period, start, end);
        List<List<String>> data = new ArrayList<>();
        data.add(List.of("Usharama College of Engineering and Technology", "DCCMP - Department Analytics"));
        data.add(List.of("Reporting period", Objects.toString(period, "all"), "Start", Objects.toString(start, ""), "End", Objects.toString(end, "")));
        data.add(List.of("Generated (IST)", ZonedDateTime.now(ZoneId.of("Asia/Kolkata")).format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a z"))));
        data.add(List.of("Total applications", summary.get("total").toString(), "Principal approved", summary.get("approved").toString(), "Principal pending", summary.get("pendingPrincipal").toString(), "Unresolved rejected", summary.get("unresolvedRejected").toString()));
        data.add(List.of());
        data.add(List.of("Department", "Shared account", "Total", "Pending", "Approved", "Rejected", "Approval %", "Average processing minutes", "Historical approvals", "Historical rejections"));
        for (Map<String, Object> d : principal.departments(period, start, end))
            data.add(List.of(Objects.toString(d.get("department")), Objects.toString(d.get("account")), Objects.toString(d.get("total")), Objects.toString(d.get("pending")), Objects.toString(d.get("approved")), Objects.toString(d.get("rejected")), Objects.toString(d.get("approvalRate"), "N/A"), Objects.toString(d.get("averageMinutes"), "N/A"), Objects.toString(d.get("historicalApprovals")), Objects.toString(d.get("historicalRejections"))));
        return data;
    }

    public ResponseEntity<byte[]> export(String format, String period, String start, String end) {
        List<List<String>> data = rows(period, start, end);
        byte[] bytes;
        MediaType type;
        String ext;
        switch (Objects.toString(format, "csv")) {
            case "pdf" -> {
                bytes = pdf(data);
                type = MediaType.APPLICATION_PDF;
                ext = "pdf";
            }
            case "xlsx" -> {
                bytes = xlsx(data);
                type = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                ext = "xlsx";
            }
            case "csv" -> {
                StringBuilder out = new StringBuilder();
                for (var row : data.subList(Math.min(5, data.size()), data.size()))
                    out.append(String.join(",", row.stream().map(this::csvCell).toList())).append("\r\n");
                bytes = out.toString().getBytes(StandardCharsets.UTF_8);
                type = MediaType.parseMediaType("text/csv");
                ext = "csv";
            }
            default -> throw WorkflowService.bad("Only PDF, Excel, and CSV exports are supported");
        }
        return ResponseEntity.ok().contentType(type).header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=DCCMP-Department-Analytics." + ext).body(bytes);
    }

    private byte[] pdf(List<List<String>> data) {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            PDPageContentStream canvas = new PDPageContentStream(doc, page);
            float y = 790;
            for (int i = 0; i < data.size(); i++) {
                List<String> values = data.get(i);
                if (y < 55) {
                    canvas.close();
                    page = new PDPage(PDRectangle.A4);
                    doc.addPage(page);
                    canvas = new PDPageContentStream(doc, page);
                    y = 790;
                }
                if (values.isEmpty()) {
                    y -= 12;
                    continue;
                }
                boolean title = i == 0, headers = i == 5;
                String line = String.join(" | ", values.stream().map(v -> v.length() > 22 ? v.substring(0, 22) : v).toList());
                if (line.length() > 110) line = line.substring(0, 110);
                canvas.beginText();
                canvas.setFont(new PDType1Font(title || headers ? Standard14Fonts.FontName.HELVETICA_BOLD : Standard14Fonts.FontName.HELVETICA), title ? 12 : headers ? 8 : 7);
                canvas.newLineAtOffset(32, y);
                canvas.showText(line.replaceAll("[^\\x20-\\x7E]", "?"));
                canvas.endText();
                y -= title ? 28 : 17;
                if (i >= 6 && values.size() > 5) {
                    try {
                        int approved = Integer.parseInt(values.get(4)), rejected = Integer.parseInt(values.get(5));
                        canvas.setNonStrokingColor(new Color(52, 174, 117));
                        canvas.addRect(33, y - 1, Math.min(200, approved * 4), 3);
                        canvas.fill();
                        canvas.setNonStrokingColor(new Color(216, 76, 91));
                        canvas.addRect(34 + Math.min(200, approved * 4), y - 1, Math.min(150, rejected * 4), 3);
                        canvas.fill();
                        canvas.setNonStrokingColor(Color.BLACK);
                        y -= 8;
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
            canvas.close();
            doc.save(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to create aggregate PDF report", ex);
        }
    }

    private void entry(ZipOutputStream zip, String path, String data) throws IOException {
        zip.putNextEntry(new ZipEntry(path));
        zip.write(data.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    /**
     * Minimal standards-compliant OOXML workbook with numeric analytics cells and a chart-like activity view.
     */
    private byte[] xlsx(List<List<String>> data) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream(); ZipOutputStream zip = new ZipOutputStream(out)) {
            entry(zip, "[Content_Types].xml", "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/></Types>");
            entry(zip, "_rels/.rels", "<?xml version=\"1.0\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>");
            entry(zip, "xl/_rels/workbook.xml.rels", "<?xml version=\"1.0\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/></Relationships>");
            entry(zip, "xl/workbook.xml", "<?xml version=\"1.0\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets><sheet name=\"Department Analytics\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>");
            StringBuilder sheet = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetViews><sheetView workbookViewId=\"0\"/></sheetViews><sheetFormatPr defaultRowHeight=\"18\"/><sheetData>");
            for (int i = 0; i < data.size(); i++) {
                sheet.append("<row r=\"").append(i + 1).append("\">");
                List<String> row = data.get(i);
                for (int j = 0; j < row.size(); j++) {
                    String val = row.get(j);
                    String col = "";
                    int k = j + 1;
                    while (k > 0) {
                        col = (char) ('A' + (k - 1) % 26) + col;
                        k = (k - 1) / 26;
                    }
                    String ref = col + (i + 1);
                    if (i >= 6 && j >= 2 && j <= 9 && val.matches("-?\\d+(\\.\\d+)?"))
                        sheet.append("<c r=\"").append(ref).append("\"><v>").append(val).append("</v></c>");
                    else
                        sheet.append("<c r=\"").append(ref).append("\" t=\"inlineStr\"><is><t>").append(xml(val)).append("</t></is></c>");
                }
                sheet.append("</row>");
            }
            sheet.append("</sheetData></worksheet>");
            entry(zip, "xl/worksheets/sheet1.xml", sheet.toString());
            zip.finish();
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to create Excel report", ex);
        }
    }
}
