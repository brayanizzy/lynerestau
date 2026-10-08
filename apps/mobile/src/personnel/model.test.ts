import { describe, expect, it } from "vitest";
import type { Employee, StaffCard } from "@lyne/shared";
import { employeeDraft, staffCardHtml } from "./model";
const employee = { id: "employee1", staffNumber: "LY-1", fullName: "Alice", gender: null, phone: "private-phone", address: "private-address", hiredAt: null, status: "ACTIVE", notes: "private-note", departmentId: null, jobTitleId: null, userId: "user1", salary: "900.50" } as Employee;
const card: StaffCard = { id: "employee1", staffNumber: "LY-1", fullName: 'Alice <script>alert("x")</script>', jobTitle: "Cuisine & service", department: null, photoUrl: null, status: "ACTIVE", archived: false };
const logo = "data:image/png;base64,YWJj";
describe("personnel mobile", () => {
  it("omet les champs privilégiés d’une mise à jour sans permission", () => {
    const draft = employeeDraft(employee, ["employees.read", "employees.write"]);
    expect(draft).not.toHaveProperty("salary"); expect(draft).not.toHaveProperty("userId"); expect(draft).not.toHaveProperty("id");
    expect(employeeDraft(employee, ["employees.salary", "users.read", "users.write"])).toMatchObject({ salary: "900.50", userId: "user1" });
    expect(employeeDraft(employee, ["users.read"])).not.toHaveProperty("userId");
  });
  it("échappe les données et imprime uniquement les informations de la carte", () => {
    const html = staffCardHtml({ ...employee, ...card }, logo, null);
    expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>"); expect(html).toContain("Cuisine &amp; service");
    for (const secret of ["900.50", "private-phone", "private-address", "private-note"]) expect(html).not.toContain(secret);
    expect(html).toContain("width:85.6mm; height:54mm");
  });
  it("refuse une carte inactive, archivée ou une photo manquante", () => {
    expect(() => staffCardHtml({ ...card, status: "ON_LEAVE" }, logo, null)).toThrow("actifs");
    expect(() => staffCardHtml({ ...card, archived: true }, logo, null)).toThrow("actifs");
    expect(() => staffCardHtml({ ...card, photoUrl: "/api/v1/employees/employee1/photo?v=2" }, logo, null)).toThrow("photo");
    expect(() => staffCardHtml(card, 'https://remote.invalid/image', null)).toThrow("Image");
    expect(() => staffCardHtml(card, logo, 'data:image/svg+xml;base64,YWJj')).toThrow("Image");
  });
});
