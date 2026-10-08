import type { Employee, EmployeeInput, SessionUser, StaffCard } from "@lyne/shared";

export const newEmployee: EmployeeInput = { staffNumber: "", fullName: "", gender: null, phone: null, address: null, hiredAt: null, status: "ACTIVE", notes: null, departmentId: null, jobTitleId: null };
export function employeeDraft(employee: Employee | null, permissions: SessionUser["permissions"]): EmployeeInput {
  const base = employee ? { staffNumber: employee.staffNumber, fullName: employee.fullName, gender: employee.gender, phone: employee.phone, address: employee.address,
    hiredAt: employee.hiredAt, status: employee.status, notes: employee.notes, departmentId: employee.departmentId, jobTitleId: employee.jobTitleId } : { ...newEmployee };
  return { ...base, ...(permissions.includes("employees.salary") ? { salary: employee?.salary ?? null } : {}),
    ...(permissions.includes("users.write") && permissions.includes("users.read") ? { userId: employee?.userId ?? null } : {}) };
}
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
function image(value: string) {
  if (!/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error("Image de carte invalide.");
  return value;
}
export function staffCardHtml(card: StaffCard, logo: string, photo: string | null) {
  if (card.archived || card.status !== "ACTIVE") throw new Error("La carte est réservée aux employés actifs.");
  if (card.photoUrl && !photo) throw new Error("Chargez la photo avant d’imprimer.");
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Carte de service LYNE</title><style>
  @page { size:A4; margin:10mm } * { box-sizing:border-box } body { margin:0; font-family:Arial,sans-serif; color:#171717 }
  article { width:85.6mm; height:54mm; border:.4mm solid #b40712; border-radius:3mm; padding:3mm; overflow:hidden; break-inside:avoid }
  header { display:flex; align-items:center; justify-content:space-between; color:#b40712; font-size:9pt; font-weight:bold } header img { width:14mm; height:14mm; object-fit:contain }
  section { display:flex; align-items:center; gap:3mm; height:29mm } .photo { width:21mm; height:26mm; object-fit:cover; background:#f4eeee; flex-shrink:0 }
  strong { display:block; font-size:11pt; overflow-wrap:anywhere } p { margin:1mm 0; font-size:8pt; overflow-wrap:anywhere } b { font-size:9pt; color:#b40712 }
  footer { font-size:6pt; color:#555; margin-top:1mm }</style></head><body><article>
  <header><img src="${image(logo)}" alt="LYNE Restaurant"><span>CARTE DE SERVICE</span></header><section>
  ${photo ? `<img class="photo" src="${image(photo)}" alt="Photo">` : '<div class="photo">LYNE</div>'}<div><strong>${escape(card.fullName)}</strong>
  <p>${escape(card.jobTitle ?? "Équipe LYNE")}</p><p>${escape(card.department ?? "")}</p><b>${escape(card.staffNumber)}</b></div></section>
  <footer>DOCUMENT INTERNE · PERSONNEL AUTORISÉ</footer></article></body></html>`;
}
