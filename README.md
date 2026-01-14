# 2025 - MMI3 - Collaborative Draw App

A real-time collaborative drawing application built for IUT Champs-sur-Marne's MMI 3 students.


## Architecture

The project is splitted into these 2 directories : 
- **client/** - React frontend application
- **server/** - Express + Socket.IO backend server

## Quick Start

### Prerequisites
- **Node.js** v22.12+ (check `.nvmrc` file)
- **npm** v8.0+ (it follows the Node.js version)
- **Git** 

### Automatic Setup (Recommended)

```bash
# 1. Clone the repository and open it
# 2. Run the automatic setup script ./setup.sh
```

If you get an error, consider using the manual setup below.

### Manual Setup

#### 1. Install Node.js version
```bash
# If using nvm (recommended)
nvm install 22.12
nvm use
# Otherwise install it manually
```


#### 2. Install dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd client
npm install

# Copy environment variables
cp .env.example .env
```

#### 3. Start the application

**Terminal 1 - Start Server:**
```bash
cd server
npm run dev
```
> Server now runs on http://localhost:3005 (or any port you defined in your .env)

**Terminal 2 - Start Client:**
```bash
cd client
npm run dev
```
> Client now runs on http://localhost:5173 (or any port you defined in your .env)

## Development Commands

### Server Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build to a dist directory |
| `npm run start` | Start production server |

### Client Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build with Vite |
| `npm run lint` | Run ESLint |


## Troubleshooting

Some common errors you might get : 

**❌ Port already in use error:**
```bash
# Find and kill process using ports
netstat -an | grep 3005
kill -9 <PID>

# Or use different ports in configuration
```

**❌ Node.js version:**
IE: If you get a Warning "Unsupported engine" or a Vite error "Vite requires Node.js version 20.19+ or 22.12+. Please upgrade your Node.js version.". You MUST update your version :
```bash
# 1st check your current version
node --version

# If you have nvm, to use the correct version, you can run :
nvm use

# If nvm not installed, download the needed Node.js version 
```

**❌ WebSocket connection failed:**
- Ensure server is running on the correct port (3005 per default)
- Check `.env` file has VITE_SOCKET_SERVER_URL setted


**❌ Dependencies installation fails:**
You might need to do it if you installed dependenciew with an older version :

```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```