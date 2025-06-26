# Game Collection - A React-Based Gaming Platform

## Overview
This is a fullstack web application featuring a collection of interactive games built with React, Express.js, and PostgreSQL. The platform includes 15 different games ranging from classic board games to word puzzles, with persistent game state management and scoring capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: React hooks with local state and React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui components
- **Build Tool**: Vite with hot module replacement for development

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js 20 with ES modules
- **Development**: tsx for TypeScript execution in development
- **Production Build**: esbuild for server bundling

### Data Layer
- **Database**: PostgreSQL 16 (configured but using in-memory storage currently)
- **ORM**: Drizzle ORM with TypeScript schema definitions
- **Schema**: Users, game states, and game scores tables
- **Storage Interface**: Abstract storage interface with in-memory implementation

## Key Components

### Game Management System
- **Game Storage**: Local storage-based persistence with fallback to server storage
- **Game State**: Each game maintains its own state structure with save/load capabilities
- **Cross-Game Navigation**: Centralized routing with game selection interface

### Game Collection (15 Games)
1. **Tic-Tac-Toe**: 1-3 players, multiple boards, AI opponent
2. **Hangman**: Word puzzles with customizable difficulty
3. **Mad Libs**: Interactive story creation with templates
4. **Would You Rather**: Decision-based party game
5. **Word Search**: Grid-based word finding with categories
6. **Dots and Boxes**: Strategic line-drawing game
7. **Word Scramble**: Timed word unscrambling challenges
8. **Yahtzee**: Dice-rolling scoring game
9. **Dice Roller**: Configurable dice rolling utility
10. **Scorecard**: Multi-player score tracking
11. **Sudoku**: Number puzzle with difficulty levels
12. **Connect Four**: Strategic disc-dropping game
13. **Battleship**: Naval combat grid game
14. **Shell Game**: Memory-based guessing game
15. **Home**: Game selection and management interface

### UI Component System
- **Design System**: shadcn/ui components with consistent theming
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Game Components**: Reusable game header, cards, and interactive elements
- **Toast Notifications**: User feedback system for game actions

## Data Flow

### Game State Management
1. **Local Storage**: Primary storage for game states using browser localStorage
2. **Server Persistence**: API endpoints for saving/loading game states (future enhancement)
3. **Real-time Updates**: Immediate state updates with optimistic UI patterns
4. **Cross-Session Continuity**: Games can be resumed across browser sessions

### API Structure
```
GET /api/game-states - Retrieve all active game states
GET /api/game-states/:gameType - Get specific game state
POST /api/game-states - Save new game state
PUT /api/game-states/:id - Update existing game state
```

### Database Schema
- **users**: User authentication and profiles
- **game_states**: Persistent game state storage with JSON data
- **game_scores**: High score tracking across games

## External Dependencies

### Core Libraries
- **React Ecosystem**: react, react-dom, wouter for routing
- **UI Framework**: @radix-ui components, tailwindcss, class-variance-authority
- **Data Management**: @tanstack/react-query, drizzle-orm, zod for validation
- **Development**: vite, typescript, tsx, esbuild

### Database Integration
- **PostgreSQL**: @neondatabase/serverless for database connectivity
- **Schema Management**: drizzle-kit for migrations and schema management
- **Session Storage**: connect-pg-simple for session management

### Utility Libraries
- **Styling**: clsx, tailwind-merge for conditional classes
- **Date Handling**: date-fns for time manipulation
- **Form Management**: @hookform/resolvers, react-hook-form

## Deployment Strategy

### Development Environment
- **Local Development**: npm run dev starts both client and server with HMR
- **Hot Reloading**: Vite development server with React Fast Refresh
- **Database**: PostgreSQL development instance with Drizzle migrations

### Production Build
- **Client Build**: Vite builds optimized React bundle to dist/public
- **Server Build**: esbuild bundles Express server to dist/index.js
- **Static Assets**: Vite handles asset optimization and code splitting

### Replit Deployment
- **Platform**: Replit with autoscale deployment target
- **Build Process**: npm run build bundles both client and server
- **Runtime**: npm run start serves production build on port 5000
- **Database**: PostgreSQL 16 module with automatic provisioning

### Environment Configuration
- **Development**: NODE_ENV=development with development optimizations
- **Production**: NODE_ENV=production with optimized builds and error handling
- **Database**: DATABASE_URL environment variable for PostgreSQL connection

## Changelog
- June 26, 2025. Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.