# Feature 7: Master Roster Management Enhancement Plan

**Status**: Ready for Implementation  
**Priority**: Medium  
**Estimated Effort**: 4 days  
**Dependencies**: None (enhances existing functionality)

## Overview
Enhance the existing RosterSettingsModal with improved search, statistics integration, bulk operations, and performance optimizations for large rosters.

## Current State Analysis
- ✅ `RosterSettingsModal.tsx` exists with comprehensive functionality
- ✅ Full CRUD operations for players (create, read, update, delete)
- ✅ Search functionality by name and nickname implemented
- ✅ Player statistics integration via `onOpenPlayerStats` prop
- ✅ In-line editing for all player fields (name, nickname, jersey, notes)
- ✅ Player selection system for games
- ✅ Translation support throughout
- ✅ 100% feature completeness per specification
- ❌ Search could be more advanced (jersey number, notes)
- ❌ No bulk operations (select multiple, bulk delete)
- ❌ No sorting and filtering options
- ❌ Performance not optimized for very large rosters (100+ players)

## Implementation Checklist

### Phase 1: Enhanced Search and Filtering (Day 1)

#### 1.1 Analyze Current Search Implementation
- [ ] **File**: `src/components/RosterSettingsModal.tsx`
- [ ] **Current Search Logic**:
```typescript
// Current search implementation review
const filteredPlayers = availablePlayers.filter(player => 
  player.name.toLowerCase().includes(searchText.toLowerCase()) ||
  (player.nickname && player.nickname.toLowerCase().includes(searchText.toLowerCase()))
);
```

#### 1.2 Implement Advanced Search
- [ ] **Enhanced Search Function**:
```typescript
const getFilteredPlayers = useCallback(() => {
  if (!searchText) return availablePlayers;
  
  const query = searchText.toLowerCase();
  return availablePlayers.filter(player => 
    player.name.toLowerCase().includes(query) ||
    (player.nickname && player.nickname.toLowerCase().includes(query)) ||
    (player.jerseyNumber && player.jerseyNumber.includes(query)) ||
    (player.notes && player.notes.toLowerCase().includes(query))
  );
}, [availablePlayers, searchText]);
```

#### 1.3 Add Search Result Highlighting
- [ ] **Highlight Matches**:
```typescript
const HighlightedText: React.FC<{text: string, highlight: string}> = ({text, highlight}) => {
  if (!highlight) return <span>{text}</span>;
  
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? 
          <mark key={i} className="bg-yellow-300 text-slate-900">{part}</mark> : 
          part
      )}
    </span>
  );
};
```

#### 1.4 Add Search Performance Optimization
- [ ] **Debounce Search Input**:
```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (value: string) => setSearchText(value),
  300
);
```

### Phase 2: Sorting and Filtering Options (Day 1)

#### 2.1 Add Sort Options
- [ ] **Sort Controls Interface**:
```typescript
type SortOption = 'name' | 'jerseyNumber' | 'dateAdded' | 'gamesPlayed';
type SortDirection = 'asc' | 'desc';

const [sortBy, setSortBy] = useState<SortOption>('name');
const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
```

#### 2.2 Implement Sort Logic
- [ ] **Sorting Function**:
```typescript
const getSortedPlayers = useCallback((players: Player[]) => {
  return [...players].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'jerseyNumber':
        const aNum = parseInt(a.jerseyNumber || '999');
        const bNum = parseInt(b.jerseyNumber || '999');
        comparison = aNum - bNum;
        break;
      case 'dateAdded':
        // Assume player ID generation includes timestamp
        comparison = a.id.localeCompare(b.id);
        break;
      default:
        comparison = 0;
    }
    
    return sortDirection === 'desc' ? -comparison : comparison;
  });
}, [sortBy, sortDirection]);
```

#### 2.3 Add Filter Options
- [ ] **Filter Controls**:
```typescript
const [filters, setFilters] = useState({
  showGoalies: true,
  showFieldPlayers: true,
  showRecentlyAdded: false, // Last 7 days
  hasJerseyNumber: null as boolean | null,
  hasNotes: null as boolean | null
});
```

