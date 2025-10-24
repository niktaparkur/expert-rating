import { create } from "zustand";
import { UserData } from "../types";

interface UserState {
  currentUser: UserData | null;
  setCurrentUser: (user: UserData | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
}));
