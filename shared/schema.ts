import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Artwork table
export const artworks = pgTable("artworks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  year: integer("year").notNull(),
  medium: varchar("medium", { length: 255 }).notNull(),
  originalDimensions: varchar("original_dimensions", { length: 100 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  originalAvailable: boolean("original_available").default(true),
  originalSold: boolean("original_sold").default(false),
  printsAvailable: boolean("prints_available").default(true),
  printOptions: jsonb("print_options").$type<PrintOption[]>().default([]),
  images: text("images").array().default([]),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer table for order management
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  zipCode: varchar("zip_code", { length: 20 }),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  subtotalAmount: decimal("subtotal_amount", { precision: 10, scale: 2 }).notNull(),
  shippingAmount: decimal("shipping_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("usd"),
  paymentMethod: varchar("payment_method", { length: 50 }).default("stripe"),
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order items table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  artworkId: integer("artwork_id").references(() => artworks.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'original' or 'print'
  printSize: varchar("print_size", { length: 100 }),
  quantity: integer("quantity").default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

// Contact messages table
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Social media settings table
export const socialMediaSettings = pgTable("social_media_settings", {
  id: serial("id").primaryKey(),
  platform: varchar("platform", { length: 50 }).notNull().unique(), // 'instagram', 'facebook', 'x'
  url: varchar("url", { length: 500 }),
  isVisible: boolean("is_visible").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  customers: many(customers),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const artworksRelations = relations(artworks, ({ many }) => ({
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  artwork: one(artworks, {
    fields: [orderItems.artworkId],
    references: [artworks.id],
  }),
}));

// Types
export type PrintOption = {
  size: string;
  price: number;
};

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertArtwork = typeof artworks.$inferInsert;
export type Artwork = typeof artworks.$inferSelect;

export type InsertCustomer = typeof customers.$inferInsert;
export type Customer = typeof customers.$inferSelect;

export type InsertOrder = typeof orders.$inferInsert;
export type Order = typeof orders.$inferSelect;

export type InsertOrderItem = typeof orderItems.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;

export type InsertContactMessage = typeof contactMessages.$inferInsert;
export type ContactMessage = typeof contactMessages.$inferSelect;

export type InsertSocialMediaSetting = typeof socialMediaSettings.$inferInsert;
export type SocialMediaSetting = typeof socialMediaSettings.$inferSelect;

// Schemas for validation
export const insertArtworkSchema = createInsertSchema(artworks).omit({
  id: true,
  slug: true, // Auto-generated on server
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
});

export const insertSocialMediaSettingSchema = createInsertSchema(socialMediaSettings).omit({
  id: true,
  updatedAt: true,
});

// Utility function to generate URL-friendly slugs
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with single hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
