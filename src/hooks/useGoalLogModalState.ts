/**
 * 🔧 CUTOVER: Pure Zustand GoalLogModal Hook
 */

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import logger from '@/utils/logger';

export interface GoalLogModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useGoalLogModalState(): GoalLogModalState {
  const isOpen = useUIStore((state) => state.modals.goalLogModal);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  
  const open = useCallback(() => {
    logger.debug('[GoalLogModal] Opening via Zustand');
    openModal('goalLogModal');
  }, [openModal]);
  
  const close = useCallback(() => {
    logger.debug('[GoalLogModal] Closing via Zustand');
    closeModal('goalLogModal');
  }, [closeModal]);
  
  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);
  
  return { isOpen, open, close, toggle };
}

export function useGoalLogModalWithHandlers() {
  const modalState = useGoalLogModalState();
  
  const handleClose = useCallback(() => {
    logger.info('[GoalLogModal] Closing modal');
    modalState.close();
  }, [modalState]);
  
  const handleOpen = useCallback(() => {
    logger.info('[GoalLogModal] Opening modal');
    modalState.open();
  }, [modalState]);
  
  const handleToggle = useCallback(() => {
    modalState.toggle();
  }, [modalState]);
  
  return {
    ...modalState,
    handleOpen,
    handleClose,
    handleToggle,
    onOpen: handleOpen,
    onClose: handleClose,
    onToggle: handleToggle,
  };
}

export const useGoalLogModal = useGoalLogModalState;