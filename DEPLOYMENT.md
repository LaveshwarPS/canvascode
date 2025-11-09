# 🚀 Deployment Guide

## Quick Deploy Options

### Option 1: Heroku (Recommended for Demo)

1. **Install Heroku CLI**:
   ```bash
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku**:
   ```bash
   heroku login
   ```

3. **Create Heroku App**:
   ```bash
   cd collaborative-canvas
   heroku create your-app-name
   ```

4. **Deploy**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```

5. **Open App**:
   ```bash
   heroku open
   ```

**Heroku Configuration**:
- No additional config needed
- PORT is automatically set by Heroku
- Free tier supports multiple concurrent users

---

### Option 2: Render.com

1. **Create Account**: https://render.com

2. **New Web Service**:
   - Connect GitHub repository
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`

3. **Deploy**:
   - Render automatically deploys on git push
   - Free tier available

---

### Option 3: Railway.app

1. **Create Account**: https://railway.app

2. **New Project**:
   - Import from GitHub
   - Railway auto-detects Node.js

3. **Deploy**:
   - Automatic deployment on push
   - Great free tier

---

### Option 4: DigitalOcean App Platform

1. **Create Account**: https://www.digitalocean.com

2. **Create App**:
   - Connect GitHub repository
   - Select Node.js environment
   - Set run command: `npm start`

3. **Deploy**:
   - Automatic builds and deployments

---

### Option 5: Self-Hosted (VPS)

#### Ubuntu Server Setup

1. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install PM2** (Process Manager):
   ```bash
   sudo npm install -g pm2
   ```

3. **Clone & Setup**:
   ```bash
   git clone <your-repo>
   cd collaborative-canvas
   npm install
   ```

4. **Start with PM2**:
   ```bash
   pm2 start server/server.js --name collaborative-canvas
   pm2 save
   pm2 startup
   ```

5. **Setup Nginx** (Optional - for domain):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## Environment Variables

### Required
- `PORT` (default: 3000)

### Optional (Future Enhancements)
- `REDIS_URL` - For multi-server scaling
- `DATABASE_URL` - For persistence
- `NODE_ENV` - production/development

**Setting Environment Variables**:

Heroku:
```bash
heroku config:set PORT=3000
```

Render/Railway:
- Set in dashboard under "Environment" section

PM2:
```bash
pm2 start server/server.js --env production
```

---

## Testing Deployed App

1. **Open in Multiple Windows**:
   - Desktop browser 1: https://your-app.com
   - Desktop browser 2: https://your-app.com
   - Mobile device: https://your-app.com

2. **Test Checklist**:
   - [ ] All users can join same room
   - [ ] Real-time drawing works
   - [ ] Undo/redo synchronizes
   - [ ] Cursors show correctly
   - [ ] No lag (check latency indicator)
   - [ ] Mobile touch drawing works

---

## Performance Optimization for Production

### 1. Enable Gzip Compression

Add to `server/server.js`:
```javascript
const compression = require('compression');
app.use(compression());
```

Install:
```bash
npm install compression
```

### 2. Add Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### 3. CORS Configuration

```javascript
const cors = require('cors');
app.use(cors({
  origin: 'https://your-domain.com'
}));
```

---

## Monitoring

### Basic Logging

Add to server:
```javascript
io.engine.on("connection_error", (err) => {
  console.log(err.req);      // the request object
  console.log(err.code);     // the error code
  console.log(err.message);  // the error message
  console.log(err.context);  // additional error context
});
```

### PM2 Monitoring

```bash
pm2 monit              # Live monitoring
pm2 logs               # View logs
pm2 status             # Check status
```

### Analytics (Future)

- Google Analytics for user tracking
- Socket.io admin UI: https://socket.io/docs/v4/admin-ui/
- Custom metrics dashboard

---

## Troubleshooting

### WebSocket Connection Issues

**Problem**: "WebSocket connection failed"

**Solution**:
1. Check if server supports WebSocket upgrades
2. Verify CORS settings
3. Check firewall rules
4. Test with Socket.io polling fallback:
   ```javascript
   const socket = io({ transports: ['polling', 'websocket'] });
   ```

### High Latency

**Problem**: Latency >500ms

**Solution**:
1. Deploy server closer to users (edge locations)
2. Enable compression
3. Reduce cursor update frequency
4. Check server resources (CPU/Memory)

### Memory Leaks

**Problem**: Server memory grows continuously

**Solution**:
1. Implement operation history limits
2. Add room cleanup (already implemented)
3. Monitor with PM2: `pm2 monit`

---

## Security Considerations

### 1. Input Validation

```javascript
// Validate username length
if (username.length > 20) {
  return socket.emit('error', 'Username too long');
}

