import { create } from "zustand";
import { ReactNode } from "react";

interface UiState {
  activeModal: string | null;
  popout: ReactNode | null;
  snackbar: ReactNode | null;
  setActiveModal: (modal: string | null) => void;
  setPopout: (popout: ReactNode | null) => void;
  setSnackbar: (snackbar: ReactNode | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeModal: null,
  popout: null,
  snackbar: null,
  setActiveModal: (modal) => set({ activeModal: modal }),
  setPopout: (popout) => set({ popout }),
  setSnackbar: (snackbar) => set({ snackbar }),
}));