- [ ] **Filter Logic**:
```typescript
const getFilteredPlayers = useCallback((players: Player[]) => {
  return players.filter(player => {
    if (!filters.showGoalies && player.isGoalie) return false;
    if (!filters.showFieldPlayers && !player.isGoalie) return false;
    if (filters.hasJerseyNumber !== null && !!player.jerseyNumber !== filters.hasJerseyNumber) return false;
    if (filters.hasNotes !== null && !!player.notes !== filters.hasNotes) return false;
    
    if (filters.showRecentlyAdded) {
      // Implement date checking logic based on player creation
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      // This would need player creation timestamp
    }
    
    return true;
  });
}, [filters]);
```

#### 2.4 Add Sort/Filter UI Controls
- [ ] **Control Bar Above Player List**:
```typescript
<div className="flex items-center justify-between mb-4 p-3 bg-slate-700/30 rounded-lg">
  <div className="flex items-center gap-4">
    <select 
      value={sortBy} 
      onChange={(e) => setSortBy(e.target.value as SortOption)}
      className="bg-slate-600 text-slate-100 px-3 py-1 rounded"
    >
      <option value="name">{t('rosterSettings.sortByName')}</option>
      <option value="jerseyNumber">{t('rosterSettings.sortByJersey')}</option>
      <option value="dateAdded">{t('rosterSettings.sortByDate')}</option>
    </select>
    
    <button
      onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
      className="p-1 text-slate-300 hover:text-slate-100"
    >
      {sortDirection === 'asc' ? '↑' : '↓'}
    </button>
  </div>
  
  <div className="text-sm text-slate-400">
    {filteredAndSortedPlayers.length} of {availablePlayers.length} players
  </div>
</div>
```

### Phase 3: Enhanced Statistics Integration (Day 1)

#### 3.1 Add Quick Stats Preview  
- [ ] **Player Card Enhancement**:
```typescript
// Add stats preview to each player card
<div className="text-xs text-slate-400 mt-1">
  {player.stats && (
    <span>
      {player.stats.gamesPlayed} games • {player.stats.goals} goals • {player.stats.assists} assists
    </span>
  )}
</div>
```

#### 3.2 Implement Stats Data Integration
- [ ] **Stats Loading Logic**:
```typescript
const [playerStats, setPlayerStats] = useState<Record<string, PlayerStatRow>>({});

useEffect(() => {
  const loadPlayerStats = async () => {
    // Load stats for visible players only (performance optimization)
    const visiblePlayerIds = filteredAndSortedPlayers.map(p => p.id);
    const stats = await getPlayerStatsForMultiple(visiblePlayerIds);
    setPlayerStats(stats);
  };
  
  loadPlayerStats();
}, [filteredAndSortedPlayers]);
```

#### 3.3 Add Performance Indicators
- [ ] **Visual Performance Indicators**:
```typescript
const getPerformanceColor = (avgPoints: number) => {
  if (avgPoints > 2) return 'text-green-400';
  if (avgPoints > 1) return 'text-yellow-400';
  return 'text-slate-400';
};

// Add colored indicators to player cards
<div className={`text-xs ${getPerformanceColor(stats.avgPoints)}`}>
  ⭐ {stats.avgPoints.toFixed(1)} avg
</div>
```

### Phase 4: Bulk Operations (Day 1)

#### 4.1 Add Bulk Selection
- [ ] **Selection State Management**:
```typescript
const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
const [isSelectionMode, setIsSelectionMode] = useState(false);

const togglePlayerSelection = (playerId: string) => {
  const newSelected = new Set(selectedPlayers);
  if (newSelected.has(playerId)) {
    newSelected.delete(playerId);
  } else {
    newSelected.add(playerId);
  }
  setSelectedPlayers(newSelected);
};
```