// Sanitize room names
const sanitizedRoomId = roomId.replace(/[^a-zA-Z0-9-_]/g, '');
```

### 2. Rate Limiting Draw Events

```javascript
const drawRateLimiter = new Map();

socket.on('draw', (data) => {
  const now = Date.now();
  const lastDraw = drawRateLimiter.get(socket.id) || 0;
  
  if (now - lastDraw < 10) { // Max 100 events/second
    return; // Ignore
  }
  
  drawRateLimiter.set(socket.id, now);
  // Process draw event...
});
```

### 3. HTTPS/WSS

Always use HTTPS in production:
```javascript
const https = require('https');
const fs = require('fs');

const server = https.createServer({
  key: fs.readFileSync('path/to/key.pem'),
  cert: fs.readFileSync('path/to/cert.pem')
}, app);
```

---

## Cost Estimates

### Free Tier Options

| Platform | Free Tier | Limitations |
|----------|-----------|-------------|
| Heroku | 550 hours/month | Sleeps after 30 min idle |
| Render | 750 hours/month | Auto-suspend |
| Railway | $5 credit/month | Limited resources |
| Vercel | Unlimited | Not ideal for WebSockets |

### Paid Options (Monthly)

| Platform | Cost | Resources |
|----------|------|-----------|
| Heroku Hobby | $7 | No sleep, better performance |
| DigitalOcean | $5 | 1GB RAM, 25GB SSD |
| AWS Lightsail | $3.50 | 512MB RAM |
| Render Standard | $7 | 512MB RAM |

**Recommendation**: Start with free tier (Render or Railway), upgrade based on usage.

---

## Backup & Recovery

### Manual Backup

```bash
# Export current state (future enhancement)
curl http://localhost:3000/api/export > backup.json
```

### Automated Backups

Using cron job:
```bash
0 */6 * * * /path/to/backup-script.sh
```

backup-script.sh:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
curl http://localhost:3000/api/export > /backups/canvas_$DATE.json
```

---

## Demo Link Template

Once deployed, share with this template:

```
🎨 Collaborative Drawing Canvas - Live Demo

🔗 URL: https://your-app.herokuapp.com

👥 How to Test:
1. Open the link in 2+ browser windows
2. Join the same room (e.g., "demo")
3. Start drawing - you'll see each other's strokes in real-time!
4. Try undo/redo to see global synchronization
5. Watch cursor positions move

⌨️ Shortcuts:
- Ctrl+Z: Undo
- Ctrl+Y: Redo
- B: Brush tool
- E: Eraser tool

📱 Mobile: Works on touch devices too!

⏱️ Features:
✅ Real-time collaborative drawing
✅ Global undo/redo
✅ User presence & cursors
✅ Multiple rooms
✅ FPS & latency monitoring
```

---

## Maintenance

### Regular Tasks

**Weekly**:
- Check error logs
- Monitor resource usage
- Test core functionality

**Monthly**:
- Update dependencies
- Review and clean up old rooms
- Check for security updates

**Dependencies Update**:
```bash
npm outdated
npm update
npm audit fix
```

---

## Support

For deployment issues:
1. Check server logs
2. Test locally first
3. Verify environment variables
4. Check platform status pages
5. Review platform-specific documentation

**Platform Docs**:
- Heroku: https://devcenter.heroku.com/
- Render: https://render.com/docs
- Railway: https://docs.railway.app/
- DigitalOcean: https://docs.digitalocean.com/
