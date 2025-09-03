# Enhanced Help System - AI-Ready Implementation Plan

## Overview
Transform the existing InstructionsModal into a comprehensive, cloud-enhanced help system with dynamic content management, user progress tracking, context-aware guidance, and multi-device synchronization.

## Prerequisites Verification
**BEFORE STARTING**: Verify all prerequisites are met

### Pre-Implementation Checks
- [ ] **Environment**: `npm run dev` starts without errors
- [ ] **Database Access**: Can access Supabase dashboard and run SQL queries
- [ ] **Instructions Modal**: Existing InstructionsModal component works
- [ ] **i18n System**: Current translation system in place
- [ ] **Git State**: Working directory clean (`git status` shows no uncommitted changes)

### Understanding Current Architecture
**CRITICAL**: Read these files before proceeding:
1. `src/components/InstructionsModal.tsx` - Current help/instructions modal
2. `src/i18n/` - Current internationalization setup
3. `src/context/AuthContext.tsx` - User authentication system
4. `src/hooks/useUserPreferences.ts` - If exists from adaptive start screen

**Verification Commands:**
```bash
# Check these files exist
ls -la src/components/InstructionsModal.tsx src/context/AuthContext.tsx

# Find current i18n setup
find src -name "*i18n*" -o -name "*translation*" | head -5

# Check current help/instructions content
grep -r "instruction\|help\|guide" src/components/ | head -3
```

## Progress Tracking

### Phase 1: Database Foundation (20 min total)
- [ ] **Step 1.1**: Create help_content table (7 min)
- [ ] **Step 1.2**: Create user_help_progress table (5 min)
- [ ] **Step 1.3**: Create help_categories table (5 min)
- [ ] **Step 1.4**: Seed default help content (3 min)

### Phase 2: Content Management Types (15 min total)
- [ ] **Step 2.1**: Add HelpContent interface (4 min)
- [ ] **Step 2.2**: Add HelpCategory interface (3 min)
- [ ] **Step 2.3**: Add UserHelpProgress interface (4 min)
- [ ] **Step 2.4**: Verify TypeScript compilation (4 min)

### Phase 3: Help Content Manager (35 min total)
- [ ] **Step 3.1**: Create helpContent utility structure (10 min)
- [ ] **Step 3.2**: Implement content CRUD operations (15 min)
- [ ] **Step 3.3**: Add progress tracking functions (10 min)

### Phase 4: Enhanced Help Hooks (30 min total)
- [ ] **Step 4.1**: Create useHelpContent hook (15 min)
- [ ] **Step 4.2**: Create useHelpProgress hook (15 min)

### Phase 5: Dynamic Content System (40 min total)
- [ ] **Step 5.1**: Create HelpContentRenderer component (15 min)
- [ ] **Step 5.2**: Create ProgressTracker component (10 min)
- [ ] **Step 5.3**: Create ContextAwareHelper component (15 min)

### Phase 6: Enhanced Instructions Modal (45 min total)
- [ ] **Step 6.1**: Backup existing InstructionsModal (5 min)
- [ ] **Step 6.2**: Enhance modal with dynamic content (20 min)
- [ ] **Step 6.3**: Add progress tracking integration (15 min)
- [ ] **Step 6.4**: Test enhanced modal (5 min)

### Phase 7: Context-Aware Help (25 min total)
- [ ] **Step 7.1**: Add contextual help triggers (15 min)
- [ ] **Step 7.2**: Implement smart help suggestions (10 min)

### Phase 8: Testing & Validation (20 min total)
- [ ] **Step 8.1**: Write unit tests for help system (12 min)
- [ ] **Step 8.2**: Manual integration testing (8 min)

## Detailed Implementation Steps

### Step 1.1: Create help_content Table
**Estimated Time**: 7 minutes
**Files Modified**: Supabase Database (via SQL Editor)

**Pre-Checks:**
- [ ] Can access Supabase dashboard
- [ ] Can run SQL queries in SQL editor
- [ ] Current database has auth.users table