#### 4.2 Add Selection UI
- [ ] **Selection Controls**:
```typescript
// Selection mode toggle button
<button
  onClick={() => setIsSelectionMode(prev => !prev)}
  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md"
>
  {isSelectionMode ? t('roster.exitSelection') : t('roster.selectMultiple')}
</button>

// Select all/none buttons when in selection mode
{isSelectionMode && (
  <div className="flex gap-2">
    <button onClick={() => setSelectedPlayers(new Set(filteredPlayers.map(p => p.id)))}>
      {t('roster.selectAll')}
    </button>
    <button onClick={() => setSelectedPlayers(new Set())}>
      {t('roster.selectNone')}
    </button>
  </div>
)}
```

#### 4.3 Add Bulk Actions
- [ ] **Bulk Operation Functions**:
```typescript
const handleBulkDelete = async () => {
  const playerNames = Array.from(selectedPlayers)
    .map(id => availablePlayers.find(p => p.id === id)?.name)
    .filter(Boolean);
    
  const confirmed = window.confirm(
    t('roster.confirmBulkDelete', {
      count: selectedPlayers.size,
      names: playerNames.slice(0, 3).join(', ') + (playerNames.length > 3 ? '...' : '')
    })
  );
  
  if (confirmed) {
    for (const playerId of selectedPlayers) {
      await onRemovePlayer(playerId);
    }
    setSelectedPlayers(new Set());
    setIsSelectionMode(false);
  }
};

const handleBulkExport = () => {
  const selectedPlayerData = Array.from(selectedPlayers)
    .map(id => availablePlayers.find(p => p.id === id))
    .filter(Boolean);
    
  exportPlayersToCSV(selectedPlayerData);
};
```

#### 4.4 Add Bulk Actions UI
- [ ] **Bulk Actions Bar**:
```typescript
{isSelectionMode && selectedPlayers.size > 0 && (
  <div className="sticky bottom-0 bg-slate-700 border-t border-slate-600 p-3">
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300">
        {selectedPlayers.size} players selected
      </span>
      <div className="flex gap-2">
        <button
          onClick={handleBulkExport}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-sm"
        >
          {t('roster.exportSelected')}
        </button>
        <button
          onClick={handleBulkDelete}
          className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-md text-sm"
        >
          {t('roster.deleteSelected')}
        </button>
      </div>
    </div>
  </div>
)}
```

### Phase 5: Performance Optimization (Day 0.5)

#### 5.1 Implement Virtualization for Large Lists
- [ ] **Virtual Scrolling for 100+ Players**:
```typescript
import { FixedSizeList as List } from 'react-window';

// Only implement if player count > 50
const PlayerVirtualizedList: React.FC<{players: Player[]}> = ({players}) => {
  const PlayerRow = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <PlayerCard player={players[index]} />
    </div>
  );

  return (
    <List
      height={600} // Available space
      itemCount={players.length}
      itemSize={80} // Height of each player card
    >
      {PlayerRow}
    </List>
  );
};
```

#### 5.2 Optimize Search Performance
- [ ] **Memoization and Debouncing**:
```typescript
const filteredAndSortedPlayers = useMemo(() => {
  let result = getFilteredPlayers(availablePlayers);
  result = getSortedPlayers(result);
  return result;
}, [availablePlayers, searchText, sortBy, sortDirection, filters]);

// Debounce search input to reduce filtering frequency
const debouncedSearchUpdate = useDebouncedCallback(
  (value: string) => setSearchText(value),
  300
);
```

#### 5.3 Add Loading States
- [ ] **Loading Indicators for Async Operations**:
```typescript
const [isLoadingStats, setIsLoadingStats] = useState(false);

// Show skeleton loading for player cards while stats load
{isLoadingStats ? (
  <PlayerCardSkeleton />
) : (
  <PlayerCard player={player} stats={playerStats[player.id]} />
)}
```

### Phase 6: Translation and Polish (Day 0.5)

