import { create } from "zustand";
import { ReactNode } from "react";

interface UiState {
  activeModal: string | null;
  popout: ReactNode | null;
  snackbar: ReactNode | null;
  targetExpertId: number | null;
  historyTargetId: number | null;
  historyRatingType: "expert" | "community" | null;
  setActiveModal: (modal: string | null) => void;
  setPopout: (popout: ReactNode | null) => void;
  setSnackbar: (snackbar: ReactNode | null) => void;
  setTargetExpertId: (id: number | null) => void;
  setHistoryTargetId: (id: number | null) => void;
  setHistoryRatingType: (type: "expert" | "community" | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeModal: null,
  popout: null,
  snackbar: null,
  targetExpertId: null,
  historyTargetId: null,
  historyRatingType: null,
  setActiveModal: (modal) => set({ activeModal: modal }),
  setPopout: (popout) => set({ popout }),
  setSnackbar: (snackbar) => set({ snackbar }),
  setTargetExpertId: (id) => set({ targetExpertId: id }),
  setHistoryTargetId: (id) => set({ historyTargetId: id }),
  setHistoryRatingType: (type) => set({ historyRatingType: type }),
}));
