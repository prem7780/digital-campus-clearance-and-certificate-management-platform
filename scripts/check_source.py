#!/usr/bin/env python3
"""Run dependency-free structural invariants against DCCMP project source."""
import re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
migration=(root/'backend/src/main/resources/db/migration/V2__departments.sql').read_text()
required=['hod_eee','hod_civil','hod_ece','hod_cse','hod_mech','hod_ai','hod_it','hostel','canteen','accounts','scholarship','training_placements','examinations','sports','alumni','library','special_team']
assert len(required)==17
assert all(migration.count("('"+v+"'")==1 for v in required), '17 department seed mismatch'
assert migration.count('true)')==17, '17 approved departments not seeded'
source='\n'.join(p.read_text() for p in (root/'backend/src/main/java').rglob('*.java'))
for invariant in ['PENDING_DEPARTMENTS','PENDING_PRINCIPAL','PRINCIPAL_ACTION_REQUIRED','APPROVED','REOPEN_AUTHORIZED','CERTIFICATES_HANDED_OVER','VERIFICATION ID']:
 if invariant=='VERIFICATION ID':invariant='Verification ID'
 assert invariant in source,invariant
assert 'all.size()!=17' in source
assert 'List.of("printed_form"' in source
assert 'approvalId' in source and 'principalTarget' in source
assert 'render(a,verification)' in source
assert 'helper.addAttachment' in source
assert 'csrfTokenRepository' in source
assert (root/'reference-forms/No_Dues(2).pdf').exists()
assert (root/'reference-forms/Alumni_Registration(1).pdf').exists()
assert (root/'frontend/src/Student.jsx').exists()
assert (root/'frontend/src/Admin.jsx').exists()
print('PASS: 17 department seeds; source invariants; official PDFs; frontend files.')