#### 6.1 Add Enhanced Translation Keys
- [ ] **File**: `public/locales/en/common.json`
- [ ] **Add New Keys**:
```json
{
  "rosterSettings": {
    "sortByName": "Sort by Name",
    "sortByJersey": "Sort by Jersey #",
    "sortByDate": "Sort by Date Added",
    "sortByGames": "Sort by Games Played",
    "filterOptions": "Filter Options",
    "showGoalies": "Show Goalies",
    "showFieldPlayers": "Show Field Players",
    "showRecentlyAdded": "Show Recently Added",
    "hasJerseyNumber": "Has Jersey Number",
    "hasNotes": "Has Notes",
    "selectMultiple": "Select Multiple",
    "exitSelection": "Exit Selection Mode",
    "selectAll": "Select All",
    "selectNone": "Select None",
    "exportSelected": "Export Selected",
    "deleteSelected": "Delete Selected",
    "confirmBulkDelete": "Delete {{count}} players: {{names}}?",
    "playersCount": "{{count}} of {{total}} players",
    "avgPoints": "{{points}} avg points",
    "quickStats": "{{games}} games • {{goals}} goals • {{assists}} assists"
  }
}
```

- [ ] **File**: `public/locales/fi/common.json`
- [ ] **Add Finnish Translations**

#### 6.2 Implement Responsive Enhancements
- [ ] **Mobile Optimization**:
  - [ ] Simplified bulk selection for touch devices
  - [ ] Collapsible filter controls on small screens
  - [ ] Touch-friendly selection checkboxes

- [ ] **Tablet Optimization**:
  - [ ] Grid layout for player cards on wider screens
  - [ ] Better use of horizontal space for controls

### Phase 7: Testing and Integration (Day 0.5)

#### 7.1 Performance Testing
- [ ] **Large Dataset Testing**:
  - [ ] Test with 50+ players (search, sort, filter performance)
  - [ ] Test with 100+ players (virtualization performance)
  - [ ] Test with 200+ players (overall app responsiveness)
  - [ ] Memory usage monitoring during operations

#### 7.2 Feature Testing
- [ ] **Search and Filter Testing**:
  - [ ] Test all search criteria (name, nickname, jersey, notes)
  - [ ] Test search highlighting accuracy
  - [ ] Test sort options with various data sets
  - [ ] Test filter combinations

- [ ] **Bulk Operations Testing**:
  - [ ] Test bulk selection (individual, all, none)
  - [ ] Test bulk delete with various selection sizes
  - [ ] Test bulk export functionality
  - [ ] Test selection mode entry/exit

#### 7.3 Integration Testing
- [ ] **Modal Integration**:
  - [ ] Ensure enhanced features don't break existing functionality
  - [ ] Test player statistics integration
  - [ ] Test with game selection workflows
  - [ ] Verify team integration (when Feature 6 is implemented)

#### 7.4 User Experience Testing
- [ ] **Workflow Testing**:
  - [ ] New user adding many players at once
  - [ ] Experienced user managing large roster
  - [ ] Search and filter to find specific players quickly
  - [ ] Bulk operations for roster cleanup

## File Dependencies
- `src/components/RosterSettingsModal.tsx` (modify)
- `src/utils/playerStats.ts` (potentially modify for bulk stats loading)
- `src/utils/exportUtils.ts` (new - for CSV export functionality)
- `public/locales/en/common.json` (modify)
- `public/locales/fi/common.json` (modify)

## Success Criteria
- [ ] Enhanced search finds players by name, nickname, jersey number, and notes
- [ ] Sort and filter options work smoothly with large datasets
- [ ] Bulk operations (select, delete, export) work efficiently
- [ ] Performance remains good with 100+ players
- [ ] Player statistics integrate seamlessly with roster management
- [ ] All enhancements are fully translated
- [ ] Existing functionality remains intact and unbroken
- [ ] Mobile and tablet experiences are optimized
- [ ] Loading states provide good user feedback

## Post-Implementation Notes
- Document performance benchmarks with different roster sizes
- Note user feedback on search and filter usefulness
- Record any performance bottlenecks discovered and solutions applied
- Document any additional bulk operations users request