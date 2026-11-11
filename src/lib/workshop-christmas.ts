/** Calendar dates are evaluated in Colombia and passed from server to client. */
export function isWorkshopChristmasSeason(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Bogota',month:'numeric',day:'numeric'}).formatToParts(date);
  const month=Number(parts.find(p=>p.type==='month')?.value),day=Number(parts.find(p=>p.type==='day')?.value);
  return month===11 || month===12 || (month===1 && day<=6);
}
