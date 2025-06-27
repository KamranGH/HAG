import {
  users,
  artworks,
  customers,
  orders,
  orderItems,
  contactMessages,
  socialMediaSettings,
  type User,
  type UpsertUser,
  type Artwork,
  type InsertArtwork,
  type Customer,
  type InsertCustomer,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type ContactMessage,
  type InsertContactMessage,
  type SocialMediaSetting,
  type InsertSocialMediaSetting,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Artwork operations
  getAllArtworks(): Promise<Artwork[]>;
  getArtwork(id: number): Promise<Artwork | undefined>;
  createArtwork(artwork: InsertArtwork): Promise<Artwork>;
  updateArtwork(id: number, artwork: Partial<InsertArtwork>): Promise<Artwork>;
  deleteArtwork(id: number): Promise<void>;
  reorderArtworks(artworkIds: number[]): Promise<void>;

  // Customer operations
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderWithItems(id: number): Promise<(Order & { items: (OrderItem & { artwork: Artwork })[] }) | undefined>;
  updateOrderStatus(id: number, status: string): Promise<Order>;
  addOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;

  // Contact operations
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;

  // Social media operations
  getSocialMediaSettings(): Promise<SocialMediaSetting[]>;
  updateSocialMediaSetting(platform: string, setting: Partial<InsertSocialMediaSetting>): Promise<SocialMediaSetting>;
  createOrUpdateSocialMediaSetting(setting: InsertSocialMediaSetting): Promise<SocialMediaSetting>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Artwork operations
  async getAllArtworks(): Promise<Artwork[]> {
    return await db.select().from(artworks).orderBy(artworks.displayOrder, artworks.id);
  }

  async getArtwork(id: number): Promise<Artwork | undefined> {
    const [artwork] = await db.select().from(artworks).where(eq(artworks.id, id));
    return artwork;
  }

  async createArtwork(artworkData: InsertArtwork): Promise<Artwork> {
    const [artwork] = await db.insert(artworks).values(artworkData).returning();
    return artwork;
  }

  async updateArtwork(id: number, artworkData: Partial<InsertArtwork>): Promise<Artwork> {
    const [artwork] = await db
      .update(artworks)
      .set({ ...artworkData, updatedAt: new Date() })
      .where(eq(artworks.id, id))
      .returning();
    return artwork;
  }

  async deleteArtwork(id: number): Promise<void> {
    await db.delete(artworks).where(eq(artworks.id, id));
  }

  async reorderArtworks(artworkIds: number[]): Promise<void> {
    for (let i = 0; i < artworkIds.length; i++) {
      await db
        .update(artworks)
        .set({ displayOrder: i })
        .where(eq(artworks.id, artworkIds[i]));
    }
  }

  // Customer operations
  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(customerData).returning();
    return customer;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer;
  }

  // Order operations
  async createOrder(orderData: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(orderData).returning();
    return order;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrderWithItems(id: number): Promise<(Order & { items: (OrderItem & { artwork: Artwork })[] }) | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const items = await db
      .select()
      .from(orderItems)
      .innerJoin(artworks, eq(orderItems.artworkId, artworks.id))
      .where(eq(orderItems.orderId, id));

    return {
      ...order,
      items: items.map(item => ({
        ...item.order_items,
        artwork: item.artworks,
      })),
    };
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async addOrderItem(orderItemData: InsertOrderItem): Promise<OrderItem> {
    const [orderItem] = await db.insert(orderItems).values(orderItemData).returning();
    return orderItem;
  }

  // Contact operations
  async createContactMessage(messageData: InsertContactMessage): Promise<ContactMessage> {
    const [message] = await db.insert(contactMessages).values(messageData).returning();
    return message;
  }

  // Social media operations
  async getSocialMediaSettings(): Promise<SocialMediaSetting[]> {
    return await db.select().from(socialMediaSettings);
  }

  async updateSocialMediaSetting(platform: string, settingData: Partial<InsertSocialMediaSetting>): Promise<SocialMediaSetting> {
    const [setting] = await db
      .update(socialMediaSettings)
      .set({ ...settingData, updatedAt: new Date() })
      .where(eq(socialMediaSettings.platform, platform))
      .returning();
    return setting;
  }

  async createOrUpdateSocialMediaSetting(settingData: InsertSocialMediaSetting): Promise<SocialMediaSetting> {
    const [setting] = await db
      .insert(socialMediaSettings)
      .values(settingData)
      .onConflictDoUpdate({
        target: socialMediaSettings.platform,
        set: {
          ...settingData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return setting;
  }
}

export const storage = new DatabaseStorage();
