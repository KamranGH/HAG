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

## User Preferences

Preferred communication style: Simple, everyday language.