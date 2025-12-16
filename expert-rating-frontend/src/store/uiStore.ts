import { create } from "zustand";
import { ReactNode } from "react";

interface UiState {
  activeModal: string | null;
  popout: ReactNode | null;
  snackbar: ReactNode | null;
  targetExpertId: number | null;
  setActiveModal: (modal: string | null) => void;
  setPopout: (popout: ReactNode | null) => void;
  setSnackbar: (snackbar: ReactNode | null) => void;
  setTargetExpertId: (id: number | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeModal: null,
  popout: null,
  snackbar: null,
  targetExpertId: null,
  setActiveModal: (modal) => set({ activeModal: modal }),
  setPopout: (popout) => set({ popout }),
  setSnackbar: (snackbar) => set({ snackbar }),
  setTargetExpertId: (id) => set({ targetExpertId: id }),
}));