**Implementation:**
```sql
-- Step 1.1: Create help_content table
CREATE TABLE help_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID, -- Will reference help_categories
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'markdown' CHECK (content_type IN ('markdown', 'html', 'text')),
  language_code TEXT DEFAULT 'en',
  ordering INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  target_context TEXT, -- e.g., 'game_setup', 'roster_management', 'general'
  prerequisites TEXT[], -- Array of required knowledge areas
  difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  estimated_read_time INTEGER, -- in seconds
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique titles per category and language
  UNIQUE(category_id, title, language_code)
);

-- Enable RLS (no user isolation needed for help content - it's global)
ALTER TABLE help_content ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read help content
CREATE POLICY "Help content is readable by all authenticated users" ON help_content
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Add indexes for performance
CREATE INDEX idx_help_content_category ON help_content(category_id);
CREATE INDEX idx_help_content_context ON help_content(target_context);
CREATE INDEX idx_help_content_language ON help_content(language_code);
CREATE INDEX idx_help_content_active ON help_content(is_active, ordering);
```

**Immediate Verification:**
```sql
-- Verify table structure
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'help_content' 
ORDER BY ordinal_position;

-- Should show 14 columns
SELECT COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'help_content';
```

**Validation Checklist:**
- [ ] SQL executed without errors
- [ ] Table appears in Supabase Dashboard → Database → Tables
- [ ] Table has 14 columns as expected
- [ ] RLS policy created for public read access
- [ ] Four indexes created successfully
- [ ] CHECK constraints working for content_type and difficulty_level

### Step 1.2: Create user_help_progress Table
**Estimated Time**: 5 minutes
**Files Modified**: Supabase Database

**Pre-Checks:**
- [ ] Step 1.1 completed successfully
- [ ] Still in Supabase SQL Editor

**Implementation:**
```sql
-- Step 1.2: Create user help progress tracking
CREATE TABLE user_help_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  help_content_id UUID NOT NULL REFERENCES help_content(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'bookmarked')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  time_spent_seconds INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT, -- User's personal notes
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- User's rating of helpfulness
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, help_content_id)
);

-- Enable RLS
ALTER TABLE user_help_progress ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own progress
CREATE POLICY "Users can manage their own help progress" ON user_help_progress
  FOR ALL USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_user_help_progress_user ON user_help_progress(user_id);
CREATE INDEX idx_user_help_progress_content ON user_help_progress(help_content_id);
CREATE INDEX idx_user_help_progress_status ON user_help_progress(status);
CREATE INDEX idx_user_help_progress_accessed ON user_help_progress(last_accessed_at DESC);
```

**Immediate Verification:**
```sql
-- Verify table structure
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'user_help_progress' 
ORDER BY ordinal_position;

-- Test constraints
INSERT INTO user_help_progress (user_id, help_content_id, progress_percentage) 
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 150);
-- Should fail due to progress_percentage constraint
```

**Validation Checklist:**
- [ ] SQL executed without errors
- [ ] Table has 12 columns: id, user_id, help_content_id, status, progress_percentage, time_spent_seconds, last_accessed_at, completed_at, notes, rating, created_at, updated_at
- [ ] RLS policy created
- [ ] CHECK constraints prevent invalid progress percentages and ratings
- [ ] Four indexes created

### Step 1.3: Create help_categories Table
**Estimated Time**: 5 minutes
**Files Modified**: Supabase Database

**Implementation:**
```sql
-- Step 1.3: Create help categories for organization
CREATE TABLE help_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon identifier like 'play', 'settings', etc.
  color TEXT, -- Hex color for UI
  ordering INTEGER DEFAULT 0,
  parent_id UUID REFERENCES help_categories(id), -- For nested categories
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(name)
);

-- Enable RLS
ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read categories
CREATE POLICY "Help categories are readable by all authenticated users" ON help_categories
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Add foreign key constraint to help_content
ALTER TABLE help_content 
ADD CONSTRAINT fk_help_content_category 
FOREIGN KEY (category_id) REFERENCES help_categories(id);

-- Add indexes
CREATE INDEX idx_help_categories_parent ON help_categories(parent_id);
CREATE INDEX idx_help_categories_ordering ON help_categories(ordering);
```

**Immediate Verification:**
```sql
-- Verify table structure and relationships
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'help_categories' 
ORDER BY ordinal_position;

-- Verify foreign key was added
SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name
FROM information_schema.key_column_usage k
JOIN information_schema.referential_constraints r ON k.constraint_name = r.constraint_name
WHERE k.table_name = 'help_content' AND k.column_name = 'category_id';
```

