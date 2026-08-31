function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

interface Entry {
  date: number; // days ago
  person: string;
  project: string;
  task: string;
  description: string;
  status: string;
  priority: string;
  due: number; // negative = days from now, positive = days ago
  notes: string;
}

const ENTRIES: Entry[] = [
  { date: 1, person: 'Rahul', project: 'Fino', task: 'Reconcile ledger entries', description: 'Matched Fino Q3 ledger entries against bank statements, found 2 mismatches flagged to finance.', status: 'Completed', priority: 'High', due: 1, notes: 'Mismatch report shared in email.' },
  { date: 1, person: 'Priya', project: 'MCA', task: 'File annual return draft', description: 'Prepared draft of MCA annual return, pending director signature before submission.', status: 'Pending', priority: 'High', due: 0, notes: 'Waiting on signature from director.' },
  { date: 1, person: 'Ankit', project: 'BPCL', task: 'Vendor invoice verification', description: 'Verified 14 of 20 BPCL vendor invoices for the month; remaining 6 held up due to missing PO numbers.', status: 'In Progress', priority: 'Medium', due: -1, notes: 'Chase procurement for PO numbers.' },
  { date: 1, person: 'Sneha', project: 'Zenith Corp', task: 'Draft compliance checklist', description: 'Completed the FY26 compliance checklist for Zenith Corp and sent for internal review.', status: 'Completed', priority: 'Medium', due: 1, notes: '' },
  { date: 1, person: 'Vikram', project: 'Apex Logistics', task: 'GST filing prep', description: 'Collected GST input data from Apex Logistics; return not yet filed.', status: 'Pending', priority: 'High', due: 0, notes: 'Client yet to share final invoices.' },
  { date: 1, person: 'Rahul', project: 'BPCL', task: 'Follow up on TDS query', description: 'Sent follow-up to BPCL finance team regarding a TDS mismatch raised last week; no response yet.', status: 'Pending', priority: 'Low', due: -2, notes: '' },
  { date: 2, person: 'Priya', project: 'Fino', task: 'Board minutes drafting', description: 'Drafted minutes for Fino board meeting held on the 24th.', status: 'Completed', priority: 'Medium', due: 2, notes: 'Awaiting sign-off.' },
  { date: 2, person: 'Ankit', project: 'MCA', task: 'ROC form correction', description: 'Corrected errors in MCA ROC form flagged during pre-check.', status: 'Completed', priority: 'High', due: 3, notes: '' },
  { date: 3, person: 'Sneha', project: 'BPCL', task: 'Quarterly TDS reconciliation', description: 'Reconciled BPCL quarterly TDS figures against 26AS; small variance under review.', status: 'Pending', priority: 'High', due: 1, notes: 'Variance of ₹4,200, checking source.' },
  { date: 4, person: 'Vikram', project: 'Zenith Corp', task: 'Statutory audit prep', description: 'Started collating documents for Zenith Corp statutory audit.', status: 'In Progress', priority: 'Medium', due: -3, notes: '' },
  { date: 0, person: 'Rahul', project: 'Fino', task: 'Client call — Q3 review', description: 'Scheduled call with Fino finance head to review Q3 numbers and mismatch resolution.', status: 'Pending', priority: 'High', due: 0, notes: 'Call at 4 PM.' },
  { date: 0, person: 'Priya', project: 'MCA', task: 'Get director signature', description: 'Following up with director to get signature on annual return before EOD.', status: 'Pending', priority: 'High', due: 0, notes: '' },
  { date: 0, person: 'Ankit', project: 'BPCL', task: 'Close remaining invoices', description: 'Chase procurement team for missing PO numbers on 6 pending invoices.', status: 'Pending', priority: 'Medium', due: 0, notes: '' },
  { date: 0, person: 'Sneha', project: 'Zenith Corp', task: 'Send checklist for sign-off', description: 'Share reviewed compliance checklist with Zenith Corp client contact.', status: 'Pending', priority: 'Low', due: -1, notes: '' },
  { date: 5, person: 'Vikram', project: 'Apex Logistics', task: 'GST return — August', description: 'August GST return for Apex Logistics filed successfully.', status: 'Completed', priority: 'High', due: 5, notes: 'Acknowledgement received.' },
  { date: 6, person: 'Rahul', project: 'MCA', task: 'DIN KYC filing', description: 'Filed DIN KYC for two directors ahead of deadline.', status: 'Completed', priority: 'Medium', due: 6, notes: '' },
  { date: 7, person: 'Priya', project: 'BPCL', task: 'Vendor master cleanup', description: 'Cleaned up duplicate vendor entries in BPCL vendor master.', status: 'Completed', priority: 'Low', due: 7, notes: '' },
  { date: 2, person: 'Ankit', project: 'Fino', task: 'Fixed asset register update', description: 'Updated Fino fixed asset register with new equipment purchases; pending finance approval to close.', status: 'Pending', priority: 'Medium', due: 1, notes: 'Overdue — chase finance for approval.' },
  { date: 3, person: 'Sneha', project: 'MCA', task: 'Form ADT-1 filing', description: 'Form ADT-1 for auditor appointment is drafted but not yet filed.', status: 'Pending', priority: 'High', due: 0, notes: '' },
];

/**
 * Returns dummy rows shaped exactly like a real sheet export (header row
 * implied by object keys). Used automatically until real Google Sheets
 * credentials are added to .env.local — see lib/sheets.ts.
 */
export function getMockRows(): Record<string, string>[] {
  return ENTRIES.map((e) => ({
    Date: e.date >= 0 ? daysAgo(e.date) : daysFromNow(-e.date),
    Person: e.person,
    Project: e.project,
    Task: e.task,
    Description: e.description,
    Status: e.status,
    Priority: e.priority,
    'Due Date': e.due >= 0 ? daysAgo(e.due) : daysFromNow(-e.due),
    Notes: e.notes,
    'Last Updated': e.date >= 0 ? daysAgo(e.date) : daysFromNow(-e.date),
  }));
}
