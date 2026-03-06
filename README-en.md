# ZXPairing (Zhixi Pairing System)

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12+-blue?style=flat-square&logo=python" alt="Python">
  <img src="https://img.shields.io/badge/Node.js-20+-green?style=flat-square&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Vue-3+-42b883?style=flat-square&logo=vue.js" alt="Vue 3">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="License">
</p>

> Professional like FIDE, Simple like a Game.

ZXPairing is a professional chess tournament pairing system that supports both Swiss System and Round Robin formats. Built with a three-tier architecture to meet diverse needs from casual events to official competitions.

## Features

- **FIDE Standard Algorithm**: Based on bbpPairings (C++), compliant with FIDE pairing standards
- **Dual Tournament Systems**: Swiss & Round Robin for different event sizes
- **Modern Web Admin Dashboard**: Vue 3 + Tailwind CSS, beautiful and easy to use
- **RESTful API**: Frontend-backend separation design, easy to extend and integrate
- **Internationalization**: Chinese/English bilingual interface

## Screenshots

| Page | Description |
|------|-------------|
| ![Dashboard](./Screenshot/01-dashboard.png) | Tournament List - Create and manage tournaments |
| ![Players](./Screenshot/02-players.png) | Player Management - Add players, view pairings |
| ![Pairings](./Screenshot/03-pairings.png) | Standings - Real-time score rankings |
| ![Standings](./Screenshot/04-standings.png) | Settings - Language switch |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        PC Web (Vue 3)                       │
│                   Admin Dashboard / Display                 │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP API
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server (Node.js + Fastify)               │
│                   Business Logic / Database                 │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Engine (Python + FastAPI)                │
│              Pairing Algorithms (Swiss/RR)                 │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.10+
- bbpPairings binary (see below)
- (Optional) uv - Python package manager

### 1. Clone the Project

```bash
git clone https://github.com/your-repo/zxpairing.git
cd zxpairing
```

### 2. Start the Engine

See [engine/README.md](./engine/README.md)

```bash
cd engine

# Using uv (recommended)
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uv run uvicorn main:app --reload

# Or using pip
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The engine runs at `http://127.0.0.1:8000`

### 3. Start the Server

```bash
cd server

# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Initialize database
npx prisma generate
npx prisma db push

# Start dev server
npm run dev
```

The server runs at `http://localhost:3001`

### 4. Start the Web Frontend

```bash
cd web

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend runs at `http://localhost:5173`

### 5. Setup bbpPairings

bbpPairings is the FIDE-standard Swiss System pairing engine.

1. Download the appropriate version from [bbpPairings Releases](https://github.com/BieremaBoyzProgramming/bbpPairings/releases)
2. Place the binary in system PATH or in the `engine/` directory
3. Ensure `libstdc++` is installed

| Platform | File |
|----------|------|
| Windows | `.exe` / `.dll` |
| macOS | `.dylib` |
| Linux | `.so` |

## Project Structure

```
zxpairing/
├── engine/                 # Python pairing engine
│   ├── main.py            # FastAPI entry point
│   ├── pairing_algorithms/
│   │   ├── swiss.py       # Swiss system algorithm
│   │   └── round_robin.py # Round robin algorithm
│   ├── requirements.txt
│   └── README.md
│
├── server/                 # Node.js backend
│   ├── src/
│   │   └── index.ts       # Main server entry
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── package.json
│   └── .env.example
│
├── web/                    # Vue 3 web admin
│   ├── src/
│   │   ├── views/         # Page components
│   │   │   ├── Dashboard.vue
│   │   │   ├── TournamentDetail.vue
│   │   │   └── Settings.vue
│   │   ├── api/           # API client
│   │   ├── components/   # Shared components
│   │   └── locales/       # i18n files
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                   # Documentation
│   ├── architecture.md     # Architecture design
│   ├── prd.md              # Product requirements
│   └── roadmap.md          # Development roadmap
│
├── miniprogram/            # WeChat Mini Program (in development)
└── README.md
```

## Tech Stack

| Layer | Technology | Description |
|-------|------------|-------------|
| Frontend | Vue 3 + Composition API | Modern frontend framework |
| UI | Tailwind CSS | Atomic CSS |
| Backend | Fastify | High-performance Node.js framework |
| Database | Prisma + SQLite | ORM + dev database |
| Engine | Python + FastAPI | Pairing algorithm service |
| Core | bbpPairings (C++) | FIDE standard Swiss system |

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tournaments` | Get tournament list |
| POST | `/api/tournaments` | Create tournament |
| GET | `/api/tournaments/:id` | Get tournament details |
| POST | `/api/tournaments/:id/pair` | Generate next round pairings |
| PUT | `/api/matches/:id` | Update match result |
| DELETE | `/api/tournaments/:id/rounds/latest` | Rollback latest round |

For detailed API docs, start the engine and visit `http://localhost:8000/docs` for Swagger.

## FAQ

### Q: How to handle odd number of players?

The system automatically assigns a BYE for Swiss system. Players with a BYE receive 1 point.

### Q: What tournament formats are supported?

- **Swiss System**: For 8+ players, uses score-based pairing
- **Round Robin**: For 4-12 players, everyone plays each other once

### Q: How to integrate WeChat login?

WeChat login is not yet integrated. Two ways to extend:
1. Add WeChat OAuth flow in server
2. Use third-party authentication service

### Q: Is mobile supported?

WeChat mini program is in development. You can access the web version via mobile browser.

## Contributing

Issues and Pull Requests are welcome!

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file

## Acknowledgments

- [bbpPairings](https://github.com/BieremaBoyzProgramming/bbpPairings) - FIDE standard Swiss system algorithm
- [py4swiss](https://github.com/py4swiss/py4swiss) - Python wrapper
- [Vue](https://vuejs.org/) - Progressive JavaScript framework
- [Fastify](https://www.fastify.io/) - Fast and low overhead web framework
