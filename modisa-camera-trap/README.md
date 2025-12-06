# Modisa Camera Trap

Wildlife monitoring system for the Kalahari, Botswana. 

## Setup

### 1. Install dependencies

```bash 
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` (already configured for your Supabase project).

### 3. Create test user

Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Authentication → Users → Add User

Create a user with email/password.

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

- **Upload**: Drag-and-drop camera trap images
- **Review**: Manual species identification
- **Public Gallery**: View verified sightings (no login required)

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase (Auth, Database, Storage)

## Deployment

Deploy to Vercel:

```bash
npm run build
```

Or connect your GitHub repo to Vercel for automatic deployments.

## Species List

40 Kalahari species including:
- Big cats: Lion, Leopard, Cheetah
- Hyenas: Brown Hyena, Spotted Hyena
- Carnivores: Jackal, Caracal, Honey Badger, and more
- Ungulates: Gemsbok, Wildebeest, Springbok, and more
- Ground birds: Ostrich, Secretary Bird, Kori Bustard

---

Modisa Wildlife Project
