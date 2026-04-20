# games.timbrown.xyz — Google Cloud Deployment Guide

## Overview
This is a fully static site (HTML/CSS/JS, no build step). Two good options:

| Option | Best for | Cost |
|--------|----------|------|
| **Firebase Hosting** | Easiest, built-in SSL + CDN | Free tier covers typical family use |
| **Cloud Storage + LB** | Pure GCP, more control | ~$0.02/GB + LB cost (~$18/mo min) |

**Recommendation: Firebase Hosting.** It's part of Google Cloud, handles SSL automatically, global CDN, and custom domains in minutes.

---

## Option A: Firebase Hosting (Recommended)

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login & initialize
```bash
firebase login
cd games-app   # the folder you downloaded
firebase init hosting
```

When prompted:
- **Project:** Select your existing GCP project or create new
- **Public directory:** `.` (current directory)
- **Single-page app:** No
- **GitHub auto-deploy:** Optional, say No for now

### 3. Deploy
```bash
firebase deploy
```

Firebase will output a URL like `your-project.web.app`.

### 4. Add custom domain (games.timbrown.xyz)
1. Go to [Firebase Console](https://console.firebase.google.com) → Hosting → Add custom domain
2. Enter `games.timbrown.xyz`
3. Firebase gives you two `A` records (IPv4) and/or a `TXT` verification record
4. Add those records in your DNS provider (wherever timbrown.xyz is managed)
5. Wait 10–30 min for SSL provisioning — Firebase handles the certificate automatically

---

## Option B: Cloud Storage Static Website

### 1. Create bucket
```bash
gcloud storage buckets create gs://games.timbrown.xyz \
  --location=US \
  --uniform-bucket-level-access
```

### 2. Upload files
```bash
gcloud storage cp -r ./* gs://games.timbrown.xyz/
```

### 3. Make public & set web config
```bash
gcloud storage buckets update gs://games.timbrown.xyz \
  --web-main-page-suffix=index.html \
  --web-error-page=index.html

gcloud storage objects update gs://games.timbrown.xyz/** \
  --predefined-acl=publicRead
```

### 4. DNS for Cloud Storage
Point `games.timbrown.xyz` as a `CNAME` to `c.storage.googleapis.com`.

> **Note:** Cloud Storage direct hosting doesn't include HTTPS on custom domains without adding a Cloud Load Balancer (~$18/mo). Firebase Hosting is strongly preferred for SSL + custom domain.

---

## Updating the Site

### Firebase (recommended workflow)
```bash
# After making changes to any files:
firebase deploy
# Done — live in ~30 seconds globally
```

### Cloud Storage
```bash
# Upload changed files:
gcloud storage cp games/newgame.html gs://games.timbrown.xyz/games/
# Or sync everything:
gcloud storage rsync -r . gs://games.timbrown.xyz/
```

---

## Adding a New Game

1. Create `games/yourgame.html` following the pattern of existing games
2. Add a card to `index.html` in the appropriate section
3. Re-deploy

---

## File Structure
```
games-app/
├── index.html              ← Hub / home page
├── shared.css              ← Shared design system
├── deploy.md               ← This file
└── games/
    ├── card-scoring.html   ← Flip 7, Spades, Hearts, Rummy
    ├── tictactoe.html
    ├── connectfour.html
    ├── dotsboxes.html
    ├── battleship.html
    ├── yahtzee.html
    ├── sudoku.html
    ├── hangman.html
    ├── wordsearch.html
    ├── wordscramble.html
    ├── madlibs.html
    ├── wouldyourather.html
    └── riddlestories.html
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Deploy | `firebase deploy` |
| Preview locally | `firebase serve` or `npx serve .` |
| View hosting URL | `firebase open hosting:site` |
| Check deploy history | Firebase Console → Hosting |
