import { create } from 'zustand';
import { persist } from 'zustand/middleware';
interface UIState {
  workspaceId: string | null;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  setWorkspace: (id: string | null) => void;
  toggleTheme: () => void;
  setSidebar: (open: boolean) => void;
}
export const useUI = create<UIState>()(
  persist(
    (set) => ({
      workspaceId: null,
      theme: 'light',
      sidebarOpen: false,
      setWorkspace: (id) => set({ workspaceId: id }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setSidebar: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'taskflow-ui',
      partialize: (state) => ({ workspaceId: state.workspaceId, theme: state.theme }),
    },
  ),
);