**Validation Checklist:**
- [ ] Table created with 9 columns
- [ ] Foreign key constraint added to help_content table
- [ ] RLS policy allows public reading
- [ ] Two indexes created
- [ ] Self-referencing foreign key (parent_id) works

### Step 1.4: Seed Default Help Content
**Estimated Time**: 3 minutes
**Files Modified**: Supabase Database

**Implementation:**
```sql
-- Step 1.4: Insert default categories and content
-- Insert categories first
INSERT INTO help_categories (id, name, description, icon, color, ordering) VALUES 
('11111111-1111-1111-1111-111111111111', 'Getting Started', 'Basic tutorials for new users', 'play-circle', '#22C55E', 1),
('22222222-2222-2222-2222-222222222222', 'Game Management', 'Creating and managing games', 'soccer', '#3B82F6', 2),
('33333333-3333-3333-3333-333333333333', 'Player Management', 'Managing rosters and player stats', 'users', '#8B5CF6', 3),
('44444444-4444-4444-4444-444444444444', 'Advanced Features', 'Advanced functionality and tips', 'cog', '#F59E0B', 4),
('55555555-5555-5555-5555-555555555555', 'Troubleshooting', 'Common issues and solutions', 'question-mark-circle', '#EF4444', 5);

-- Insert basic help content
INSERT INTO help_content (category_id, title, content, target_context, difficulty_level, estimated_read_time, tags) VALUES 
('11111111-1111-1111-1111-111111111111', 'Welcome to MatchOps', 
'# Welcome to MatchOps

MatchOps is your complete soccer game management solution. This guide will help you get started quickly.

## First Steps
1. Set up your player roster
2. Create your first game
3. Start tracking player performance

## Key Features
- **Player Management**: Add players, track stats, manage rosters
- **Game Tracking**: Real-time game events and statistics
- **Performance Analytics**: Detailed insights into player and team performance

Ready to get started? Let''s begin with setting up your roster!', 
'general', 'beginner', 120, ARRAY['welcome', 'getting-started']),

('22222222-2222-2222-2222-222222222222', 'Creating Your First Game', 
'# Creating Your First Game

Follow these steps to create and start your first game:

## Prerequisites
- At least one player in your roster
- Basic game settings configured

## Steps
1. Click "New Game" from the home screen
2. Select your formation
3. Assign players to positions
4. Configure game settings (time, rules, etc.)
5. Start the game!

## During the Game
- Tap players to record events (goals, assists, cards)
- Use the timer controls to manage game time
- Make substitutions as needed

## After the Game
- Review statistics and player performance
- Save the game for future reference', 
'game_setup', 'beginner', 180, ARRAY['game', 'setup', 'tutorial']);
```

**Immediate Verification:**
```sql
-- Verify categories were inserted
SELECT name, description FROM help_categories ORDER BY ordering;

-- Verify help content was inserted
SELECT title, category_id, difficulty_level FROM help_content;

-- Should show 5 categories and 2 content items
SELECT 
  (SELECT COUNT(*) FROM help_categories) as categories_count,
  (SELECT COUNT(*) FROM help_content) as content_count;
```

**Validation Checklist:**
- [ ] 5 categories inserted successfully
- [ ] 2 help content items inserted
- [ ] Foreign key relationships working
- [ ] Content includes markdown formatting
- [ ] Tags array populated correctly

### Step 2.1: Add HelpContent Interface
**Estimated Time**: 4 minutes
**Files Modified**: `src/types/index.ts`

**Pre-Checks:**
- [ ] File `src/types/index.ts` exists and is writable
- [ ] Phase 1 database changes completed successfully
- [ ] Git status clean

**Implementation:**
Add these interfaces at the END of `src/types/index.ts`:

