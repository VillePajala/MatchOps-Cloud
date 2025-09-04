# External Matches (Player Stat Adjustments)

## Overview
System for integrating games played outside the app into player statistics and team records, allowing comprehensive tracking of all player activity regardless of where games are played.

## Current App vs New Behavior

### Current App
- Statistics only include games played within the app
- No way to account for external games or tournaments
- Player statistics may not reflect complete playing history

### With External Matches
- **Comprehensive stat integration** including all games played
- **External game management** with full edit/delete capabilities  
- **Flexible statistical inclusion** options for different contexts
- **Complete player history** across all playing environments

## User Experience

### External Game Entry
**Game Details Form**:
- **Opponent Information**: External team name and details
- **Game Context**: Date, location, competition level
- **Score Information**: Final scores for both teams
- **Game Settings**: Periods played, duration, special conditions
- **Administrative Details**: Referee, venue, weather, notes

**Player Statistics Entry**:
- **Individual Player Stats**: Goals, assists, appearances for each player
- **Position Information**: Positions played during external game
- **Playing Time**: Minutes or periods played per player
- **Performance Notes**: Coach observations or special achievements
- **Injury/Card Information**: Disciplinary actions or injuries sustained

### Statistical Integration Options
**Always Included Statistics**:
- **Player Totals**: External games always count toward individual player career statistics
- **Lifetime Tracking**: Complete playing history across all environments
- **Individual Records**: Personal bests and achievements include external games
- **Career Development**: Full picture of player progression over time

**Optional Inclusion Settings**:
- **Season Statistics**: Choice to include/exclude from current season totals
- **Tournament Statistics**: Option to count toward tournament-specific records
- **Team Statistics**: Flexible inclusion in team-based statistical analysis
- **Comparative Analysis**: Option to view app-only vs complete statistics

### External Game Management
**Game Library**:
- **Complete Game List**: All external games with searchable details
- **Edit Capabilities**: Full editing of game details and player statistics
- **Delete Options**: Remove external games with statistical impact warnings
- **Duplicate Detection**: Warnings about potentially duplicate game entries

**Data Organization**:
- **Chronological Sorting**: Games organized by date alongside app games
- **Opponent Grouping**: Games grouped by external teams played
- **Competition Categorization**: Games organized by tournament or league context
- **Player-Specific Views**: External games filtered by individual player participation

### Integration with Existing Features
**Player Profiles**: 
- **Complete Statistics**: Player cards show total stats including external games
- **Game History**: Full chronological list of all games (app + external)
- **Performance Trends**: Statistical analysis across all playing environments
- **Achievement Recognition**: Career milestones account for all games played

**Season/Tournament Context**:
- **Season Integration**: External games can be associated with app seasons
- **Tournament Tracking**: External tournament participation recorded
- **Flexible Reporting**: Statistics can be filtered by context (app-only, external-only, combined)
- **Historical Analysis**: Long-term trends across all game types

## UI Elements

### External Game Creation Interface
**Game Entry Form**:
- **Multi-Step Form**: Organized sections for game details, scores, and player stats
- **Auto-Save Progress**: Form progress saved automatically to prevent data loss
- **Player Selection**: Choose which players participated from current roster
- **Quick Entry**: Streamlined interface for rapid data entry

**Player Statistics Grid**:
- **Roster Display**: Current roster with checkboxes for participation
- **Inline Editing**: Direct entry of goals, assists, and other statistics
- **Position Assignment**: Dropdown or selection for positions played
- **Notes Field**: Individual player notes for performance observations

### External Game Management
**Game Library Interface**:
- **List/Card View**: Games displayed in organized, searchable format
- **Quick Filters**: Filter by date, opponent, competition, or participating players
- **Bulk Operations**: Multi-select for bulk editing or deletion
- **Export Options**: Export external game data for analysis or backup

**Edit/Delete Options**:
- **Full Edit Access**: Complete modification of game details and statistics
- **Impact Warnings**: Clear indication of statistical changes before deletion
- **Confirmation Dialogs**: Protection against accidental data loss
- **Change History**: Optional tracking of modifications to external games

### Statistical Display Integration
**Player Cards Enhancement**:
- **Complete Totals**: Statistics including all external games prominently displayed
- **Context Toggle**: Switch between app-only and complete statistics
- **Game Breakdown**: Visual indication of statistics source (app vs external)
- **Career Timeline**: Chronological view including external game milestones

**Reports and Analytics**:
- **Flexible Filtering**: Statistical reports can include/exclude external games
- **Comparative Views**: Side-by-side comparison of app vs complete statistics
- **Export Options**: Statistical exports with external game inclusion controls
- **Historical Trends**: Long-term analysis across all game environments

### Visual Indicators
**Game Type Identification**:
- **Visual Badges**: Clear indicators distinguishing app games from external games
- **Color Coding**: Consistent color scheme for different game types
- **Icon System**: Icons representing external vs internal game sources
- **Context Labels**: Text labels clarifying game source and type

## Data Management

### Import/Export Features
**Bulk Import**:
- **CSV Import**: Batch import of external games from spreadsheet data
- **Template Support**: Pre-formatted templates for common external game formats
- **Data Validation**: Import validation prevents duplicate or invalid entries
- **Error Reporting**: Clear feedback on import issues with resolution guidance

**Export Capabilities**:
- **Statistical Export**: Export complete statistics including external games
- **Game Data Export**: Export external game details for backup or sharing
- **Filtered Exports**: Export specific date ranges, players, or opponents
- **Format Options**: Multiple export formats for different use cases

### Data Integrity
**Validation Rules**:
- **Date Validation**: External games must have valid dates and cannot conflict
- **Player Validation**: Only current roster players can be assigned statistics
- **Statistical Limits**: Reasonable limits on goals, assists, and other metrics
- **Duplicate Prevention**: Detection and prevention of duplicate game entries

**Historical Preservation**:
- **Change Tracking**: Optional history of modifications to external games
- **Archive Support**: Archived players maintain external game associations
- **Data Migration**: External games preserve connections during roster changes
- **Backup Integration**: External games included in all data backup operations

## Key Behaviors
- **Complete Player History**: All games count toward comprehensive player records
- **Flexible Statistical Reporting**: Choose context-appropriate statistics for different purposes
- **Seamless Integration**: External games integrated naturally with app-generated games
- **Data Management**: Full CRUD capabilities for external game data
- **Historical Accuracy**: Preserve complete playing history across all environments
- **Administrative Flexibility**: Support for complex external game scenarios and edge cases
- **Performance Analysis**: Enable complete performance analysis across all playing contexts