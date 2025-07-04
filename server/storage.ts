import {
  users,
  artworks,
  customers,
  orders,
  orderItems,
  contactMessages,
  socialMediaSettings,
  newsletterSubscriptions,
  generateSlug,
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
  type NewsletterSubscription,
  type InsertNewsletterSubscription,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Artwork operations
  getAllArtworks(): Promise<Artwork[]>;
  getArtwork(id: number): Promise<Artwork | undefined>;
  getArtworkBySlug(slug: string): Promise<Artwork | undefined>;
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
  deleteOrder(id: number): Promise<void>;

  // Contact operations
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getAllContactMessages(): Promise<ContactMessage[]>;
  deleteContactMessage(id: number): Promise<void>;

  // Newsletter operations
  subscribeToNewsletter(email: string): Promise<NewsletterSubscription>;
  getAllNewsletterSubscriptions(): Promise<NewsletterSubscription[]>;
  unsubscribeFromNewsletter(email: string): Promise<void>;

  // Enhanced order operations
  getAllOrders(): Promise<(Order & { customer: Customer, itemCount: number })[]>;
  getAllOrdersWithItems(): Promise<(Order & { customer: Customer, items: (OrderItem & { artwork: Artwork })[] })[]>;

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

  async getArtworkBySlug(slug: string): Promise<Artwork | undefined> {
    const [artwork] = await db.select().from(artworks).where(eq(artworks.slug, slug));
    return artwork;
  }

  async createArtwork(artworkData: InsertArtwork): Promise<Artwork> {
    // Generate slug from title if not provided
    let slug = artworkData.slug || generateSlug(artworkData.title);
    
    // Ensure slug uniqueness
    let counter = 1;
    let finalSlug = slug;
    while (true) {
      const existing = await this.getArtworkBySlug(finalSlug);
      if (!existing) break;
      finalSlug = `${slug}-${counter}`;
      counter++;
    }
    
    const [artwork] = await db
      .insert(artworks)
      .values({ ...artworkData, slug: finalSlug })
      .returning();
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

  async getAllContactMessages(): Promise<ContactMessage[]> {
    return await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  // Newsletter operations
  async subscribeToNewsletter(email: string): Promise<NewsletterSubscription> {
    const [subscription] = await db
      .insert(newsletterSubscriptions)
      .values({ email })
      .onConflictDoNothing()
      .returning();
    return subscription;
  }

  async getAllNewsletterSubscriptions(): Promise<NewsletterSubscription[]> {
    return await db.select().from(newsletterSubscriptions)
      .orderBy(desc(newsletterSubscriptions.subscribedAt));
  }

  async unsubscribeFromNewsletter(email: string): Promise<void> {
    await db
      .delete(newsletterSubscriptions)
      .where(eq(newsletterSubscriptions.email, email));
  }

  // Enhanced order operations
  async getAllOrders(): Promise<(Order & { customer: Customer, itemCount: number })[]> {
    const ordersWithCustomers = await db
      .select({
        id: orders.id,
        customerId: orders.customerId,
        totalAmount: orders.totalAmount,
        shippingCost: orders.shippingCost,
        subtotal: orders.subtotal,
        status: orders.status,
        paymentIntentId: orders.paymentIntentId,
        specialInstructions: orders.specialInstructions,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerEmail: customers.email,
        customerIdField: customers.id,
        customerPhone: customers.phone,
        customerAddress: customers.address,
        customerCity: customers.city,
        customerZipCode: customers.zipCode,
        customerCountry: customers.country,
        customerCreatedAt: customers.createdAt,
        customerUpdatedAt: customers.updatedAt,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(desc(orders.createdAt));

    // Get item counts for each order
    const ordersWithItemCounts = await Promise.all(
      ordersWithCustomers.map(async (orderData) => {
        const itemCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(orderItems)
          .where(eq(orderItems.orderId, orderData.id));
        
        return {
          id: orderData.id,
          customerId: orderData.customerId,
          totalAmount: orderData.totalAmount,
          shippingCost: orderData.shippingCost,
          subtotal: orderData.subtotal,
          status: orderData.status,
          paymentIntentId: orderData.paymentIntentId,
          specialInstructions: orderData.specialInstructions,
          createdAt: orderData.createdAt,
          updatedAt: orderData.updatedAt,
          customer: {
            id: orderData.customerIdField,
            firstName: orderData.customerFirstName,
            lastName: orderData.customerLastName,
            email: orderData.customerEmail,
            phone: orderData.customerPhone,
            address: orderData.customerAddress,
            city: orderData.customerCity,
            zipCode: orderData.customerZipCode,
            country: orderData.customerCountry,
            createdAt: orderData.customerCreatedAt,
            updatedAt: orderData.customerUpdatedAt,
          },
          itemCount: itemCount[0]?.count || 0,
        };
      })
    );

    return ordersWithItemCounts;
  }

  async getAllOrdersWithItems(): Promise<(Order & { customer: Customer, items: (OrderItem & { artwork: Artwork })[] })[]> {
    const ordersWithCustomers = await db
      .select({
        id: orders.id,
        customerId: orders.customerId,
        totalAmount: orders.totalAmount,
        shippingCost: orders.shippingCost,
        subtotal: orders.subtotal,
        status: orders.status,
        paymentIntentId: orders.paymentIntentId,
        specialInstructions: orders.specialInstructions,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerEmail: customers.email,
        customerIdField: customers.id,
        customerPhone: customers.phone,
        customerAddress: customers.address,
        customerCity: customers.city,
        customerZipCode: customers.zipCode,
        customerCountry: customers.country,
        customerCreatedAt: customers.createdAt,
        customerUpdatedAt: customers.updatedAt,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(desc(orders.createdAt));

    // Get items for each order
    const ordersWithItems = await Promise.all(
      ordersWithCustomers.map(async (orderData) => {
        const items = await db
          .select({
            id: orderItems.id,
            orderId: orderItems.orderId,
            artworkId: orderItems.artworkId,
            type: orderItems.type,
            printSize: orderItems.printSize,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            totalPrice: orderItems.totalPrice,

            artworkTitle: artworks.title,
            artworkSlug: artworks.slug,
            artworkImages: artworks.images,
            artworkOriginalPrice: artworks.originalPrice,
            artworkPrintOptions: artworks.printOptions,
            artworkDescription: artworks.description,
            artworkOriginalSold: artworks.originalSold,
            artworkDisplayOrder: artworks.displayOrder,
            artworkCreatedAt: artworks.createdAt,
            artworkUpdatedAt: artworks.updatedAt,
            artworkId2: artworks.id,
          })
          .from(orderItems)
          .innerJoin(artworks, eq(orderItems.artworkId, artworks.id))
          .where(eq(orderItems.orderId, orderData.id));
        
        return {
          id: orderData.id,
          customerId: orderData.customerId,
          totalAmount: orderData.totalAmount,
          shippingCost: orderData.shippingCost,
          subtotal: orderData.subtotal,
          status: orderData.status,
          paymentIntentId: orderData.paymentIntentId,
          specialInstructions: orderData.specialInstructions,
          createdAt: orderData.createdAt,
          updatedAt: orderData.updatedAt,
          customer: {
            id: orderData.customerIdField,
            firstName: orderData.customerFirstName,
            lastName: orderData.customerLastName,
            email: orderData.customerEmail,
            phone: orderData.customerPhone,
            address: orderData.customerAddress,
            city: orderData.customerCity,
            zipCode: orderData.customerZipCode,
            country: orderData.customerCountry,
            createdAt: orderData.customerCreatedAt,
            updatedAt: orderData.customerUpdatedAt,
          },
          items: items.map(item => ({
            id: item.id,
            orderId: item.orderId,
            artworkId: item.artworkId,
            type: item.type,
            printSize: item.printSize,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            artwork: {
              id: item.artworkId2,
              title: item.artworkTitle,
              slug: item.artworkSlug,
              images: item.artworkImages,
              description: item.artworkDescription,
              originalPrice: item.artworkOriginalPrice,
              originalAvailable: true,
              originalSold: item.artworkOriginalSold,
              printOptions: item.artworkPrintOptions,
              displayOrder: item.artworkDisplayOrder,
              createdAt: item.artworkCreatedAt,
              updatedAt: item.artworkUpdatedAt,
            }
          }))
        };
      })
    );

    return ordersWithItems;
  }

  async deleteContactMessage(id: number): Promise<void> {
    await db.delete(contactMessages).where(eq(contactMessages.id, id));
  }

  // Social media operations
  async getSocialMediaSettings(): Promise<SocialMediaSetting[]> {
    return await db.select().from(socialMediaSettings);
  }

  async updateSocialMediaSetting(platform: string, settingData: Partial<InsertSocialMediaSetting>): Promise<SocialMediaSetting> {
    const [setting] = await db
      .update(socialMediaSettings)
      .set(settingData)
      .where(eq(socialMediaSettings.platform, platform))
      .returning();
    return setting;
  }

  async createOrUpdateSocialMediaSetting(settingData: InsertSocialMediaSetting): Promise<SocialMediaSetting> {
    const { platform, url, isEnabled } = settingData;
    const [setting] = await db
      .insert(socialMediaSettings)
      .values({ platform, url, isEnabled })
      .onConflictDoUpdate({
        target: socialMediaSettings.platform,
        set: { url, isEnabled }, // Only update the fields we want, not timestamps
      })
      .returning();
    return setting;
  }

  async deleteOrder(id: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      // First delete the order items
      await tx.delete(orderItems).where(eq(orderItems.orderId, id));
      
      // Then delete the order
      await tx.delete(orders).where(eq(orders.id, id));
    });
  }
}

export const storage = new DatabaseStorage();
