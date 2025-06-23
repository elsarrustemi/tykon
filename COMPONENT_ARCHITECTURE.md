# Tykon Frontend Component Architecture

## Overview

This document outlines the refactored frontend architecture for the Tykon typing game, which has been organized into modular, reusable components with clear separation of concerns.

## 🏗️ Component Structure

```
src/
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── Button.tsx        # Button with variants and loading states
│   │   ├── Input.tsx         # Input with labels and error handling
│   │   ├── Card.tsx          # Card container with variants
│   │   ├── Textarea.tsx      # Textarea with labels and error handling
│   │   ├── Modal.tsx         # Modal dialog with backdrop
│   │   ├── LoadingSpinner.tsx # Loading spinner with sizes
│   │   ├── Badge.tsx         # Badge component with variants
│   │   └── index.ts          # Export all UI components
│   ├── game/                  # Game-specific components
│   │   ├── GameModeCard.tsx  # Home page game mode cards
│   │   ├── TypingArea.tsx    # Typing interface with text display
│   │   ├── GameStats.tsx     # WPM, accuracy, progress display
│   │   ├── PlayerList.tsx    # Player list with progress bars
│   │   ├── RoomForm.tsx      # Create/join room form
│   │   ├── GameResults.tsx   # Game completion results
│   │   ├── DuelGame.tsx      # Main duel game component
│   │   ├── PracticeGame.tsx  # Practice mode component
│   │   └── index.ts          # Export all game components
│   ├── layout/                # Layout components
│   │   ├── Footer.tsx        # Site footer
│   │   └── PageContainer.tsx # Page wrapper with navigation
│   ├── settings/              # Settings components
│   │   └── SettingsForm.tsx  # Settings form with all options
│   └── Toast.tsx             # Toast notifications (existing)
├── hooks/                     # Custom hooks
│   ├── usePlayer.ts          # Player state management
│   └── useTypingStats.ts     # Typing calculations
└── lib/
    └── utils.ts              # Utility functions
```

## 🎯 Component Details

### UI Components (`src/components/ui/`)

#### Button
- **Variants**: primary, secondary, outline, ghost, danger
- **Sizes**: sm, md, lg
- **Features**: Loading states, disabled states, focus management
- **Usage**: All interactive buttons throughout the app

#### Input
- **Features**: Labels, error handling, helper text, validation
- **Usage**: Form inputs, search fields, configuration

#### Card
- **Variants**: default, outlined, elevated
- **Usage**: Content containers, game cards, settings panels

#### Textarea
- **Features**: Labels, error handling, resize control
- **Usage**: Typing areas, long text input

#### Modal
- **Features**: Backdrop, escape key handling, focus management
- **Usage**: Confirmations, results display, settings

#### LoadingSpinner
- **Sizes**: sm, md, lg
- **Usage**: Loading states, async operations

#### Badge
- **Variants**: default, success, warning, error, info
- **Sizes**: sm, md
- **Usage**: Status indicators, labels, notifications

### Game Components (`src/components/game/`)

#### GameModeCard
- **Props**: title, description, icon, stats, button configuration
- **Usage**: Home page game mode selection

#### TypingArea
- **Features**: Real-time text highlighting, error detection, progress tracking
- **Usage**: Main typing interface for both practice and duel modes

#### GameStats
- **Props**: WPM, accuracy, progress, time left, errors
- **Usage**: Real-time statistics display during games

#### PlayerList
- **Features**: Player cards with progress bars, status indicators
- **Usage**: Multiplayer game player tracking

#### RoomForm
- **Features**: Toggle between create/join, validation, error handling
- **Usage**: Room creation and joining interface

#### GameResults
- **Features**: Final rankings, winner detection, action buttons
- **Usage**: Game completion display

#### DuelGame
- **Features**: Real-time multiplayer, Pusher integration, game state management
- **Usage**: Main 1v1 racing interface

#### PracticeGame
- **Features**: Solo practice, quote generation, timer, completion modal
- **Usage**: Practice mode interface

### Layout Components (`src/components/layout/`)

#### PageContainer
- **Features**: Consistent page layout, navigation, footer control
- **Usage**: Wrapper for all pages

#### Footer
- **Features**: Social links, branding, responsive design
- **Usage**: Site-wide footer

### Settings Components (`src/components/settings/`)