```typescript
// Enhanced Help System Types - Added [CURRENT_DATE]
export interface HelpCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string; // Hex color like '#22C55E'
  ordering: number;
  parentId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface HelpContent {
  id: string;
  categoryId?: string;
  title: string;
  content: string;
  contentType: 'markdown' | 'html' | 'text';
  languageCode: string;
  ordering: number;
  isActive: boolean;
  targetContext?: string; // 'game_setup', 'roster_management', etc.
  prerequisites: string[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime?: number; // in seconds
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // Populated from joins
  category?: HelpCategory;
}

export interface UserHelpProgress {
  id: string;
  userId: string;
  helpContentId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'bookmarked';
  progressPercentage: number; // 0-100
  timeSpentSeconds: number;
  lastAccessedAt: string;
  completedAt?: string;
  notes?: string;
  rating?: number; // 1-5 stars
  createdAt: string;
  updatedAt: string;
  // Populated from joins
  helpContent?: HelpContent;
}

export interface HelpContextInfo {
  context: string; // Current page/component context
  suggestedContent: HelpContent[];
  userProgress: Record<string, UserHelpProgress>;
}

export interface HelpSearchResult {
  content: HelpContent;
  relevanceScore: number;
  matchedTerms: string[];
}
```

**Immediate Verification:**
```bash
# Check TypeScript compilation
npx tsc --noEmit
# Should complete without errors

# Verify interfaces were added
tail -30 src/types/index.ts | grep -E "(interface|export)"
```

**Validation Checklist:**
- [ ] TypeScript compilation passes
- [ ] All interfaces properly exported
- [ ] No naming conflicts with existing types
- [ ] Git diff shows only expected additions

### Step 3.1: Create Help Content Utility Structure
**Estimated Time**: 10 minutes
**Files Created**: `src/utils/helpContent.ts`

**Pre-Checks:**
- [ ] Directory `src/utils/` exists
- [ ] Step 2.1 completed (types available)
- [ ] Can import from existing utilities

**Implementation:**
Create the new file:

