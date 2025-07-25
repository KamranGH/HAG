# replit.md

## Overview

This is a complete, production-quality online art gallery application that precisely replicates the sophisticated dark-themed design you requested. The application features small rectangular artwork cards with 2:3 aspect ratio, showcasing and selling artwork with full e-commerce functionality including Stripe payment integration. Includes administrative functionality for artwork management and a beautiful, modern user interface with elegant typography and micro-interactions.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state
- **UI Framework**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom dark navy theme
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Neon serverless database
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with session-based authentication
- **Payment Processing**: Stripe for handling transactions

### Key Components

1. **Authentication System**
   - Replit OpenID Connect integration
   - Session-based authentication using PostgreSQL sessions
   - User management with profile data storage

2. **Artwork Management**
   - CRUD operations for artwork catalog
   - Support for multiple images per artwork
   - Original and print availability tracking
   - Flexible print options with size and pricing variations

3. **E-commerce Features**
   - Shopping cart functionality (localStorage-based)
   - Stripe payment integration
   - Order management system
   - Customer data collection and storage

4. **Administrative Interface**
   - Artwork creation and management for authenticated users
   - Image upload capabilities
   - Print option configuration

## Data Flow

1. **User Authentication**: Users authenticate via Replit Auth, sessions stored in PostgreSQL
2. **Artwork Browsing**: Gallery data fetched from database and displayed in responsive grid
3. **Cart Management**: Items stored in localStorage, synchronized during checkout
4. **Payment Processing**: Stripe handles secure payment processing
5. **Order Completion**: Order data persisted to database with customer information

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **@stripe/stripe-js & @stripe/react-stripe-js**: Payment processing
- **@tanstack/react-query**: Server state management
- **drizzle-orm**: Type-safe database operations
- **react-hook-form**: Form handling and validation
- **zod**: Schema validation

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **wouter**: Lightweight client-side routing

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type safety
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with PostgreSQL 16
- **Development Server**: Vite dev server on port 5000
- **Database**: Neon serverless PostgreSQL
- **Session Storage**: PostgreSQL-based session store

### Production Build
- **Frontend**: Vite builds static assets to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Deployment**: Replit autoscale deployment target
- **Environment**: Production Node.js with external database

### Configuration Requirements
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `VITE_STRIPE_PUBLIC_KEY`: Stripe publishable key (frontend)
- `REPLIT_DOMAINS`: Allowed domains for auth
- `ISSUER_URL`: OIDC issuer URL (defaults to Replit)

## Changelog
- June 26, 2025. Initial setup
- June 26, 2025. Stripe payment form customized with dark theme to match gallery design
- June 26, 2025. Updated typography and theme to match reference image - added Playfair Display serif font for elegant title styling and darker blue background theme
- June 26, 2025. Added newsletter signup section to footer and updated background to slate-900 (#0F172A) for deeper, more sophisticated aesthetic
- June 26, 2025. Enhanced admin panel with full artwork management - editing, deleting, and reordering capabilities
- June 26, 2025. Fixed image upload system to use actual uploaded files instead of placeholders, increased server request limit to 50MB
- June 27, 2025. CRITICAL FIX: Resolved payment amount discrepancy bug - updated database schema to track shipping costs separately, fixed order creation to include shipping calculations, now payment amounts are consistent between checkout display, actual charges, and order receipts
- June 27, 2025. Enhanced international customer experience - added clear USD currency labels throughout gallery, cart, checkout, and payment confirmation pages, plus prominent currency conversion notice explaining potential bank conversion differences for international customers
- June 27, 2025. ROLLBACK: Completely removed Interac e-Transfer implementation per user request - now using Stripe-only payment system with simplified checkout layout featuring smaller components, email moved to shipping section, and collapsible special instructions field
- June 27, 2025. Removed "USD" currency labels throughout the application (cart, artwork detail, and checkout pages) while keeping only the currency disclaimer message for international customers
- June 27, 2025. Expanded country dropdown to include all 249 countries in alphabetical order and removed free shipping logic - now all orders have fixed shipping costs ($25 for originals, $15 for prints only)
- June 27, 2025. Enhanced payment form styling - configured Stripe Elements with night theme for white labels and proper contrast, improved country dropdown with smooth scrolling and better navigation through long country list
- July 03, 2025. Implemented slug-based URLs - replaced numeric IDs with artwork titles in URLs (e.g., /artwork/mostar instead of /artwork/7), added slug generation utility, updated database schema with unique slug column, and migrated all navigation links to use human-readable URLs
- July 04, 2025. Enhanced admin panel with pagination and expandable interfaces - added 5 items per page pagination to all admin tabs (Artworks, Orders, Subscriptions, Contact Messages), implemented expandable/collapsible interface for Orders and Contact Messages with compact summary headers and detailed expanded views, improved user experience with smart pagination controls including page numbers, previous/next buttons, and item count displays

## User Preferences

Preferred communication style: Simple, everyday language.