#### SettingsForm
- **Features**: Player settings, game settings, interface preferences
- **Usage**: User configuration interface

## 🪝 Custom Hooks

### usePlayer
- **Purpose**: Player ID and name management
- **Features**: localStorage persistence, automatic ID generation
- **Returns**: player object, loading state, update function

### useTypingStats
- **Purpose**: Typing calculations and utilities
- **Features**: WPM calculation, accuracy calculation, progress tracking
- **Returns**: Calculation functions

## 📱 Page Structure

### Home Page (`src/app/page.tsx`)
- Uses `PageContainer` for layout
- Uses `GameModeCard` components for game modes
- Fetches and displays live statistics

### Duel Page (`src/app/duel/page.tsx`)
- Uses `RoomForm` for room creation/joining
- Uses `DuelGame` for the actual game
- Handles room state management

### Practice Page (`src/app/practice/page.tsx`)
- Uses `PracticeGame` component
- Simple page wrapper with navigation

### Settings Page (`src/app/settings/page.tsx`)
- Uses `SettingsForm` component
- Handles settings persistence

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#3B82F6)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)
- **Neutral**: Gray scale

### Typography
- **Headings**: Font-bold with appropriate sizes
- **Body**: Regular weight, readable line heights
- **Monospace**: Used for typing areas

### Spacing
- **Consistent**: 4px base unit (0.25rem)
- **Responsive**: Tailwind's responsive prefixes
- **Component**: Internal padding and margins

### Shadows
- **Light**: Subtle shadows for cards
- **Medium**: Enhanced shadows for elevated elements
- **Heavy**: Strong shadows for modals

## 🔧 Technical Features

### Type Safety
- Full TypeScript support
- Proper interface definitions
- Type-safe props and events

### Performance
- Memoized calculations
- Efficient re-renders
- Lazy loading potential

### Accessibility
- ARIA labels where needed
- Keyboard navigation
- Focus management
- Screen reader support

### Responsive Design
- Mobile-first approach
- Breakpoint-specific layouts
- Touch-friendly interactions

## 🚀 Usage Examples

### Creating a Button
```tsx
import { Button } from "~/components/ui";

<Button variant="primary" size="lg" loading={isLoading}>
  Start Game
</Button>
```

### Using Game Components
```tsx
import { GameModeCard } from "~/components/game";

<GameModeCard
  title="1v1 Race"
  description="Challenge friends to typing races"
  icon="fa-solid fa-users"
  iconColor="blue-500"
  stats={raceStats}
  buttonText="Start Race"
  buttonHref="/duel"
  buttonColor="blue"
/>
```

### Custom Hooks
```tsx
import { usePlayer, useTypingStats } from "~/hooks";

const { player, loading } = usePlayer();
const { calculateWPM } = useTypingStats();
```

## 🔄 State Management

### Local State
- Component-level state with useState
- Form state management
- UI state (modals, loading, etc.)

### Global State
- Player information via localStorage
- Game state via tRPC queries
- Real-time updates via Pusher

### Data Flow
1. User interactions trigger state changes
2. State changes update UI components
3. Server state synchronized via tRPC
4. Real-time updates via WebSocket

## 🧪 Testing Strategy

### Unit Tests
- Individual component testing
- Hook testing
- Utility function testing

### Integration Tests
- Component interaction testing
- Page flow testing
- API integration testing

### E2E Tests
- User journey testing
- Game flow testing
- Cross-browser testing

## 📈 Future Enhancements

### Planned Features
- Dark mode support
- Advanced statistics
- Tournament mode
- Custom text input
- Sound effects
- Animations

### Performance Optimizations
- Code splitting
- Lazy loading
- Virtual scrolling for large lists
- Image optimization

### Accessibility Improvements
- Enhanced keyboard navigation
- Screen reader optimization
- High contrast mode
- Reduced motion support

## 🛠️ Development Guidelines

### Component Creation
1. Define clear interfaces
2. Use TypeScript for type safety
3. Follow naming conventions
4. Add proper documentation
5. Include accessibility features

### Code Organization
1. Single responsibility principle
2. Clear separation of concerns
3. Consistent file structure
4. Proper import/export patterns

### Styling
1. Use Tailwind CSS classes
2. Follow design system guidelines
3. Ensure responsive design
4. Maintain consistency

This architecture provides a solid foundation for the Tykon typing game with excellent maintainability, scalability, and developer experience. 