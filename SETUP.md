# Setup Guide: Genshin Planner

This guide provides step-by-step instructions to get the project running on a fresh Windows machine.

---

## 1. Install Tooling (Git & Node.js)

The fastest way to install the necessary tools is via **PowerShell** (Run as Administrator):

### Install Git
```powershell
winget install --id Git.Git -e --source winget
```

### Install Node.js (Long Term Support)
```powershell
winget install -e --id OpenJS.NodeJS.LTS
```

> [!IMPORTANT]
> Restart your terminal after these installations to ensure the `git` and `npm` commands are recognized.

---

## 2. Configure Git
Set your identity so your commits are correctly labeled (use your own info):
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## 3. Clone and Install Project

### Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/genshin-planner.git
cd genshin-planner
```

### Install Dependencies
```bash
npm install
```

---

## 4. Running the Application

### Development Mode
To start the local development server with hot-reloading:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Unit Testing
To run the automated mathematical and logic unit tests:
```bash
# Run all tests once
npm run test

# Run tests in interactive watch mode for live feedback during edits
npm run test:watch
```

### Production Build
To create an optimized bundle for deployment:
```bash
npm run build
```

---

## 5. Data Pipeline (Advanced)
If you need to update the material icons or mapping data from the game database:

- **Update Icons**: `node resources/scripts/downloadIcons.cjs`
- **Update Character Icons**: `node resources/scripts/downloadCharacterIcons.cjs`
- **Update Weapon Icons**: `node resources/scripts/downloadWeaponIcons.cjs`
- **Regenerate Mappings**: `node resources/scripts/generateMap.cjs`

---

## 6. Configuring Supabase Cloud Sync (Optional / Recommended)

To enable Username authentication and multi-profile cloud synchronization, follow these steps to connect your own Supabase instance:

### Step A: Configure Environment Variables
Create a file named `.env.local` in the root of the project (this is automatically ignored by Git) and add your project credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anonymous-public-key
```

### Step B: Create the Database Table
Go to the **SQL Editor** in your Supabase Dashboard and execute the following query to initialize the `user_planners` table:
```sql
-- Create the user_planners table with compound primary key for multi-profile support
CREATE TABLE IF NOT EXISTS public.user_planners (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_name TEXT NOT NULL,
    materials JSONB DEFAULT '{}'::jsonb NOT NULL,
    characters JSONB DEFAULT '[]'::jsonb NOT NULL,
    weapons JSONB DEFAULT '[]'::jsonb NOT NULL,
    artifacts JSONB DEFAULT '[]'::jsonb NOT NULL,
    planned_characters JSONB DEFAULT '[]'::jsonb NOT NULL,
    planned_items JSONB DEFAULT '[]'::jsonb NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, profile_name)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_planners ENABLE ROW LEVEL SECURITY;

-- Create an RLS policy so users can only manage their own planners
CREATE POLICY "Users can manage their own planners"
    ON public.user_planners
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

### Step C: Disable Email Confirmation (CRITICAL)
Because the app uses simple, alphanumeric Username authentication (transparently mapped internally to Gmail localpart aliases to bypass standard Supabase MX checks), **you must disable mandatory email confirmation**:
1. In the Supabase Dashboard, navigate to **Authentication** -> **Providers** -> **Email**.
2. Turn **OFF** the **Confirm email** toggle.
3. Save the changes.

> [!IMPORTANT]
> If "Confirm email" is left turned ON, new username registrations will immediately lock up in an unconfirmed state, triggering "email rate limit exceeded" or other rate limits during rapid testing.
