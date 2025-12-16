# Backend Deployment Guide

## Vercel Deployment

### Prerequisites
- Vercel account
- GitHub repository connected to Vercel

### Deployment Steps

1. **Deploy Backend Separately**
   ```bash
   # From backend directory
   vercel --prod
   ```

2. **Environment Variables**
   Set these in Vercel dashboard:
   - `YOUTUBE_API_KEY`: Your YouTube Data API v3 key
   - `PYTHON_VERSION`: `3.9`

3. **Frontend Configuration**
   Update frontend `.env.production` with backend URL:
   ```
   VITE_API_URL=https://your-backend-url.vercel.app
   ```

### API Endpoints
- `POST /api/search` - Search for podcast channels
- `POST /api/export/csv` - Export results to CSV
- `POST /api/outreach` - Send outreach messages
- `GET /api/quota/status` - Check API quota status
- `GET /api/health` - Health check

### Notes
- Backend runs as serverless functions
- Each API call is a separate function invocation
- State management handled through quota tracking file