```typescript
// src/utils/helpContent.ts
import { supabase } from '../lib/supabase';
import type { HelpContent, HelpCategory, UserHelpProgress, HelpContextInfo, HelpSearchResult } from '../types';
import { StorageError, NetworkError, AuthenticationError } from '../lib/storage/types';

export class HelpContentManager {
  private async getCurrentUserId(): Promise<string | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    return user?.id || null;
  }

  // Get all help categories
  async getHelpCategories(): Promise<HelpCategory[]> {
    try {
      const { data, error } = await supabase
        .from('help_categories')
        .select('*')
        .eq('is_active', true)
        .order('ordering');

      if (error) throw error;
      return (data || []).map(this.transformCategoryFromSupabase);
    } catch (error) {
      throw new StorageError('supabase', 'getHelpCategories', error as Error);
    }
  }

  // Get help content by category
  async getHelpContentByCategory(categoryId?: string, language = 'en'): Promise<HelpContent[]> {
    try {
      let query = supabase
        .from('help_content')
        .select(`
          *,
          category:help_categories(*)
        `)
        .eq('is_active', true)
        .eq('language_code', language)
        .order('ordering');

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(this.transformContentFromSupabase);
    } catch (error) {
      throw new StorageError('supabase', 'getHelpContentByCategory', error as Error);
    }
  }

  // Get help content by context
  async getHelpContentByContext(context: string, language = 'en'): Promise<HelpContent[]> {
    try {
      const { data, error } = await supabase
        .from('help_content')
        .select(`
          *,
          category:help_categories(*)
        `)
        .eq('is_active', true)
        .eq('language_code', language)
        .eq('target_context', context)
        .order('difficulty_level', { ascending: true })
        .order('ordering');

      if (error) throw error;
      return (data || []).map(this.transformContentFromSupabase);
    } catch (error) {
      throw new StorageError('supabase', 'getHelpContentByContext', error as Error);
    }
  }

  // Search help content
  async searchHelpContent(query: string, language = 'en'): Promise<HelpSearchResult[]> {
    try {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
      
      const { data, error } = await supabase
        .from('help_content')
        .select(`
          *,
          category:help_categories(*)
        `)
        .eq('is_active', true)
        .eq('language_code', language)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,tags.cs.{${query}}`);

      if (error) throw error;

      const results = (data || []).map(content => {
        const transformedContent = this.transformContentFromSupabase(content);
        const relevanceScore = this.calculateRelevanceScore(transformedContent, query, searchTerms);
        const matchedTerms = this.findMatchedTerms(transformedContent, searchTerms);

        return {
          content: transformedContent,
          relevanceScore,
          matchedTerms
        };
      });

      // Sort by relevance score (descending)
      return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      throw new StorageError('supabase', 'searchHelpContent', error as Error);
    }
  }

  // Get user's help progress for specific content
  async getUserHelpProgress(contentId: string): Promise<UserHelpProgress | null> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_help_progress')
        .select(`
          *,
          help_content:help_content(*)
        `)
        .eq('user_id', userId)
        .eq('help_content_id', contentId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data ? this.transformProgressFromSupabase(data) : null;
    } catch (error) {
      throw new StorageError('supabase', 'getUserHelpProgress', error as Error);
    }
  }

  // Update user's help progress
  async updateUserHelpProgress(
    contentId: string, 
    progress: Partial<Omit<UserHelpProgress, 'id' | 'userId' | 'helpContentId' | 'createdAt'>>
  ): Promise<UserHelpProgress> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) throw new AuthenticationError('supabase', 'updateUserHelpProgress', new Error('Not authenticated'));

      const { data, error } = await supabase
        .from('user_help_progress')
        .upsert({
          user_id: userId,
          help_content_id: contentId,
          status: progress.status || 'not_started',
          progress_percentage: progress.progressPercentage || 0,
          time_spent_seconds: progress.timeSpentSeconds || 0,
          last_accessed_at: new Date().toISOString(),
          completed_at: progress.completedAt || null,
          notes: progress.notes || null,
          rating: progress.rating || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,help_content_id'
        })
        .select(`
          *,
          help_content:help_content(*)
        `)
        .single();

      if (error) throw error;
      return this.transformProgressFromSupabase(data);
    } catch (error) {
      throw new StorageError('supabase', 'updateUserHelpProgress', error as Error);
    }
  }

  // Get contextual help info for current page
  async getContextualHelp(context: string): Promise<HelpContextInfo> {
    try {
      const userId = await this.getCurrentUserId();
      const suggestedContent = await this.getHelpContentByContext(context);
      
      let userProgress: Record<string, UserHelpProgress> = {};
      
      if (userId && suggestedContent.length > 0) {
        const contentIds = suggestedContent.map(c => c.id);
        const { data: progressData } = await supabase
          .from('user_help_progress')
          .select('*')
          .eq('user_id', userId)
          .in('help_content_id', contentIds);

        if (progressData) {
          userProgress = progressData.reduce((acc, progress) => {
            acc[progress.help_content_id] = this.transformProgressFromSupabase(progress);
            return acc;
          }, {} as Record<string, UserHelpProgress>);
        }
      }

      return {
        context,
        suggestedContent,
        userProgress
      };
    } catch (error) {
      throw new StorageError('supabase', 'getContextualHelp', error as Error);
    }
  }

  // Private helper methods
  private calculateRelevanceScore(content: HelpContent, query: string, terms: string[]): number {
    const queryLower = query.toLowerCase();
    const titleLower = content.title.toLowerCase();
    const contentLower = content.content.toLowerCase();
    
    let score = 0;
    
    // Title match gets highest score
    if (titleLower.includes(queryLower)) score += 100;
    
    // Exact phrase in content
    if (contentLower.includes(queryLower)) score += 50;
    
    // Individual term matches
    terms.forEach(term => {
      if (titleLower.includes(term)) score += 20;
      if (contentLower.includes(term)) score += 10;
      if (content.tags.some(tag => tag.toLowerCase().includes(term))) score += 15;
    });
    
    // Difficulty level preference (beginners first)
    if (content.difficultyLevel === 'beginner') score += 5;
    
    return score;
  }

  private findMatchedTerms(content: HelpContent, terms: string[]): string[] {
    const titleLower = content.title.toLowerCase();
    const contentLower = content.content.toLowerCase();
    
    return terms.filter(term => 
      titleLower.includes(term) || 
      contentLower.includes(term) ||
      content.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }

  private transformCategoryFromSupabase(data: any): HelpCategory {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      ordering: data.ordering,
      parentId: data.parent_id,
      isActive: data.is_active,
      createdAt: data.created_at
    };
  }

  private transformContentFromSupabase(data: any): HelpContent {
    return {
      id: data.id,
      categoryId: data.category_id,
      title: data.title,
      content: data.content,
      contentType: data.content_type,
      languageCode: data.language_code,
      ordering: data.ordering,
      isActive: data.is_active,
      targetContext: data.target_context,
      prerequisites: data.prerequisites || [],
      difficultyLevel: data.difficulty_level,
      estimatedReadTime: data.estimated_read_time,
      tags: data.tags || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      category: data.category ? this.transformCategoryFromSupabase(data.category) : undefined
    };
  }

  private transformProgressFromSupabase(data: any): UserHelpProgress {
    return {
      id: data.id,
      userId: data.user_id,
      helpContentId: data.help_content_id,
      status: data.status,
      progressPercentage: data.progress_percentage,
      timeSpentSeconds: data.time_spent_seconds,
      lastAccessedAt: data.last_accessed_at,
      completedAt: data.completed_at,
      notes: data.notes,
      rating: data.rating,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      helpContent: data.help_content ? this.transformContentFromSupabase(data.help_content) : undefined
    };
  }
}

