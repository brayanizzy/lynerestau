import { isMenuItemSellable, type MenuCategoryInput, type MenuCategoryUpdate, type MenuItem, type MenuItemInput, type MenuItemUpdate, type MenuQuery, type Pagination } from "@lyne/shared";
import type { PrismaClient, Prisma } from "../generated/prisma/client.js";
import type { Actor } from "../admin/types.js";
import { authorizeWrite } from "../admin/repository.js";
import { requireVersion } from "../admin/rules.js";
import { failure } from "../errors.js";

const include = { category: true } as const;
type Row = Prisma.MenuItemGetPayload<{ include: typeof include }>;
function view(row: Row): MenuItem {
  return { id: row.id, code: row.code, name: row.name, categoryId: row.categoryId,
    description: row.description, price: row.price.toFixed(2), isActive: row.isActive,
    isAvailable: row.isAvailable, version: row.version,
    category: { id: row.category.id, name: row.category.name, isActive: row.category.isActive, version: row.category.version },
    photoUrl: row.photoKey ? `/api/v1/menu/items/${row.id}/photo?v=${row.version}` : null,
    sellable: isMenuItemSellable(row), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
const categorySelect = { id: true, name: true, isActive: true, version: true } as const;
async function find(tx: PrismaClient | Prisma.TransactionClient, id: string) {
  const item = await tx.menuItem.findUnique({ where: { id }, include });
  if (!item) failure(404, "MENU_ITEM_NOT_FOUND", "Produit introuvable.");
  return item;
}
function audit(tx: Prisma.TransactionClient, actor: Actor, action: string, objectId: string, metadata: Prisma.InputJsonObject = {}) {
  return tx.auditLog.create({ data: { userId: actor.id, ipAddress: actor.ipAddress, module: "menu", action, objectId, metadata } });
}
export function createMenuRepository(db: PrismaClient) {
  async function write<T>(actor: Actor, permission: string, action: (tx: Prisma.TransactionClient) => Promise<T>) {
    try {
      return await db.$transaction(async tx => {
        await authorizeWrite(tx, actor, permission);
        return action(tx);
      }, { maxWait: 10000, timeout: 15000 });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      if (code === "P2002") failure(409, "ALREADY_EXISTS", "Ce code produit ou ce nom de catégorie existe déjà.");
      if (code === "P2003" || code === "P2034") failure(409, "CONCURRENT_CHANGE", "Une référence a changé. Actualisez puis réessayez.");
      throw error;
    }
  }
  return {
    categories() { return db.menuCategory.findMany({ select: categorySelect, orderBy: [{ name: "asc" }, { id: "asc" }] }); },
    saveCategory(actor: Actor, input: MenuCategoryInput | MenuCategoryUpdate, id?: string) {
      return write(actor, "menu.write", async tx => {
        const previous = id ? await tx.menuCategory.findUnique({ where: { id } }) : null;
        if (id && !previous) failure(404, "CATEGORY_NOT_FOUND", "Catégorie introuvable.");
        if (previous) requireVersion(previous.version, "version" in input ? input.version : undefined);
        const data = { name: input.name, isActive: input.isActive };
        const row = id ? await tx.menuCategory.update({ where: { id }, data: { ...data, version: { increment: 1 } }, select: categorySelect }) :
          await tx.menuCategory.create({ data, select: categorySelect });
        await audit(tx, actor, id ? "menu.category.updated" : "menu.category.created", row.id,
          { name: row.name, isActive: row.isActive, previousName: previous?.name ?? null, previousActive: previous?.isActive ?? null });
        return row;
      });
    },
    async items(query: MenuQuery) {
      const sellable = { isActive: true, isAvailable: true, category: { isActive: true } };
      const where: Prisma.MenuItemWhereInput = {
        ...(query.search ? { OR: [{ name: { contains: query.search } }, { code: { contains: query.search } }] } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.status !== "all" ? { isActive: query.status === "active" } : {}),
        ...(query.availability === "available" ? { AND: [sellable] } : query.availability === "unavailable" ? { NOT: sellable } : {}),
      };
      const [rows, total] = await db.$transaction([
        db.menuItem.findMany({ where, include, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
        db.menuItem.count({ where }),
      ]);
      return { items: rows.map(view), total, page: query.page, pageSize: query.pageSize };
    },
    async item(id: string) { return view(await find(db, id)); },
    saveItem(actor: Actor, input: MenuItemInput | MenuItemUpdate, id?: string) {
      return write(actor, "menu.write", async tx => {
        const previous = id ? await find(tx, id) : undefined;
        if (previous) requireVersion(previous.version, "version" in input ? input.version : undefined);
        const category = await tx.menuCategory.findUnique({ where: { id: input.categoryId } });
        if (!category || (!category.isActive && previous?.categoryId !== input.categoryId))
          failure(400, "INVALID_CATEGORY", "Sélectionnez une catégorie active.");
        const data = { code: input.code, name: input.name, categoryId: input.categoryId, description: input.description,
          price: input.price, isActive: input.isActive, isAvailable: input.isAvailable };
        const row = id ? await tx.menuItem.update({ where: { id }, data: { ...data, version: { increment: 1 } }, include }) :
          await tx.menuItem.create({ data, include });
        const priceChanged = !previous || !previous.price.equals(row.price);
        if (priceChanged) {
          await tx.menuPriceHistory.create({ data: { itemId: row.id, actorId: actor.id, previousPrice: previous?.price ?? null, price: row.price } });
          await audit(tx, actor, "menu.price.changed", row.id, { previousPrice: previous?.price.toFixed(2) ?? null, price: row.price.toFixed(2), currency: "USD" });
        }
        await audit(tx, actor, id ? "menu.item.updated" : "menu.item.created", row.id, {
          code: row.code, name: row.name, categoryId: row.categoryId, isActive: row.isActive, isAvailable: row.isAvailable,
          previousActive: previous?.isActive ?? null, previousAvailable: previous?.isAvailable ?? null, version: row.version,
        });
        return view(row);
      });
    },
    setAvailability(actor: Actor, id: string, version: number, isAvailable: boolean) {
      return write(actor, "menu.availability", async tx => {
        const previous = await find(tx, id); requireVersion(previous.version, version);
        const row = await tx.menuItem.update({ where: { id }, data: { isAvailable, version: { increment: 1 } }, include });
        await audit(tx, actor, "menu.availability.changed", id, { previous: previous.isAvailable, isAvailable });
        return view(row);
      });
    },
    setPhoto(actor: Actor, id: string, version: number, photoKey: string | null) {
      return write(actor, "menu.write", async tx => {
        requireVersion((await find(tx, id)).version, version);
        const row = await tx.menuItem.update({ where: { id }, data: { photoKey, version: { increment: 1 } }, include });
        await audit(tx, actor, photoKey ? "menu.photo.updated" : "menu.photo.removed", id);
        return view(row);
      });
    },
    async photoKey(id: string) { return (await find(db, id)).photoKey; },
    async prices(id: string, query: Pagination) {
      await find(db, id);
      const where = { itemId: id };
      const [rows, total] = await db.$transaction([
        db.menuPriceHistory.findMany({ where, include: { actor: { select: { id: true, displayName: true } } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
        db.menuPriceHistory.count({ where }),
      ]);
      return { items: rows.map(row => ({ id: row.id, previousPrice: row.previousPrice?.toFixed(2) ?? null,
        price: row.price.toFixed(2), createdAt: row.createdAt.toISOString(), actor: row.actor })), total, ...query };
    },
  };
}
export type MenuRepository = ReturnType<typeof createMenuRepository>;
