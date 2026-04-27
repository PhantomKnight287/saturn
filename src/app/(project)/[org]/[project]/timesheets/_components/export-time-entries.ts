import { format } from 'date-fns'
import * as xlsx from 'xlsx'
import type { TimeEntry } from '../types'

function sanitizeCell(value: string | null | undefined): string {
  if (!value) {
    return ''
  }
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

export function exportTimeEntries(entries: TimeEntry[], fileName: string) {
  const rows = entries.map((e) => ({
    Date: format(new Date(e.date), 'yyyy-MM-dd'),
    Member: sanitizeCell(e.memberName ?? e.memberEmail),
    Description: sanitizeCell(e.description),
    Requirement: sanitizeCell(e.requirementTitle),
    Hours: Number((e.durationMinutes / 60).toFixed(2)),
    Minutes: e.durationMinutes,
    Billable: e.billable ? 'Yes' : 'No',
    Status: e.status,
  }))
  const wb = xlsx.utils.book_new()
  const ws = xlsx.utils.json_to_sheet(rows)
  xlsx.utils.book_append_sheet(wb, ws, 'Time Entries')
  xlsx.writeFile(wb, fileName)
}
