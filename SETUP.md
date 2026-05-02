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
