#!/usr/bin/env python3
"""LOCAL Mailpit/MySQL end-to-end DCCMP smoke walkthrough (uses fictional data)."""
import json,os,re,sys,time,urllib.request,urllib.error,http.cookiejar
from urllib.parse import quote
API=os.getenv('SMOKE_BACKEND','http://localhost:8080')+'/api'
MAILPIT=os.getenv('SMOKE_MAILPIT','http://localhost:8025')
ROLL=os.getenv('SMOKE_ROLL','23NG1A9999')
EMAIL=ROLL.lower()+'@usharama.in'
PASS=os.getenv('DEMO_STAFF_PASSWORD','')
ADMIN_CODE=os.getenv('ADMIN_CODE','ADMIN001')
ADMIN_PASSWORD=os.getenv('ADMIN_PASSWORD','')
assert os.getenv('SMOKE_LOCAL_ONLY')=='YES', 'Set SMOKE_LOCAL_ONLY=YES to confirm local Mailpit test; do not run against real student SMTP'
assert len(PASS)>=12 and len(ADMIN_PASSWORD)>=12, 'Set DEMO_STAFF_PASSWORD and ADMIN_PASSWORD (12+ chars)'
class Client:
 def __init__(self):
  self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
  self.csrf=None
 def call(self,path,data=None,method=None):
  method=method or ('POST' if data is not None else 'GET')
  if self.csrf is None and method not in ('GET','HEAD'):
   self.csrf=self.call('/public/csrf')['token']
  headers={'Content-Type':'application/json'}
  if method not in ('GET','HEAD'):headers['X-XSRF-TOKEN']=self.csrf
  request=urllib.request.Request(API+path,data=json.dumps(data).encode() if data is not None else None,method=method,headers=headers)
  try:
   with self.opener.open(request,timeout=15) as r:
    body=r.read()
    if r.headers.get('content-type','').startswith('application/pdf'):return body
    return json.loads(body) if body else None
  except urllib.error.HTTPError as e:
   raise RuntimeError(f'{method} {path} failed {e.code}: {e.read().decode()[:250]}')
def mailpit_code():
 deadline=time.time()+25
 while time.time()<deadline:
  try:
   with urllib.request.urlopen(MAILPIT+'/api/v1/messages',timeout=5) as resp: messages=json.load(resp).get('messages',[])
   for m in messages:
    if not any(x.get('Address','').lower()==EMAIL for x in m.get('To',[])):continue
    with urllib.request.urlopen(MAILPIT+'/api/v1/message/'+quote(m['ID']),timeout=5) as resp: content=json.load(resp)
    text=content.get('Text','')
    match=re.search(r'verification code:\s*([0-9]{6})',text)
    if match:return match.group(1)
  except (OSError,KeyError):pass
  time.sleep(2)
 raise RuntimeError('Could not retrieve OTP in local Mailpit inbox')
student=Client()
student.call('/public/otp/send',{'rollNumber':ROLL,'email':EMAIL})
student.call('/public/otp/verify',{'rollNumber':ROLL,'otp':mailpit_code()})
assert student.call('/student/me')['rollNumber']==ROLL
student.call('/student/alumni',{
 'name':'Local Test Student','fatherName':'Test Parent','yearOfStudy':'2022-2026','branch':'CSE','address':'Test campus address','mobile':'9000000000',
 'hobbies':'Reading','academicAchievements':'','awards':'','placementDetails':'','jobDetails':'','futurePlans':'Graduate',
 'friends':[{'name':f'Test Friend {i}','phone':f'90000000{i:02d}'} for i in range(5)]
})
app=student.call('/student/no-dues',{'studentName':'Local Test Student','branch':'CSE','address':'Test campus address','phone':'9000000000','declaration':True})
assert len(app['approvals'])==17
print('PASS student identity, alumni then No Dues, 17 approvals')
for ap in app['approvals']:
 c=Client();c.call('/auth/login',{'code':'DEMO_'+ap['code'].upper(),'password':PASS})
 c.call('/staff/approvals/'+str(ap['id'])+'/approve',{'remarks':'Cleared in local smoke test'},'PATCH')
print('PASS 17 scoped staff approvals')
principal=Client();principal.call('/auth/login',{'code':'DEMO_PRINCIPAL','password':PASS})
assert any(x['id']==app['id'] for x in principal.call('/principal/pending'))
principal.call('/principal/applications/'+str(app['id'])+'/approve',{'remarks':'Final local test approval'},'PATCH')
app=student.call('/student/applications')[0]
assert app['status']=='APPROVED' and app['pdfReady'] and app['verificationId']
pdf=student.call('/student/approved-form/'+str(app['id']))
assert pdf.startswith(b'%PDF') and len(pdf)>1000
valid=student.call('/public/verify/'+app['verificationId'])
assert valid['valid']
print('PASS Principal gate, generated PDF, verification ID and QR destination')
admin=Client();admin.call('/auth/login',{'code':ADMIN_CODE,'password':ADMIN_PASSWORD})
checks={k:True for k in ('printed_form','student_identity','student_id_or_receipt','deposit_receipt_or_affidavit','semester_marks','photograph')}
admin.call('/admin/handovers',{'applicationId':app['id'],'verificationId':app['verificationId'],'checklist':checks,'alternatives':{},'remarks':'LOCAL TEST - fictional'},'POST')
assert student.call('/student/applications')[0]['handoverStatus']=='HANDED_OVER'
print('PASS physical verification checklist, handover and student tracking')
print('COMPLETE: local E2E smoke passed. Check Mailpit for approved PDF attachment.')
