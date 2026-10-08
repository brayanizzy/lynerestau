import { z } from "zod";
import { PaginationSchema } from "./pagination.js";
import { RecordIdSchema, VersionSchema } from "./personnel.js";

// Decimal strings cross the wire; money is never stored as FLOAT.
export const MenuPriceSchema = z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, "Prix USD invalide (deux décimales maximum)");
export const MenuCategoryInputSchema = z.strictObject({ name: z.string().trim().min(2).max(100), isActive: z.boolean() });
export const MenuCategoryUpdateSchema = MenuCategoryInputSchema.extend({ version: VersionSchema });
export const MenuItemInputSchema = z.strictObject({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9._-]{0,29}$/),
  name: z.string().trim().min(2).max(150), categoryId: RecordIdSchema,
  description: z.string().trim().max(2000).nullable(), price: MenuPriceSchema,
  isActive: z.boolean(), isAvailable: z.boolean(),
});
export const MenuItemUpdateSchema = MenuItemInputSchema.extend({ version: VersionSchema });
export const MenuAvailabilitySchema = z.strictObject({ version: VersionSchema, isAvailable: z.boolean() });
export const MenuQuerySchema = PaginationSchema.extend({
  search: z.string().trim().max(100).default(""), categoryId: RecordIdSchema.optional(),
  status: z.enum(["active", "inactive", "all"]).default("active"),
  availability: z.enum(["available", "unavailable", "all"]).default("all"),
});
export type MenuItemInput = z.infer<typeof MenuItemInputSchema>;
export type MenuItemUpdate = z.infer<typeof MenuItemUpdateSchema>;
export type MenuCategoryInput = z.infer<typeof MenuCategoryInputSchema>;
export type MenuCategoryUpdate = z.infer<typeof MenuCategoryUpdateSchema>;
export type MenuQuery = z.infer<typeof MenuQuerySchema>;
export interface MenuCategory { id: string; name: string; isActive: boolean; version: number }
export interface MenuItem extends MenuItemInput {
  id: string; version: number; category: MenuCategory; photoUrl: string | null;
  sellable: boolean; createdAt: string; updatedAt: string;
}
export interface MenuPriceHistory {
  id: string; previousPrice: string | null; price: string; createdAt: string;
  actor: { id: string; displayName: string };
}
export function isMenuItemSellable(item: { isActive: boolean; isAvailable: boolean; category: { isActive: boolean } }) {
  return item.isActive && item.isAvailable && item.category.isActive;
}
