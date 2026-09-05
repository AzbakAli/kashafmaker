# Deploying KashafMake to Netlify

## 📋 Prerequisites

1. A Netlify account (free at netlify.com)
2. A PostgreSQL database (Supabase recommended - free)
3. A GitHub account (for connecting to Netlify)
4. Basic knowledge of environment variables

---

## 🚀 Step-by-Step Deployment Guide

### Step 1: Set Up PostgreSQL Database

#### Option A: Supabase (Recommended - Free)
1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Fill in:
   - Name: `kashafmake-db`
   - Database Password: (save this securely)
   - Region: Choose closest to your users
4. Wait for project to be created (1-2 minutes)
5. Go to Settings → Database
6. Copy the **Connection String**:
   ```
   postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
   ```

#### Option B: Neon (Alternative - Free)
1. Go to [neon.tech](https://neon.tech)
2. Create a project
3. Copy the connection string

---

### Step 2: Install PostgreSQL Client

```bash
npm install pg
```

This has already been added to your package.json.

---

### Step 3: Update Local Environment

Create a `.env` file in your project root:

```env
DATABASE_URL="postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-local-secret-key"
AUTH_SECRET="your-local-secret-key"
UPLOAD_DIR="./uploads"
```

---

### Step 4: Push Database Schema to PostgreSQL

```bash
# Generate Prisma client
npm run db:generate

# Push schema to PostgreSQL
npm run db:push

# Seed the database (if you have seed data)
npm run db:seed
```

---

### Step 5: Generate Secure Secrets

Generate two random secrets for production:

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate AUTH_SECRET
openssl rand -base64 32
```

Save these securely - you'll need them for Netlify.

---

### Step 6: Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Ready for Netlify deployment"

# Create repository on GitHub first, then:
git branch -M main
git remote add origin https://github.com/yourusername/kashafmake.git
git push -u origin main
```

---

### Step 7: Deploy to Netlify

1. **Sign in to Netlify** at [netlify.com](https://netlify.com)

2. **Add a new site**:
   - Click "Add new site" → "Import an existing project"

3. **Connect to GitHub**:
   - Click "GitHub"
   - Authorize Netlify to access your repositories
   - Select `kashafmake` repository

4. **Configure build settings**:
   - Netlify should auto-detect Next.js
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: `20`

5. **Add environment variables**:
   Go to Site settings → Build & deploy → Environment variables
   Add these:

   ```
   DATABASE_URL = postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
   NEXTAUTH_URL = https://your-site-name.netlify.app
   NEXTAUTH_SECRET = [the-secret-you-generated]
   AUTH_SECRET = [the-secret-you-generated]
   UPLOAD_DIR = /tmp
   ```

6. **Deploy**:
   - Click "Deploy site"
   - Wait for build to complete (2-3 minutes)

---

### Step 8: Test Your Deployment

1. Visit your Netlify URL: `https://your-site-name.netlify.app`
2. Try logging in
3. Create a test ride
4. Generate a Kashaf PDF

---

## 📁 File Storage Setup (Optional but Recommended)

For file uploads (PDF templates, letterheads), you have options:

### Option A: Supabase Storage (If using Supabase)
1. In Supabase dashboard, go to Storage
2. Create a new bucket: `uploads`
3. Make it public
4. Add bucket policy for uploads
5. Add environment variables:
   ```
   SUPABASE_URL = https://[project-id].supabase.co
   SUPABASE_ANON_KEY = your-anon-key
   ```

### Option B: Netlify Functions (Built-in)
Netlify has built-in functions support, but for file storage, consider using Netlify Blobs or external storage.

---

## 🔧 Troubleshooting

### Build Fails
- Check the build logs in Netlify
- Ensure all dependencies are in package.json
- Verify Node version is set to 20

### Database Connection Error
- Verify DATABASE_URL is correct
- Check if Supabase/Neon database is active
- Ensure IP whitelist allows Netlify's IP addresses

### Authentication Issues
- Verify NEXTAUTH_URL matches your Netlify domain
- Ensure NEXTAUTH_SECRET and AUTH_SECRET are set
- Check they are the same in both environment variables

### PDF Generation Fails
- File uploads may not work with local storage in production
- Implement cloud storage solution (Supabase Storage recommended)

---

## 🌐 Custom Domain (Optional)

1. In Netlify, go to Domain settings
2. Click "Add custom domain"
3. Enter your domain (e.g., `kashafmake.com`)
4. Update DNS records as instructed by Netlify
5. Update NEXTAUTH_URL to your custom domain

---

## 📊 Monitoring

Netlify provides:
- Build logs
- Function logs
- Analytics (free tier)
- Form submissions

---

## 💰 Cost Breakdown

### Free Tier (Good for Start)
- **Netlify**: Free (100GB bandwidth/month)
- **Supabase**: Free (500MB database, 1GB storage)
- **Total**: $0/month

### Paid Tier (When Scaling)
- **Netlify Pro**: $19/month
- **Supabase Pro**: $25/month
- **Total**: ~$44/month

---

## 🔄 Automatic Deployments

Once set up, Netlify will:
- Automatically rebuild when you push to GitHub
- Deploy to preview URLs for pull requests
- Rollback to previous deployments if needed

---

## 📝 Checklist Before Deployment

- [ ] PostgreSQL database set up (Supabase/Neon)
- [ ] Database schema pushed to PostgreSQL
- [ ] pg package installed
- [ ] Secrets generated (NEXTAUTH_SECRET, AUTH_SECRET)
- [ ] Code pushed to GitHub
- [ ] Netlify connected to GitHub
- [ ] Environment variables configured in Netlify
- [ ] Build succeeds
- [ ] Basic functionality tested
- [ ] File storage configured (if needed)

---

## 🆘 Need Help?

- Netlify Docs: https://docs.netlify.com
- Supabase Docs: https://supabase.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment

---

## 🎯 Next Steps After Deployment

1. Set up custom domain
2. Configure SSL (automatic on Netlify)
3. Set up monitoring/alerts
4. Implement backup strategy for database
5. Add analytics (Google Analytics, etc.)
