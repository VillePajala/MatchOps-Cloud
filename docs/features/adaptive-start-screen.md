# Adaptive Start Screen

## Overview
Dual-mode start screen interface that intelligently adapts between first-time user and experienced user layouts based on app data state.

## Current App vs New Behavior

### Current App
- Single start screen interface for all users
- Same button layout regardless of user experience level
- No differentiation between new and returning users

### With Adaptive Start Screen
- **Two distinct interface modes** that automatically switch based on user data
- **Progressive disclosure** reduces cognitive load for new users
- **Full functionality** available to experienced users when appropriate

## User Experience

### First-Time User Mode
**When**: User has no players, no saved games, minimal app data
**Interface**: Simplified 2-button layout
- **"Get Started"** - Primary call-to-action button leading to roster setup
- **"How It Works"** - Secondary button opening comprehensive help guide

**Visual Design**:
- Clean, uncluttered interface
- Multi-layered holographic gradient animations on logo
- Prominent call-to-action styling

### Experienced User Mode  
**When**: User has players, saved games, or other app data
**Interface**: Full-featured layout with intelligent button states

**Available Buttons**:
- **Resume Last Game** (enabled when recent game exists)
- **Load Game** (enabled when saved games exist)
- **New Game** (always available)
- **Teams** (enabled when players exist)
- **Seasons & Tournaments** (always available for organization)
- **Stats** (enabled when games exist)
- **Setup Roster** (highlighted when no players exist)

### Language Switching
- Finnish/English language toggle available in both modes
- Consistent across all interface elements
- Maintains selection across app sessions

## UI Elements

### Button States
- **Enabled**: Full functionality available, normal styling
- **Disabled**: Grayed out with tooltip explanations
- **Highlighted**: Special emphasis for recommended actions (like "Setup Roster" when empty)

### Visual Adaptation
- **Simplified Mode**: Minimal buttons, more white space, guided focus
- **Advanced Mode**: Full button grid, information density optimized for efficiency
- **Smooth Transitions**: Interface adapts automatically as user adds data

### Contextual Messaging
- Welcome text adapts to user experience level
- Button tooltips explain why certain actions are unavailable
- Positive reinforcement when users complete setup steps

## Mode Switching Logic

### Automatic Detection
- App evaluates user data on each start screen visit
- Switches modes instantly based on current app state
- No user intervention required

### Transition Triggers
**To Simple Mode**: When user data becomes minimal (roster cleared, games deleted)
**To Advanced Mode**: When user adds first players or saves first game

## Key Behaviors
- **Intelligent Defaults**: Shows most appropriate interface for current user state
- **No Configuration**: Automatic detection eliminates user preference settings
- **Consistent Experience**: Same detection logic applies regardless of how user reached start screen
- **Progressive Growth**: Interface naturally evolves as user becomes more advanced
- **Reversible**: Can return to simple mode if user clears their data