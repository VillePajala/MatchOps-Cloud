/**
 * UI State Store - Centralized modal and view state management
 * 
 * This store replaces the distributed useState calls for UI-related state:
 * - Modal visibility and state
 * - View modes (tactics board, settings, etc.)
 * - Drawing and interaction states
 * - Temporary UI state that doesn't need persistence
 * 
 * Migration Strategy: Consolidate 15+ modal state variables and view states
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Point } from '@/types';

// Modal state interface - covers all app modals
export interface ModalState {
  // Game management modals
  gameSettingsModal: boolean;
  newGameSetupModal: boolean;
  loadGameModal: boolean;
  saveGameModal: boolean;
  gameStatsModal: boolean;
  goalLogModal: boolean;
  
  // Player management modals
  rosterSettingsModal: boolean;
  playerAssessmentModal: boolean;
  
  // Competition modals
  seasonTournamentModal: boolean;
  
  // Settings and help modals
  settingsModal: boolean;
  instructionsModal: boolean;
  trainingResourcesModal: boolean;
  
  // Authentication modals
  authModal: boolean;
  migrationModal: boolean;
  
  // System modals
  syncProgressModal: boolean;
}

// View state interface - covers app view modes
export interface ViewState {
  // Main view modes
  isTacticsBoardView: boolean;
  isDrawingMode: boolean;
  isPlayerSelectionMode: boolean;
  isFieldEditMode: boolean;
  
  // Display preferences
  showPlayerNames: boolean;
  showPlayerNumbers: boolean;
  showOpponents: boolean;
  showTacticalElements: boolean;
  
  // Drawing and tactical states
  selectedDrawingTool: 'pen' | 'line' | 'arrow' | 'circle' | 'eraser' | null;
  drawingColor: string;
  drawingThickness: number;
  
  // Drawing interaction states
  isDrawing: boolean;
  currentDrawingPoints: Point[];
  
  // Dragging states
  isDraggingPlayer: boolean;
  draggingPlayerId: string | null;
  isDraggingOpponent: boolean;
  draggingOpponentId: string | null;
  isDraggingTacticalDisc: boolean;
  draggingTacticalDiscId: string | null;
  isDraggingBall: boolean;
  
  // Selection states
  selectedPlayerIds: string[];
  selectedOpponentIds: string[];
  selectedTacticalElements: string[];
}

// Notification/Toast state
export interface NotificationState {
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
    timestamp: number;
  }>;
}

// Combined UI store interface
export interface UIStore {
  // State
  modals: ModalState;
  modalStack: Array<keyof ModalState>;
  view: ViewState;
  notifications: NotificationState;
  
  // Modal actions
  openModal: (modalName: keyof ModalState) => void;
  closeModal: (modalName: keyof ModalState) => void;
  toggleModal: (modalName: keyof ModalState) => void;
  closeAllModals: () => void;
  isModalOpen: (modalName: keyof ModalState) => boolean;
  isAnyModalOpen: () => boolean;
  pushModal: (modalName: keyof ModalState) => void;
  popModal: (modalName: keyof ModalState) => void;
  
  // View actions
  setTacticsBoardView: (enabled: boolean) => void;
  setDrawingMode: (enabled: boolean) => void;
  setPlayerSelectionMode: (enabled: boolean) => void;
  setFieldEditMode: (enabled: boolean) => void;
  
  // Display preference actions
  setShowPlayerNames: (show: boolean) => void;
  setShowPlayerNumbers: (show: boolean) => void;
  setShowOpponents: (show: boolean) => void;
  setShowTacticalElements: (show: boolean) => void;
  
  // Drawing tool actions
  setDrawingTool: (tool: ViewState['selectedDrawingTool']) => void;
  setDrawingColor: (color: string) => void;
  setDrawingThickness: (thickness: number) => void;
  
  // Drawing interaction actions
  startDrawing: (point: Point) => void;
  addDrawingPoint: (point: Point) => void;
  endDrawing: () => void;
  clearCurrentDrawing: () => void;
  
  // Dragging actions
  startDraggingPlayer: (playerId: string) => void;
  endDraggingPlayer: () => void;
  startDraggingOpponent: (opponentId: string) => void;
  endDraggingOpponent: () => void;
  startDraggingTacticalDisc: (discId: string) => void;
  endDraggingTacticalDisc: () => void;
  startDraggingBall: () => void;
  endDraggingBall: () => void;
  
  // Selection actions
  setSelectedPlayerIds: (ids: string[]) => void;
  addSelectedPlayerId: (id: string) => void;
  removeSelectedPlayerId: (id: string) => void;
  clearSelectedPlayers: () => void;
  
  setSelectedOpponentIds: (ids: string[]) => void;
  addSelectedOpponentId: (id: string) => void;
  removeSelectedOpponentId: (id: string) => void;
  clearSelectedOpponents: () => void;
  
  setSelectedTacticalElements: (ids: string[]) => void;
  addSelectedTacticalElement: (id: string) => void;
  removeSelectedTacticalElement: (id: string) => void;
  clearSelectedTacticalElements: () => void;
  
  // Notification actions
  addNotification: (notification: Omit<NotificationState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Utility actions
  resetView: () => void;
  resetAll: () => void;
}

// Default state values
const defaultModalState: ModalState = {
  gameSettingsModal: false,
  newGameSetupModal: false,
  loadGameModal: false,
  saveGameModal: false,
  gameStatsModal: false,
  goalLogModal: false,
  rosterSettingsModal: false,
  playerAssessmentModal: false,
  seasonTournamentModal: false,
  settingsModal: false,
  instructionsModal: false,
  trainingResourcesModal: false,
  authModal: false,
  migrationModal: false,
  syncProgressModal: false,
};

const defaultViewState: ViewState = {
  isTacticsBoardView: false,
  isDrawingMode: false,
  isPlayerSelectionMode: false,
  isFieldEditMode: false,
  showPlayerNames: true,
  showPlayerNumbers: false,
  showOpponents: true,
  showTacticalElements: true,
  selectedDrawingTool: null,
  drawingColor: '#000000',
  drawingThickness: 2,
  isDrawing: false,
  currentDrawingPoints: [],
  isDraggingPlayer: false,
  draggingPlayerId: null,
  isDraggingOpponent: false,
  draggingOpponentId: null,
  isDraggingTacticalDisc: false,
  draggingTacticalDiscId: null,
  isDraggingBall: false,
  selectedPlayerIds: [],
  selectedOpponentIds: [],
  selectedTacticalElements: [],
};

const defaultNotificationState: NotificationState = {
  notifications: [],
};

// Create the UI store with Zustand
export const useUIStore = create<UIStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      modals: defaultModalState,
      modalStack: [],
      view: defaultViewState,
      notifications: defaultNotificationState,
      
      // Modal actions
      openModal: (modalName) => set(
        (state) => {
          const alreadyOnStack = state.modalStack.includes(modalName);
          return {
            modals: { ...state.modals, [modalName]: true },
            modalStack: alreadyOnStack ? state.modalStack : [...state.modalStack, modalName],
          };
        },
        false,
        `openModal:${modalName}`
      ),
      
      closeModal: (modalName) => set(
        (state) => ({ 
          modals: { ...state.modals, [modalName]: false },
          modalStack: state.modalStack.filter((m) => m !== modalName),
        }),
        false,
        `closeModal:${modalName}`
      ),
      
      toggleModal: (modalName) => set(
        (state) => {
          const willOpen = !state.modals[modalName];
          const nextStack = willOpen
            ? (state.modalStack.includes(modalName) ? state.modalStack : [...state.modalStack, modalName])
            : state.modalStack.filter((m) => m !== modalName);
          return {
            modals: { ...state.modals, [modalName]: willOpen },
            modalStack: nextStack,
          };
        },
        false,
        `toggleModal:${modalName}`
      ),
      
      closeAllModals: () => set(
        { modals: defaultModalState, modalStack: [] },
        false,
        'closeAllModals'
      ),
      
      isModalOpen: (modalName) => get().modals[modalName],
      isAnyModalOpen: () => get().modalStack.length > 0,
      pushModal: (modalName) => set(
        (state) => {
          if (state.modalStack.includes(modalName)) return state;
          return {
            modals: { ...state.modals, [modalName]: true },
            modalStack: [...state.modalStack, modalName],
          };
        },
        false,
        `pushModal:${modalName}`
      ),
      popModal: (modalName) => set(
        (state) => ({
          modals: { ...state.modals, [modalName]: false },
          modalStack: state.modalStack.filter((m) => m !== modalName),
        }),
        false,
        `popModal:${modalName}`
      ),
      
      // View actions
      setTacticsBoardView: (enabled) => set(
        (state) => ({ 
          view: { ...state.view, isTacticsBoardView: enabled } 
        }),
        false,
        'setTacticsBoardView'
      ),
      
      setDrawingMode: (enabled) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isDrawingMode: enabled,
            // Clear selection modes when entering drawing mode
            isPlayerSelectionMode: enabled ? false : state.view.isPlayerSelectionMode,
            isFieldEditMode: enabled ? false : state.view.isFieldEditMode,
          } 
        }),
        false,
        'setDrawingMode'
      ),
      
      setPlayerSelectionMode: (enabled) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isPlayerSelectionMode: enabled,
            // Clear other modes when entering selection mode
            isDrawingMode: enabled ? false : state.view.isDrawingMode,
            isFieldEditMode: enabled ? false : state.view.isFieldEditMode,
          } 
        }),
        false,
        'setPlayerSelectionMode'
      ),
      
      setFieldEditMode: (enabled) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isFieldEditMode: enabled,
            // Clear other modes when entering field edit mode
            isDrawingMode: enabled ? false : state.view.isDrawingMode,
            isPlayerSelectionMode: enabled ? false : state.view.isPlayerSelectionMode,
          } 
        }),
        false,
        'setFieldEditMode'
      ),
      
      // Display preference actions
      setShowPlayerNames: (show) => set(
        (state) => ({ 
          view: { ...state.view, showPlayerNames: show } 
        }),
        false,
        'setShowPlayerNames'
      ),
      
      setShowPlayerNumbers: (show) => set(
        (state) => ({ 
          view: { ...state.view, showPlayerNumbers: show } 
        }),
        false,
        'setShowPlayerNumbers'
      ),
      
      setShowOpponents: (show) => set(
        (state) => ({ 
          view: { ...state.view, showOpponents: show } 
        }),
        false,
        'setShowOpponents'
      ),
      
      setShowTacticalElements: (show) => set(
        (state) => ({ 
          view: { ...state.view, showTacticalElements: show } 
        }),
        false,
        'setShowTacticalElements'
      ),
      
      // Drawing tool actions
      setDrawingTool: (tool) => set(
        (state) => ({ 
          view: { ...state.view, selectedDrawingTool: tool } 
        }),
        false,
        'setDrawingTool'
      ),
      
      setDrawingColor: (color) => set(
        (state) => ({ 
          view: { ...state.view, drawingColor: color } 
        }),
        false,
        'setDrawingColor'
      ),
      
      setDrawingThickness: (thickness) => set(
        (state) => ({ 
          view: { ...state.view, drawingThickness: thickness } 
        }),
        false,
        'setDrawingThickness'
      ),
      
      // Drawing interaction actions
      startDrawing: (point) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isDrawing: true,
            currentDrawingPoints: [point]
          } 
        }),
        false,
        'startDrawing'
      ),
      
      addDrawingPoint: (point) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            currentDrawingPoints: [...state.view.currentDrawingPoints, point]
          } 
        }),
        false,
        'addDrawingPoint'
      ),
      
      endDrawing: () => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isDrawing: false,
            currentDrawingPoints: []
          } 
        }),
        false,
        'endDrawing'
      ),
      
      clearCurrentDrawing: () => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            currentDrawingPoints: [],
            isDrawing: false
          } 
        }),
        false,
        'clearCurrentDrawing'
      ),
      
      // Dragging actions
      startDraggingPlayer: (playerId) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isDraggingPlayer: true,
            draggingPlayerId: playerId
          } 
        }),
        false,
        'startDraggingPlayer'
      ),
      
      endDraggingPlayer: () => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isDraggingPlayer: false,
            draggingPlayerId: null
          } 
        }),
        false,
        'endDraggingPlayer'
      ),
      
      startDraggingOpponent: (opponentId) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isDraggingOpponent: true,
            draggingOpponentId: opponentId
          } 
        }),
        false,
        'startDraggingOpponent'
      ),
      
      endDraggingOpponent: () => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isDraggingOpponent: false,
            draggingOpponentId: null
          } 
        }),
        false,
        'endDraggingOpponent'
      ),
      
      startDraggingTacticalDisc: (discId) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isDraggingTacticalDisc: true,
            draggingTacticalDiscId: discId
          } 
        }),
        false,
        'startDraggingTacticalDisc'
      ),
      
      endDraggingTacticalDisc: () => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isDraggingTacticalDisc: false,
            draggingTacticalDiscId: null
          } 
        }),
        false,
        'endDraggingTacticalDisc'
      ),
      
      startDraggingBall: () => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isDraggingBall: true
          } 
        }),
        false,
        'startDraggingBall'
      ),
      
      endDraggingBall: () => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isDraggingBall: false
          } 
        }),
        false,
        'endDraggingBall'
      ),
      
      // Selection actions
      setSelectedPlayerIds: (ids) => set(
        (state) => ({ 
          view: { ...state.view, selectedPlayerIds: ids } 
        }),
        false,
        'setSelectedPlayerIds'
      ),
      
      addSelectedPlayerId: (id) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            selectedPlayerIds: state.view.selectedPlayerIds.includes(id) 
              ? state.view.selectedPlayerIds 
              : [...state.view.selectedPlayerIds, id]
          } 
        }),
        false,
        'addSelectedPlayerId'
      ),
      
      removeSelectedPlayerId: (id) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            selectedPlayerIds: state.view.selectedPlayerIds.filter(playerId => playerId !== id)
          } 
        }),
        false,
        'removeSelectedPlayerId'
      ),
      
      clearSelectedPlayers: () => set(
        (state) => ({ 
          view: { ...state.view, selectedPlayerIds: [] } 
        }),
        false,
        'clearSelectedPlayers'
      ),
      
      setSelectedOpponentIds: (ids) => set(
        (state) => ({ 
          view: { ...state.view, selectedOpponentIds: ids } 
        }),
        false,
        'setSelectedOpponentIds'
      ),
      
      addSelectedOpponentId: (id) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            selectedOpponentIds: state.view.selectedOpponentIds.includes(id) 
              ? state.view.selectedOpponentIds 
              : [...state.view.selectedOpponentIds, id]
          } 
        }),
        false,
        'addSelectedOpponentId'
      ),
      
      removeSelectedOpponentId: (id) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            selectedOpponentIds: state.view.selectedOpponentIds.filter(opponentId => opponentId !== id)
          } 
        }),
        false,
        'removeSelectedOpponentId'
      ),
      
      clearSelectedOpponents: () => set(
        (state) => ({ 
          view: { ...state.view, selectedOpponentIds: [] } 
        }),
        false,
        'clearSelectedOpponents'
      ),
      
      setSelectedTacticalElements: (ids) => set(
        (state) => ({ 
          view: { ...state.view, selectedTacticalElements: ids } 
        }),
        false,
        'setSelectedTacticalElements'
      ),
      
      addSelectedTacticalElement: (id) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            selectedTacticalElements: state.view.selectedTacticalElements.includes(id) 
              ? state.view.selectedTacticalElements 
              : [...state.view.selectedTacticalElements, id]
          } 
        }),
        false,
        'addSelectedTacticalElement'
      ),
      
      removeSelectedTacticalElement: (id) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            selectedTacticalElements: state.view.selectedTacticalElements.filter(elementId => elementId !== id)
          } 
        }),
        false,
        'removeSelectedTacticalElement'
      ),
      
      clearSelectedTacticalElements: () => set(
        (state) => ({ 
          view: { ...state.view, selectedTacticalElements: [] } 
        }),
        false,
        'clearSelectedTacticalElements'
      ),
      
      // Notification actions
      addNotification: (notification) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = Date.now();
        
        set(
          (state) => ({ 
            notifications: {
              ...state.notifications,
              notifications: [
                ...state.notifications.notifications,
                { ...notification, id, timestamp }
              ]
            }
          }),
          false,
          'addNotification'
        );
        
        // Auto-remove notification after duration (default 5 seconds)
        const duration = notification.duration || 5000;
        if (duration > 0) {
          setTimeout(() => {
            set(
              (state) => ({
                notifications: {
                  ...state.notifications,
                  notifications: state.notifications.notifications.filter(n => n.id !== id)
                }
              }),
              false,
              'autoRemoveNotification'
            );
          }, duration);
        }
      },
      
      removeNotification: (id) => set(
        (state) => ({
          notifications: {
            ...state.notifications,
            notifications: state.notifications.notifications.filter(n => n.id !== id)
          }
        }),
        false,
        'removeNotification'
      ),
      
      clearNotifications: () => set(
        { notifications: defaultNotificationState },
        false,
        'clearNotifications'
      ),
      
      // Utility actions
      resetView: () => set(
        { view: defaultViewState },
        false,
        'resetView'
      ),
      
      resetAll: () => set(
        {
          modals: defaultModalState,
          view: defaultViewState,
          notifications: defaultNotificationState,
        },
        false,
        'resetAll'
      ),
    }),
    {
      name: 'UIStore', // DevTools name
    }
  )
);

// Selector hooks for performance optimization
export const useModalState = () => useUIStore((state) => state.modals);
export const useViewState = () => useUIStore((state) => state.view);
export const useNotifications = () => useUIStore((state) => state.notifications);

// Specific modal hooks for common usage patterns
export const useModal = (modalName: keyof ModalState) => {
  const isOpen = useUIStore((state) => state.modals[modalName]);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  const toggleModal = useUIStore((state) => state.toggleModal);
  
  return {
    isOpen,
    open: () => openModal(modalName),
    close: () => closeModal(modalName),
    toggle: () => toggleModal(modalName),
  };
};

// View mode hooks
export const useTacticsBoard = () => {
  const isEnabled = useUIStore((state) => state.view.isTacticsBoardView);
  const setTacticsBoardView = useUIStore((state) => state.setTacticsBoardView);
  
  return {
    isEnabled,
    enable: () => setTacticsBoardView(true),
    disable: () => setTacticsBoardView(false),
    toggle: () => setTacticsBoardView(!isEnabled),
  };
};

export const useDrawingMode = () => {
  const isEnabled = useUIStore((state) => state.view.isDrawingMode);
  const tool = useUIStore((state) => state.view.selectedDrawingTool);
  const color = useUIStore((state) => state.view.drawingColor);
  const thickness = useUIStore((state) => state.view.drawingThickness);
  const setDrawingMode = useUIStore((state) => state.setDrawingMode);
  const setDrawingTool = useUIStore((state) => state.setDrawingTool);
  const setDrawingColor = useUIStore((state) => state.setDrawingColor);
  const setDrawingThickness = useUIStore((state) => state.setDrawingThickness);
  
  return {
    isEnabled,
    tool,
    color,
    thickness,
    enable: () => setDrawingMode(true),
    disable: () => setDrawingMode(false),
    setTool: setDrawingTool,
    setColor: setDrawingColor,
    setThickness: setDrawingThickness,
  };
};

export const usePlayerSelection = () => {
  const isEnabled = useUIStore((state) => state.view.isPlayerSelectionMode);
  const selectedIds = useUIStore((state) => state.view.selectedPlayerIds);
  const setPlayerSelectionMode = useUIStore((state) => state.setPlayerSelectionMode);
  const addSelectedPlayerId = useUIStore((state) => state.addSelectedPlayerId);
  const removeSelectedPlayerId = useUIStore((state) => state.removeSelectedPlayerId);
  const clearSelectedPlayers = useUIStore((state) => state.clearSelectedPlayers);
  const setSelectedPlayerIds = useUIStore((state) => state.setSelectedPlayerIds);
  
  return {
    isEnabled,
    selectedIds,
    enable: () => setPlayerSelectionMode(true),
    disable: () => setPlayerSelectionMode(false),
    selectPlayer: addSelectedPlayerId,
    deselectPlayer: removeSelectedPlayerId,
    clearSelection: clearSelectedPlayers,
    setSelection: setSelectedPlayerIds,
  };
};

// Game view selector hook
export const useGameView = () => {
  const isTacticsBoardView = useUIStore((state) => state.view.isTacticsBoardView);
  const isDrawingMode = useUIStore((state) => state.view.isDrawingMode);
  const isPlayerSelectionMode = useUIStore((state) => state.view.isPlayerSelectionMode);
  const isFieldEditMode = useUIStore((state) => state.view.isFieldEditMode);
  const showPlayerNames = useUIStore((state) => state.view.showPlayerNames);
  const showPlayerNumbers = useUIStore((state) => state.view.showPlayerNumbers);
  const showOpponents = useUIStore((state) => state.view.showOpponents);
  const showTacticalElements = useUIStore((state) => state.view.showTacticalElements);
  
  const setShowPlayerNames = useUIStore((state) => state.setShowPlayerNames);
  const setShowPlayerNumbers = useUIStore((state) => state.setShowPlayerNumbers);
  const setShowOpponents = useUIStore((state) => state.setShowOpponents);
  const setShowTacticalElements = useUIStore((state) => state.setShowTacticalElements);
  const setTacticsBoardView = useUIStore((state) => state.setTacticsBoardView);
  
  return {
    isTacticsBoardView,
    isDrawingMode,
    isPlayerSelectionMode,
    isFieldEditMode,
    showPlayerNames,
    showPlayerNumbers,
    showOpponents,
    showTacticalElements,
    setShowPlayerNames,
    setShowPlayerNumbers,
    setShowOpponents,
    setShowTacticalElements,
    setTacticsBoardView,
  };
};

// Drawing tool selector hook
export const useDrawingTools = () => {
  const selectedDrawingTool = useUIStore((state) => state.view.selectedDrawingTool);
  const drawingColor = useUIStore((state) => state.view.drawingColor);
  const drawingThickness = useUIStore((state) => state.view.drawingThickness);
  
  return {
    selectedDrawingTool,
    drawingColor,
    drawingThickness,
  };
};

// Selection state hook
export const useSelectionState = () => {
  const selectedPlayerIds = useUIStore((state) => state.view.selectedPlayerIds);
  const selectedOpponentIds = useUIStore((state) => state.view.selectedOpponentIds);
  const selectedTacticalElements = useUIStore((state) => state.view.selectedTacticalElements);
  
  return {
    selectedPlayerIds,
    selectedOpponentIds,
    selectedTacticalElements,
  };
};

// Drawing interaction hooks
export const useDrawingInteraction = () => {
  const isDrawing = useUIStore((state) => state.view.isDrawing);
  const currentPoints = useUIStore((state) => state.view.currentDrawingPoints);
  const startDrawing = useUIStore((state) => state.startDrawing);
  const addDrawingPoint = useUIStore((state) => state.addDrawingPoint);
  const endDrawing = useUIStore((state) => state.endDrawing);
  const clearCurrentDrawing = useUIStore((state) => state.clearCurrentDrawing);
  
  return {
    isDrawing,
    currentPoints,
    startDrawing,
    addDrawingPoint,
    endDrawing,
    clearCurrentDrawing,
  };
};

// Dragging state hooks
export const useDraggingState = () => {
  const view = useUIStore((state) => state.view);
  const startDraggingPlayer = useUIStore((state) => state.startDraggingPlayer);
  const endDraggingPlayer = useUIStore((state) => state.endDraggingPlayer);
  const startDraggingOpponent = useUIStore((state) => state.startDraggingOpponent);
  const endDraggingOpponent = useUIStore((state) => state.endDraggingOpponent);
  const startDraggingTacticalDisc = useUIStore((state) => state.startDraggingTacticalDisc);
  const endDraggingTacticalDisc = useUIStore((state) => state.endDraggingTacticalDisc);
  const startDraggingBall = useUIStore((state) => state.startDraggingBall);
  const endDraggingBall = useUIStore((state) => state.endDraggingBall);
  
  return {
    // Player dragging
    isDraggingPlayer: view.isDraggingPlayer,
    draggingPlayerId: view.draggingPlayerId,
    startDraggingPlayer,
    endDraggingPlayer,
    
    // Opponent dragging
    isDraggingOpponent: view.isDraggingOpponent,
    draggingOpponentId: view.draggingOpponentId,
    startDraggingOpponent,
    endDraggingOpponent,
    
    // Tactical disc dragging
    isDraggingTacticalDisc: view.isDraggingTacticalDisc,
    draggingTacticalDiscId: view.draggingTacticalDiscId,
    startDraggingTacticalDisc,
    endDraggingTacticalDisc,
    
    // Ball dragging
    isDraggingBall: view.isDraggingBall,
    startDraggingBall,
    endDraggingBall,
    
    // Helper to check if anything is being dragged
    isAnyDragging: view.isDraggingPlayer || view.isDraggingOpponent || 
                   view.isDraggingTacticalDisc || view.isDraggingBall,
  };
};

// Notification helper hook
export const useNotificationActions = () => {
  const addNotification = useUIStore((state) => state.addNotification);
  const removeNotification = useUIStore((state) => state.removeNotification);
  const clearNotifications = useUIStore((state) => state.clearNotifications);
  
  return {
    showSuccess: (title: string, message: string) => addNotification({ type: 'success', title, message }),
    showError: (title: string, message: string) => addNotification({ type: 'error', title, message }),
    showWarning: (title: string, message: string) => addNotification({ type: 'warning', title, message }),
    showInfo: (title: string, message: string) => addNotification({ type: 'info', title, message }),
    remove: removeNotification,
    clear: clearNotifications,
  };
};