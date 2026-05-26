# Genshin Planner

A premium web application to optimize and plan character materials for Genshin Impact. Seamlessly import your inventory, manage multiple custom planners under a single shared account, and calculate precise farming requirements.

![Genshin Planner Overview](public/icons/materials/creaturesurveyingnotes.png) *(Placeholder or generic preview representation)*

---

## Key Features

- 🎒 **Inventory-Aware Material Planning**: Import inventory directly using standard community **Genshin Optimizer Data (GOOD)** formats (via Akasha Scanner, Inventory Kamera, etc.) or manually edit material counters.
- 📊 **Global Sequential Inventory Allocation**: Allocates available inventory and craftable assets sequentially across enabled planner cards in order of priority. High-priority cards consume resources first, letting subsequent plans calculate exact deficits and preventing double-counting.
- 📆 **Daily Domains Material Tracker**: Integrates a live, interactive day-by-day domain planner mapping missing materials to weekly domain schedules. Features a local-time (Portugal UTC 3:00 AM) server reset countdown and a forward-locked chevron navigator.
- ✨ **Constellation Talent Level Boosts**: Automatically boosts Elemental Skill (+3 at C3+) and Elemental Burst (+3 at C5+) talent levels to mirror actual game behavior, styled in a premium sky blue theme.
- ⚡ **Planner-Only Quick Inventory Modal**: Open a compact inventory modal directly by clicking any material icon on planner cards or summary tiles. Updates inventory instantly without navigating away from the planner page.
- 👥 **Multi-Profile Shared Accounts**: Dynamically create, swap, and manage multiple planners under a single account. Easily switch between your planner and your partner's planner in real time.
- 🔒 **Clean Username Authentication**: Sign up and log in using a simple Username (e.g. `daxiok`) without exposing personal emails or dealing with email confirmation limits.
- 💾 **Dual-Mode Persistence & Sync**: Play as an offline guest (saved locally under the `genshin_planner_local_data` namespace) or sign in to sync your profiles in real time with a debounced [Supabase](https://supabase.com/) cloud database.
- 🎨 **Premium Glassmorphic UI**: Beautiful responsive layout featuring deep harmonic dark colors, dynamic micro-animations, clean scrollbars, and full tooltips.

---

## Detailed Documentation

To explore the inner workings and configurations of the project, refer to our specialized manuals:
- 🛠️ **[Setup Guide](file:///Users/daxiok/projects/genshin-planner/SETUP.md)**: Instructions on cloning, running locally, configuring your custom Supabase client, and DDL PostgreSQL queries.
- 🏗️ **[Technical Architecture](file:///Users/daxiok/projects/genshin-planner/resources/docs/ARCHITECTURE.md)**: Information about the technology stack, dual-persistence pipelines, database schemas, and username mapping structures.
- 📜 **[Domain Context](file:///Users/daxiok/projects/genshin-planner/resources/docs/CONTEXT.md)**: Conceptual domain definitions (GOOD schema, ascension phases, constellation boost systems, and pitfall checks).
- 🗺️ **[Development Roadmap](file:///Users/daxiok/projects/genshin-planner/resources/docs/ROADMAP.md)**: Tracking current feature completions, active milestones, and future route optimizations.

---

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (LTS recommended) installed on your machine.

### Quick Setup

1. **Clone & Navigate**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/genshin-planner.git
   cd genshin-planner
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Database (Optional)**:
   Create a `.env.local` file to attach a Supabase client. See the **[Setup Guide](file:///Users/daxiok/projects/genshin-planner/SETUP.md)** for instructions and SQL schemas.

### Running Locally

Start the hot-reloading development server:
```bash
npm run dev
```
Open the printed local URL (typically [http://localhost:5173](http://localhost:5173)) in your browser.

### Building for Production

Compile optimized static resources:
```bash
npm run build
```
The compiled files are stored in the `/dist` directory, fully prepared for deployment on static hosting providers like GitHub Pages.

