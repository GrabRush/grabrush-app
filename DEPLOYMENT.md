# Grabrush.shop Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Railway (Recommended - Easiest)
1. Go to https://railway.app
2. Sign up with GitHub
3. Connect your repository
4. Add environment variables:
   - NODE_ENV=production
   - EMAIL_USER=grabrushshop@gmail.com
   - EMAIL_PASS=enfi eqfq jtik xvis
   - DB_HOST=your-railway-db-host
   - DB_USER=your-railway-db-user
   - DB_PASSWORD=your-railway-db-password
   - DB_NAME=your-railway-db-name
5. Deploy automatically

### Option 2: Heroku
1. Install Heroku CLI
2. Create Heroku app: `heroku create grabrush-shop`
3. Add environment variables: `heroku config:set NODE_ENV=production EMAIL_USER=grabrushshop@gmail.com EMAIL_PASS="enfi eqfq jtik xvis"`
4. Deploy: `git push heroku main`

### Option 3: DigitalOcean App Platform
1. Go to https://cloud.digitalocean.com/apps
2. Create new app from GitHub
3. Configure environment variables
4. Deploy

## 📋 Pre-Deployment Checklist

### 1. Database Setup
- Set up production database (PostgreSQL recommended)
- Update connection strings
- Run database migrations

### 2. Environment Variables
```bash
NODE_ENV=production
EMAIL_USER=grabrushshop@gmail.com
EMAIL_PASS=enfi eqfq jtik xvis
DB_HOST=your-production-db-host
DB_USER=your-production-db-user
DB_PASSWORD=your-production-db-password
DB_NAME=your-production-db-name
SESSION_SECRET=your-secure-session-secret
```

### 3. Domain Configuration
- Point grabrush.shop DNS to your hosting platform
- Set up SSL certificate (usually automatic)
- Update email links to use https://grabrush.shop

### 4. Security Updates
- Generate new session secret
- Use production database
- Enable HTTPS
- Set secure cookie options

## 🔧 Code Updates Needed

Your app.js already has:
✅ Dynamic base URL for production
✅ Environment variable support
✅ Gmail integration ready

## 📧 Email Verification
- Verification links will automatically use https://grabrush.shop in production
- Gmail credentials are already configured
- Professional email templates ready

## 🎯 Next Steps
1. Choose hosting platform
2. Set up production database
3. Configure domain DNS
4. Deploy application
5. Test email verification

## 💡 Recommendation
Start with Railway - it's the easiest for Node.js apps and handles most configuration automatically.
