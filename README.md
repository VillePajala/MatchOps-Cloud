# MatchOps Cloud

[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](https://github.com/VillePajala/soccer-pre-game-app)
[![Test Coverage](https://img.shields.io/badge/Coverage-51.55%25-yellow)](https://github.com/VillePajala/soccer-pre-game-app/actions)
[![Tests](https://github.com/VillePajala/soccer-pre-game-app/actions/workflows/test-unit-integration.yml/badge.svg)](https://github.com/VillePajala/soccer-pre-game-app/actions/workflows/test-unit-integration.yml)
[![Quality Gates](https://github.com/VillePajala/soccer-pre-game-app/actions/workflows/quality-gates.yml/badge.svg)](https://github.com/VillePajala/soccer-pre-game-app/actions/workflows/quality-gates.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.3.5-black)](https://nextjs.org/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-purple)](https://web.dev/progressive-web-apps/)

**Plan • Track • Debrief**

A comprehensive Progressive Web App (PWA) for soccer coaches to manage rosters, track live game events, analyze detailed statistics, and design plays on an interactive tactics board. Built for the sideline, available on any device, with cloud synchronization and offline-first capabilities.

## Quick Start

### Cloud Mode (Recommended)
```bash
git clone https://github.com/VillePajala/soccer-pre-game-app.git
cd soccer-pre-game-app && npm install

# Create .env.local with your Supabase credentials
echo "NEXT_PUBLIC_SUPABASE_URL=your-project-url" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key" >> .env.local
echo "NEXT_PUBLIC_ENABLE_SUPABASE=true" >> .env.local

npm run dev
```

### Local Mode (No Cloud)
```bash
git clone https://github.com/VillePajala/soccer-pre-game-app.git
cd soccer-pre-game-app && npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start using the app.

## Core Features

### ⚽ **PLAN** - Pre-Match Preparation
- **Interactive Field**: Drag-and-drop player positioning and formation planning
- **Roster Management**: Master roster with jersey numbers, positions, and goalkeeper status
- **Season & Tournament Organization**: Systematic match organization
- **Drawing & Annotation**: Tactical visualization with freehand drawing tools

### 📊 **TRACK** - Live Match Management
- **Live Game Clock**: Reliable timer with large overlay view for sideline visibility
- **Substitution Alerts**: Custom interval notifications for player rotations
- **Real-time Event Logging**: Goals, assists, cards, and opponent events
- **Field Positioning**: Live player position tracking during matches

### 🔍 **DEBRIEF** - Post-Match Analysis
- **Comprehensive Statistics**: Detailed game and player performance metrics
- **Performance Ratings**: Post-match player assessments with trend analysis
- **Data Export**: JSON/CSV export for external analysis
- **Match Review**: Review saved games for tactical analysis

### 🚀 **Enhanced Features**
- **Progressive Web App**: Installable on any device with offline capabilities
- **Cloud Synchronization**: Multi-device sync with Supabase integration
- **Internationalization**: English and Finnish language support
- **Advanced Analytics**: Performance monitoring and error tracking

## Tech Stack

- **Framework**: [Next.js 15.3.5](https://nextjs.org/) with App Router
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **UI**: [React 19.0.0](https://reactjs.org/) + [Tailwind CSS 4](https://tailwindcss.com/)
- **State Management**: [Zustand 5.0.3](https://zustand-demo.pmnd.rs/) + [React Query 5.80.10](https://tanstack.com/query/latest)
- **Data**: [Supabase 2.52.0](https://supabase.com/) + IndexedDB + localStorage fallback
- **Charts**: [Recharts 2.15.4](https://recharts.org/)
- **Validation**: [Zod 3.25.76](https://zod.dev/)
- **i18n**: [i18next 24.2.3](https://www.i18next.com/) + [react-i18next 15.4.1](https://react-i18next.com/)
- **Analytics/Monitoring**: [@vercel/analytics 1.5.0](https://vercel.com/analytics) + [Sentry](https://sentry.io/)
- **Testing**: [Jest 29.7.0](https://jestjs.io/) + [React Testing Library 16.3.0](https://testing-library.com/)

## Development

### Installation
```bash
git clone https://github.com/VillePajala/soccer-pre-game-app.git
cd soccer-pre-game-app
npm install
cp .env.example .env.local  # Configure environment variables
npm run dev
```

### Environment Variables
```bash
# Supabase (Required for cloud features)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ENABLE_SUPABASE=true

# Optional
NEXT_PUBLIC_ENABLE_OFFLINE_CACHE=true
SUPABASE_SERVICE_KEY=your-service-key
```

### Scripts
```bash
npm run dev           # Development server
npm run build         # Production build
npm run test          # Run test suite
npm run lint          # Code quality checks
npm run type-check    # TypeScript validation
npm run analyze       # Bundle size analysis
```

## Architecture

- **Multi-layer Storage**: Supabase → IndexedDB → localStorage fallback
- **Offline-First**: Full functionality without internet connection
- **PWA**: Advanced service worker with background sync
- **State Management**: Zustand for app state, React Query for server state
- **Security**: Session management, rate limiting, comprehensive headers

## Browser Support

- **Desktop**: Chrome, Edge, Safari, Firefox (latest)
- **Mobile**: iOS Safari (PWA install), Android Chrome (TWA-ready)
- **Offline**: Complete offline workflow with background sync

## Documentation

Comprehensive documentation is available in the `docs/` folder:

- [Getting Started Guide](docs/getting-started/first-time-guide.md)
- [User Guide](docs/guides/app-usage.md)
- [Architecture Documentation](docs/architecture/README.md)
- [Deployment Guide](docs/production/README.md)
- [Troubleshooting](docs/guides/troubleshooting.md)

## Project Status

✅ **Production Ready** - Actively maintained with continuous improvements

- **Core Functionality**: Robust player management and match tracking
- **Security**: Production-ready authentication and security headers
- **Testing**: Comprehensive test suite with 1400+ passing tests
- **Performance**: Optimized with lazy loading and efficient caching
- **Architecture**: Offline-first with automatic fallback systems
- **Internationalization**: Complete English/Finnish translation support

## License

This project is the exclusive intellectual property of Ville Pajala.  
All rights reserved. No part of this codebase may be copied, reused, or distributed without explicit permission.

## Contributing

By contributing to this project, you agree to transfer all IP rights of your contributions to Ville Pajala.  
See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

---

*For questions, issues, or feature requests, please open an issue on GitHub.*