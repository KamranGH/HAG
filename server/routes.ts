import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertArtworkSchema, insertContactMessageSchema, generateSlug } from "@shared/schema";
import { z } from "zod";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Artwork routes
  app.get("/api/artworks", async (req, res) => {
    try {
      const artworks = await storage.getAllArtworks();
      res.json(artworks);
    } catch (error) {
      console.error("Error fetching artworks:", error);
      res.status(500).json({ message: "Failed to fetch artworks" });
    }
  });

  // Get single artwork by slug or ID
  app.get("/api/artworks/:identifier", async (req, res) => {
    try {
      const identifier = req.params.identifier;
      let artwork;
      
      // Try as ID first (numeric), then as slug
      if (/^\d+$/.test(identifier)) {
        artwork = await storage.getArtwork(parseInt(identifier));
      } else {
        artwork = await storage.getArtworkBySlug(identifier);
      }
      
      if (!artwork) {
        return res.status(404).json({ message: "Artwork not found" });
      }
      res.json(artwork);
    } catch (error) {
      console.error("Error fetching artwork:", error);
      res.status(500).json({ message: "Failed to fetch artwork" });
    }
  });

  app.post("/api/artworks", isAuthenticated, async (req, res) => {
    try {
      const artworkData = insertArtworkSchema.parse(req.body);
      // Generate slug from title
      const slug = generateSlug(artworkData.title);
      const artworkWithSlug = {
        ...artworkData,
        slug,
      };
      const artwork = await storage.createArtwork(artworkWithSlug);
      res.status(201).json(artwork);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid artwork data", errors: error.errors });
      }
      console.error("Error creating artwork:", error);
      res.status(500).json({ message: "Failed to create artwork" });
    }
  });

  app.put("/api/artworks/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const artworkData = insertArtworkSchema.partial().parse(req.body);
      
      // If title is being updated, regenerate slug
      const updateData = { ...artworkData };
      if (artworkData.title) {
        updateData.slug = generateSlug(artworkData.title);
      }
      
      const artwork = await storage.updateArtwork(id, updateData);
      res.json(artwork);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid artwork data", errors: error.errors });
      }
      console.error("Error updating artwork:", error);
      res.status(500).json({ message: "Failed to update artwork" });
    }
  });

  app.delete("/api/artworks/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteArtwork(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting artwork:", error);
      res.status(500).json({ message: "Failed to delete artwork" });
    }
  });

  app.post("/api/artworks/reorder", isAuthenticated, async (req, res) => {
    try {
      const { artworkIds } = req.body;
      if (!Array.isArray(artworkIds)) {
        return res.status(400).json({ message: "artworkIds must be an array" });
      }
      await storage.reorderArtworks(artworkIds);
      res.status(200).json({ message: "Artworks reordered successfully" });
    } catch (error) {
      console.error("Error reordering artworks:", error);
      res.status(500).json({ message: "Failed to reorder artworks" });
    }
  });

  // Contact form route
  app.post("/api/contact", async (req, res) => {
    try {
      const messageData = insertContactMessageSchema.parse(req.body);
      const message = await storage.createContactMessage(messageData);
      res.status(201).json({ message: "Message sent successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      console.error("Error sending contact message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });



  // Stripe payment route for one-time payments
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, customerData } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const paymentIntentData: any = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
      };

      // Add shipping information if provided
      if (customerData) {
        paymentIntentData.shipping = {
          name: `${customerData.firstName} ${customerData.lastName}`,
          address: {
            line1: customerData.address,
            city: customerData.city,
            postal_code: customerData.zipCode,
            country: customerData.country,
          },
        };
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });



  // Order creation and management
  app.post("/api/orders", async (req, res) => {
    try {
      const { customerData, orderItems: items } = req.body;
      
      // Create or get customer
      let customer = await storage.getCustomerByEmail(customerData.email);
      if (!customer) {
        customer = await storage.createCustomer(customerData);
      }

      // Calculate subtotal
      let subtotal = 0;
      for (const item of items) {
        subtotal += item.unitPrice * item.quantity;
      }

      // Calculate shipping (same logic as frontend)
      const hasOriginals = items.some((item: any) => item.type === 'original');
      const shippingCost = subtotal >= 100 ? 0 : (hasOriginals ? 25 : 15);
      const totalAmount = subtotal + shippingCost;

      // Create order
      const order = await storage.createOrder({
        customerId: customer.id,
        subtotalAmount: subtotal.toString(),
        shippingAmount: shippingCost.toString(),
        totalAmount: totalAmount.toString(),
        status: "pending",
      });

      // Add order items
      for (const item of items) {
        await storage.addOrderItem({
          orderId: order.id,
          artworkId: item.artworkId,
          type: item.type,
          printSize: item.printSize,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          totalPrice: (item.unitPrice * item.quantity).toString(),
        });
      }

      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrderWithItems(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { stripePaymentIntentId } = req.body;
      
      // Update order status and payment intent ID
      const order = await storage.updateOrderStatus(id, "completed");
      
      res.json(order);
    } catch (error) {
      console.error("Error completing order:", error);
      res.status(500).json({ message: "Failed to complete order" });
    }
  });

  // Contact form submission
  app.post("/api/contact", async (req, res) => {
    try {
      const messageData = insertContactMessageSchema.parse(req.body);
      const message = await storage.createContactMessage(messageData);
      res.json(message);
    } catch (error: any) {
      console.error("Error creating contact message:", error);
      res.status(500).json({ 
        message: "Failed to send message",
        error: error.message 
      });
    }
  });

  // Social media settings routes
  app.get("/api/social-media", async (req, res) => {
    try {
      const settings = await storage.getSocialMediaSettings();
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching social media settings:", error);
      res.status(500).json({ message: "Failed to fetch social media settings" });
    }
  });

  app.put("/api/social-media/:platform", isAuthenticated, async (req, res) => {
    try {
      const { platform } = req.params;
      const settingData = req.body;
      
      // Try to update first, then create if doesn't exist
      try {
        const setting = await storage.updateSocialMediaSetting(platform, settingData);
        res.json(setting);
      } catch (updateError) {
        // If update fails, create new setting
        const setting = await storage.createOrUpdateSocialMediaSetting({
          platform,
          ...settingData,
        });
        res.json(setting);
      }
    } catch (error: any) {
      console.error("Error updating social media setting:", error);
      res.status(500).json({ message: "Failed to update social media setting" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
