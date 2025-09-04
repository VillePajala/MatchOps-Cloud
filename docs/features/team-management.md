# Team Management

## Overview
Complete multi-team support system that allows users to create and manage multiple teams as curated sub-rosters from their master player database.

## Current App vs New Behavior

### Current App
- Single roster system for all players
- No team-based organization of players
- Games use entire player roster

### With Team Management
- **Multiple teams** as organized sub-groups from master roster
- **Team-specific game creation** with pre-selected players
- **Independent team management** separate from master roster
- **Historical game organization** by team affiliation

## User Experience

### Team Creation & Management
**Team Setup**:
- Create teams with custom names and descriptions
- Select players from master roster for each team
- Teams act as curated sub-rosters, not independent player databases
- Edit team composition by adding/removing players from master roster

**Team Interface**:
- Dedicated team management modal accessible from main navigation
- List view showing all created teams with player counts
- Quick edit options for team names and descriptions
- Visual indicators showing which players belong to which teams

### Game Creation with Teams
**Team Selection**: During game setup, choose which team to use
- **Specific Team**: Game uses only players from selected team
- **Full Roster**: Game uses entire master roster (existing behavior)
- **Mixed Selection**: Start with team roster, add additional players if needed

**Smart Defaults**: 
- Game creation remembers last used team
- Most recently used teams appear at top of selection
- Clear visual indication of how many players each team provides

### Game Organization
**Team-Based Filtering**:
- Load Game screen shows games organized by team
- Statistics view can filter by team performance
- Historical data maintains team associations

**Game Memory**: 
- Each saved game remembers which team it was created with
- Games remain accessible even if team composition changes
- Team deletion preserves historical games with team name notation

### Team Roster Management
**Player Assignment**:
- Players exist in master roster first, then assigned to teams
- Same player can belong to multiple teams
- Removing player from team doesn't delete from master roster
- Visual checkboxes show team membership per player

**Team-Specific Views**:
- View team roster independently from master roster
- See team composition with player details (jersey numbers, positions)
- Quick actions for adding/removing players within team context

## UI Elements

### Team Management Modal
**Team List Interface**:
- Scrollable list of all created teams
- Team cards showing name, player count, last used date
- Create new team button prominently positioned
- Edit/delete options for each team

**Team Editor**:
- Team name and description fields
- Master roster with checkboxes for player selection
- Live preview of team composition
- Save/cancel options with confirmation for changes

### Game Creation Integration
**Team Selector**: Dropdown or picker showing available teams
- Team names with player counts
- "Full Roster" option for using all players
- Preview of selected team's players before game creation

### Visual Indicators
**Team Badges**: Color-coded or icon-based team identification
**Player Indicators**: Show which teams each player belongs to
**Game Labels**: Historical games show associated team names
**Status Indicators**: Active teams vs archived teams

### Navigation Integration
**Main Menu**: Team management accessible from primary navigation
**Quick Actions**: Team selection available during game creation
**Context Menus**: Team-related actions available in relevant contexts

## Team Lifecycle

### Team Creation Flow
1. Access team management from main navigation
2. Create new team with name/description
3. Select players from master roster
4. Save team configuration
5. Team becomes available for game creation

### Team Usage Flow
1. Start new game creation
2. Select team from available options
3. Game loads with team's players pre-selected
4. Option to add additional players if needed
5. Game saves with team association

### Team Maintenance
**Adding Players**: Select from master roster to add to team
**Removing Players**: Uncheck players to remove from team (keeps in master roster)
**Editing Details**: Change team name, description, or other metadata
**Archiving**: Hide unused teams without deleting historical data

## Key Behaviors
- **Master Roster Independence**: Teams are views of master roster, not separate databases
- **Flexible Game Creation**: Can use teams or full roster as needed
- **Historical Preservation**: Games maintain team associations even after team changes
- **Multi-Team Membership**: Players can belong to multiple teams simultaneously
- **Seamless Integration**: Team features enhance existing workflows without replacing them
- **Progressive Enhancement**: Users can ignore teams and use existing single-roster workflow