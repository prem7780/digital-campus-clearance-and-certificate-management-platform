package com.dccmp.backend.service;

import com.dccmp.backend.entity.*;
import com.dccmp.backend.repository.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.time.temporal.*;
import java.util.*;
import java.util.stream.*;

@Service
public class StaffDashboardService {
 private final ApprovalRepository approvals; private final ApplicationRepository apps; private final StudentRepository students;
 private final DepartmentDecisionEventRepository decisions; private final ReopeningRepository reopenings; private final WorkflowService flow;
 private final StaffRepository staff;
 private static final ZoneId IST=ZoneId.of("Asia/Kolkata");
 public StaffDashboardService(ApprovalRepository approvals,ApplicationRepository apps,StudentRepository students,
 DepartmentDecisionEventRepository decisions,ReopeningRepository reopenings,WorkflowService flow,StaffRepository staff){
 this.approvals=approvals;this.apps=apps;this.students=students;this.decisions=decisions;this.reopenings=reopenings;this.flow=flow;this.staff=staff;
 }
 private Long dept(Staff actor){if(actor.departmentId==null)throw new ResponseStatusException(HttpStatus.FORBIDDEN);return actor.departmentId;}
 private static String wildcard(String v){return v==null||v.isBlank()?null:"%"+v.trim().toLowerCase(Locale.ROOT)+"%";}
 private Map<String,Object> compact(Approval p){
  Application a=flow.getApp(p.applicationId);Student s=students.findById(a.studentId).orElseThrow();
  Map<String,Object> m=new LinkedHashMap<>();m.put("id",a.id);m.put("approvalId",p.id);
  m.put("rollNumber",s.rollNumber);m.put("studentName",a.studentName);m.put("branch",a.branch);
  m.put("submittedAt",a.submittedAt);m.put("departmentStatus",p.status);m.put("decisionAt",p.decidedAt);
  m.put("remarks",p.remarks);return m;
 }
 public Map<String,Object> applications(Staff actor,int page,String status,String roll,String name,String branch,String sort){
  String state=status==null||status.isBlank()?null:status.toUpperCase(Locale.ROOT);
  if(state!=null&&!List.of("PENDING","APPROVED","REJECTED").contains(state))throw WorkflowService.bad("Invalid department status");
  Pageable pageable=PageRequest.of(Math.max(0,Math.min(100000,page)),10);
  Long departmentId=dept(actor);String r=wildcard(roll),n=wildcard(name),b=wildcard(branch);
  Page<Approval> records=switch(Objects.toString(sort,"newest")){
   case "oldest"->approvals.searchOldest(departmentId,state,r,n,b,pageable);
   case "name"->approvals.searchByName(departmentId,state,r,n,b,pageable);
   case "roll"->approvals.searchByRoll(departmentId,state,r,n,b,pageable);
   default->approvals.searchNewest(departmentId,state,r,n,b,pageable);
  };
  return Map.of("items",records.getContent().stream().map(this::compact).toList(),"total",records.getTotalElements(),"pages",records.getTotalPages(),"page",records.getNumber());
 }
 public Map<String,Object> details(Staff actor,long applicationId){
  Approval p=approvals.findByApplicationIdAndDepartmentId(applicationId,dept(actor)).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"No application for this department"));
  Map<String,Object> m=new LinkedHashMap<>(compact(p));Application a=flow.getApp(applicationId);
  m.put("email",a.email);m.put("phone",a.phone);
  m.put("history",decisions.findByApplicationIdAndDepartmentIdOrderByDecidedAtDesc(applicationId,dept(actor)).stream().map(this::historyRow).toList());
  m.put("reopenings",reopenings.findByApplicationIdOrderByCreatedAtDesc(applicationId).stream().filter(r->Objects.equals(r.approvalId,p.id))
      .map(r->Map.of("timestamp",r.createdAt,"reason",r.reason,"type","ADMIN_REOPENED")).toList());
  return m;
 }
 private Map<String,Object> historyRow(DepartmentDecisionEvent d){
  Application a=flow.getApp(d.applicationId);String roll=students.findById(a.studentId).orElseThrow().rollNumber;
  Map<String,Object> m=new LinkedHashMap<>();m.put("id",d.id);m.put("applicationId",d.applicationId);
  m.put("rollNumber",roll);m.put("studentName",a.studentName);m.put("branch",a.branch);
  m.put("decision",d.action);m.put("remarks",d.remarks);m.put("timestamp",d.decidedAt);
  m.put("account",staff.findById(d.accountId).map(s->s.code).orElse("Department account"));
  return m;
 }
 public Map<String,Object> history(Staff actor,int page){
  Page<DepartmentDecisionEvent> events=decisions.findByDepartmentIdOrderByDecidedAtDesc(dept(actor),PageRequest.of(Math.max(0,page),10));
  return Map.of("items",events.getContent().stream().map(this::historyRow).toList(),"total",events.getTotalElements(),"pages",events.getTotalPages(),"page",events.getNumber());
 }
 @Transactional
 public Map<String,Object> bulk(Staff actor,List<Long> selected,String commonRemark){
  if(selected==null||selected.isEmpty()||selected.size()>10||new HashSet<>(selected).size()!=selected.size())
    throw WorkflowService.bad("Select 1 to 10 distinct applications");
  // Lock and validate EVERY item before writing. A conflict rolls back the whole transaction.
  List<Approval> locked=new ArrayList<>();
  for(Long id:selected.stream().sorted().toList()){
   Approval p=approvals.lockById(id).orElseThrow(()->WorkflowService.conflict("Approval not found: "+id));
   if(!Objects.equals(p.departmentId,dept(actor))||!"PENDING".equals(p.status))
    throw WorkflowService.conflict("Selection changed: approval "+id+" is no longer pending in this department");
   Application a=flow.getApp(p.applicationId);
   if(!List.of("PENDING_DEPARTMENTS","ACTION_REQUIRED").contains(a.status))
    throw WorkflowService.conflict("Selection changed: application "+a.id+" is no longer under departmental review");
   locked.add(p);
  }
  for(Approval p:locked)flow.decideDepartment(actor,p.id,true,commonRemark);
  return Map.of("approved",locked.size());
 }
 private boolean inRange(LocalDateTime t,LocalDate from,LocalDate to){return t!=null&&!t.toLocalDate().isBefore(from)&&!t.toLocalDate().isAfter(to);}
 private LocalDate[] bounds(String period,String start,String end){
  LocalDate today=LocalDate.now(IST); LocalDate from=LocalDate.of(1900,1,1),to=today;
  if("today".equals(period))from=today;
  else if("week".equals(period))from=today.with(DayOfWeek.MONDAY);
  else if("month".equals(period))from=today.withDayOfMonth(1);
  else if("custom".equals(period)){
   try {from=LocalDate.parse(start);to=LocalDate.parse(end);}catch(Exception ex){throw WorkflowService.bad("Choose a valid start and end date");}
   if(from.isAfter(to)||to.isAfter(today))throw WorkflowService.bad("Custom dates must be valid and not in the future");
  }
  return new LocalDate[]{from,to};
 }
 public Map<String,Object> overview(Staff actor,String period,String start,String end,String group){
  Long id=dept(actor);LocalDate[] range=bounds(period,start,end);LocalDate from=range[0],to=range[1];
  List<Approval> current=approvals.findByDepartmentIdOrderByIdDesc(id);
  if("all".equals(period)||period==null||period.isBlank()) from=todayStart(current);
  final LocalDate effectiveFrom=from;
  List<Approval> filtered=current.stream().filter(p->inRange(flow.getApp(p.applicationId).submittedAt,effectiveFrom,to)).toList();
  long pending=filtered.stream().filter(p->"PENDING".equals(p.status)).count(),approved=filtered.stream().filter(p->"APPROVED".equals(p.status)).count(),rejected=filtered.stream().filter(p->"REJECTED".equals(p.status)).count();
  List<DepartmentDecisionEvent> events=decisions.findByDepartmentIdOrderByDecidedAtDesc(id);
  List<DepartmentDecisionEvent> selected=events.stream().filter(d->inRange(d.decidedAt,effectiveFrom,to)).toList();
  // If the site predates event recording, existing current decisions still count in status cards.
  double meanMinutes=selected.stream().filter(d->d.cycleStartedAt!=null).mapToLong(d->Math.max(0,Duration.between(d.cycleStartedAt,d.decidedAt).toMinutes())).average().orElse(-1);
  String grouping=List.of("daily","weekly","monthly","yearly").contains(group)?group:"monthly";
  if(ChronoUnit.DAYS.between(from,to)+1>100 && "daily".equals(grouping))grouping="weekly";
  if(ChronoUnit.WEEKS.between(from,to)+1>100 && "weekly".equals(grouping))grouping="monthly";
  if(ChronoUnit.MONTHS.between(YearMonth.from(from),YearMonth.from(to))+1>100 && "monthly".equals(grouping))grouping="yearly";
  // A multi-century date interval remains complete, including all years, instead of silently truncating.
  LocalDate cursor=switch(grouping){case "daily"->from;case "weekly"->from.with(DayOfWeek.MONDAY);case "yearly"->from.withDayOfYear(1);default->from.withDayOfMonth(1);};
  Map<String,long[]> totals=new LinkedHashMap<>();
  while(!cursor.isAfter(to)){
   String label=key(cursor,grouping); totals.put(label,new long[]{0,0});
   cursor=switch(grouping){case "daily"->cursor.plusDays(1);case "weekly"->cursor.plusWeeks(1);case "yearly"->cursor.plusYears(1);default->cursor.plusMonths(1);};
  }
  for(DepartmentDecisionEvent d:selected){String k=key(d.decidedAt.toLocalDate(),grouping);long[] counts=totals.get(k);if(counts!=null)counts["APPROVED".equals(d.action)?0:1]++;}
  List<Map<String,Object>> trend=new ArrayList<>();for(var e:totals.entrySet())trend.add(Map.of("period",e.getKey(),"approvals",e.getValue()[0],"rejections",e.getValue()[1]));
  Map<String,Object> m=new LinkedHashMap<>();m.put("total",filtered.size());m.put("pending",pending);m.put("approved",approved);m.put("rejected",rejected);
  m.put("approvalRate",approved+rejected==0?null:100.0*approved/(approved+rejected));m.put("averageMinutes",meanMinutes<0?null:meanMinutes);
  m.put("grouping",grouping);m.put("trend",trend);
  m.put("oldestPending",current.stream().filter(p->"PENDING".equals(p.status)).sorted(Comparator.comparing(p->flow.getApp(p.applicationId).submittedAt)).limit(5).map(this::compact).toList());
  return m;
 }
 private LocalDate todayStart(List<Approval> current){return current.stream().map(p->flow.getApp(p.applicationId).submittedAt.toLocalDate()).min(LocalDate::compareTo).orElse(LocalDate.now(IST));}
 private String key(LocalDate d,String group){return switch(group){case "daily"->d.toString();case "weekly"->d.with(DayOfWeek.MONDAY).toString();case "yearly"->Integer.toString(d.getYear());default->YearMonth.from(d).toString();};}
}
