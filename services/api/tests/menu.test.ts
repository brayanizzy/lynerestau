import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { isMenuItemSellable, MenuItemInputSchema, MenuPriceSchema, MenuAvailabilitySchema } from "@lyne/shared";
import { buildApp } from "../src/application.js";
import { readConfig } from "../src/config.js";
import { hashPassword } from "../src/auth/password.js";
import type { MenuRepository } from "../src/menu/repository.js";
import { MemoryRepository } from "./memory-repository.js";

const password = "Menu-Unit-Tests-Only-2026!";
let hash: string; let auth: MemoryRepository; let app: Awaited<ReturnType<typeof buildApp>>;
const items = vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 25 }));
beforeAll(async () => { hash = await hashPassword(password); });
beforeEach(async () => {
  items.mockClear(); auth = new MemoryRepository();
  auth.users.push({ id: "menu-reader", username: "reader", email: null, displayName: "Reader", passwordHash: hash,
    isActive: true, mustChangePassword: false, authVersion: 1, role: { code: "RECEPTION", name: "Réception" }, permissions: ["menu.read"] });
  app = await buildApp({ repository: auth, menuRepository: { items } as unknown as MenuRepository, config: readConfig({ NODE_ENV: "test" }) });
});
afterEach(async () => { await app.close(); });
async function login() {
  const response = await app.inject({ method: "POST", url: "/api/v1/auth/login", headers: { "x-lyne-client": "mobile" }, payload: { identifier: "reader", password } });
  return { authorization: `Bearer ${response.json().data.token}`, "x-lyne-client": "mobile" };
}
describe("catalogue : règles et protection serveur", () => {
  it.each(["-1", "1.001", "1e2", "NaN", "10000000000", "01.50"])("refuse un prix non représentable : %s", value => {
    expect(MenuPriceSchema.safeParse(value).success).toBe(false);
  });
  it("garde les centimes sous forme décimale et refuse les nombres JSON", () => {
    expect(MenuPriceSchema.parse("0.10")).toBe("0.10"); expect(MenuPriceSchema.parse("9999999999.99")).toBe("9999999999.99");
    expect(MenuPriceSchema.safeParse(0.1).success).toBe(false);
  });
  it("exige produit actif, disponible et catégorie active pour être vendable", () => {
    const item = { isActive: true, isAvailable: true, category: { isActive: true } };
    expect(isMenuItemSellable(item)).toBe(true);
    expect(isMenuItemSellable({ ...item, isActive: false })).toBe(false);
    expect(isMenuItemSellable({ ...item, isAvailable: false })).toBe(false);
    expect(isMenuItemSellable({ ...item, category: { isActive: false } })).toBe(false);
  });
  it.each([
    ["POST", "/categories"], ["PATCH", "/categories/test"], ["POST", "/items"], ["PATCH", "/items/test"],
    ["POST", "/items/test/availability"], ["POST", "/items/test/photo"], ["POST", "/items/test/photo/remove"],
  ] as const)("un lecteur ne peut pas écrire : %s %s", async (method, path) => {
    const response = await app.inject({ method, url: `/api/v1/menu${path}`, headers: await login(), payload: {} });
    expect(response.statusCode).toBe(403); expect(items).not.toHaveBeenCalled();
  });
  it("exige une session et permet la consultation autorisée", async () => {
    expect((await app.inject("/api/v1/menu/items")).statusCode).toBe(401);
    expect((await app.inject({ url: "/api/v1/menu/items", headers: await login() })).statusCode).toBe(200);
    expect(items).toHaveBeenCalledOnce();
    expect((await app.inject("/api/v1/capabilities")).statusCode).toBe(401);
    const capabilities = await app.inject({ url: "/api/v1/capabilities", headers: await login() });
    expect(capabilities.json()).toEqual({ ok: true, data: { menu: true } });
  });
  it("refuse les champs de prix dans une modification de disponibilité", () => {
    expect(MenuAvailabilitySchema.safeParse({ version: 1, isAvailable: true, price: "1.00" }).success).toBe(false);
  });
  it("valide et normalise le code sans accepter un chemin de photo client", () => {
    const input = { code: " poulet-1 ", name: "Poulet", categoryId: "cat1", description: null, price: "12.50", isActive: true, isAvailable: true };
    expect(MenuItemInputSchema.parse(input).code).toBe("POULET-1");
    expect(MenuItemInputSchema.safeParse({ ...input, photoKey: "../../.env" }).success).toBe(false);
  });
});