// Export singleton instance
export const helpContentManager = new HelpContentManager();
```

**Immediate Verification:**
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Verify file created correctly
ls -la src/utils/helpContent.ts
wc -l src/utils/helpContent.ts  # Should be around 250+ lines
```

**Validation Checklist:**
- [ ] File created at correct location
- [ ] TypeScript compilation passes
- [ ] All imports resolve correctly
- [ ] Class structure follows existing patterns
- [ ] Search functionality implemented
- [ ] Progress tracking included

### [Continue with remaining steps following the same detailed format...]

## Error Recovery Procedures

### Database Rollback
If database steps fail:
```sql
-- Full rollback of all tables
ALTER TABLE help_content DROP CONSTRAINT IF EXISTS fk_help_content_category;
DROP TABLE IF EXISTS user_help_progress;
DROP TABLE IF EXISTS help_content;
DROP TABLE IF EXISTS help_categories;
```

### Code Rollback
If code steps fail:
```bash
# See what changed
git diff

# Rollback specific files
git checkout HEAD -- src/utils/helpContent.ts
git checkout HEAD -- src/types/index.ts
git checkout HEAD -- src/components/InstructionsModal.tsx

# Or full rollback
git reset --hard HEAD
```

### Common Issues & Solutions

**"Foreign key constraint violations"**
1. Ensure help_categories is created before help_content
2. Verify category IDs exist when inserting content
3. Check UUID format is correct

**"RLS policy errors"**
1. Verify authenticated users can read help content
2. Check user_help_progress policies allow user access
3. Test policies in SQL editor with actual user IDs

**"Content not displaying correctly"**
1. Verify markdown rendering works in InstructionsModal
2. Check content encoding and special characters
3. Test with different content types (markdown, html, text)

## Testing Validation

### Manual Testing Checklist
After completing all steps:
- [ ] **Help categories display** correctly in enhanced modal
- [ ] **Content renders properly** (markdown formatting works)
- [ ] **Progress tracking** updates when content is read
- [ ] **Context-aware help** shows relevant content
- [ ] **Search functionality** finds relevant content
- [ ] **User preferences** persist across sessions

### Automated Testing
```bash
# Run existing tests to ensure no regressions
npm test

# Run TypeScript checking
npx tsc --noEmit

# Run linting if available
npm run lint
```

## Definition of Done
This feature is complete when:
- [ ] All progress tracking checkboxes are checked
- [ ] All validation checklists pass
- [ ] Enhanced InstructionsModal works with dynamic content
- [ ] Progress tracking functions correctly
- [ ] Context-aware help provides relevant suggestions
- [ ] Search returns meaningful results
- [ ] Multi-language support ready (structure in place)
- [ ] No existing functionality is broken

## Time Tracking Template
```
## Enhanced Help System Implementation Log
**Start Time**: [FILL IN]
**Estimated Total**: 3.8 hours
**Actual Total**: [UPDATE AS YOU GO]

### Phase 1: Database Foundation (Est: 20min)
- Step 1.1: [ACTUAL TIME] vs 7min estimated
- Step 1.2: [ACTUAL TIME] vs 5min estimated

### Issues Encountered:
- [LOG ANY PROBLEMS AND SOLUTIONS]

### Notes:
- [ANY OBSERVATIONS OR MODIFICATIONS TO THE PLAN]
```

This enhanced help system will provide users with contextual, trackable guidance that adapts to their experience level and current context within the application.