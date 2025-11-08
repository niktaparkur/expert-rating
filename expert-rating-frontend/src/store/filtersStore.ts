import { create } from "zustand";

export interface FiltersState {
  region: string;
  category_id: string;
}

interface FiltersStore {
  homeFilters: FiltersState;
  afishaFilters: FiltersState;
  setHomeFilters: (filters: FiltersState) => void;
  setAfishaFilters: (filters: FiltersState) => void;
  resetHomeFilters: () => void;
  resetAfishaFilters: () => void;
}

const initialFiltersState: FiltersState = { region: "", category_id: "" };

export const useFiltersStore = create<FiltersStore>((set) => ({
  homeFilters: initialFiltersState,
  afishaFilters: initialFiltersState,
  setHomeFilters: (filters) => set({ homeFilters: filters }),
  setAfishaFilters: (filters) => set({ afishaFilters: filters }),
  resetHomeFilters: () => set({ homeFilters: initialFiltersState }),
  resetAfishaFilters: () => set({ afishaFilters: initialFiltersState }),
}));
