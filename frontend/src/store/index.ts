import { create } from 'zustand'

interface Filters {
  start_date?: string
  end_date?: string
  police_station?: string
  vehicle_type?: string
  validation_status?: string
}

interface FilterOptions {
  police_stations: string[]
  vehicle_types: string[]
  months: string[]
  junctions: string[]
  validation_statuses: string[]
}

interface AppState {
  // Filters
  filters: Filters
  setFilter: (key: keyof Filters, value: string | undefined) => void
  clearFilters: () => void

  // Filter options
  filterOptions: FilterOptions | null
  setFilterOptions: (opts: FilterOptions) => void

  // UI
  sidebarOpen: boolean
  toggleSidebar: () => void
  activeView: string
  setActiveView: (view: string) => void

  // Map
  selectedJunction: string | null
  setSelectedJunction: (name: string | null) => void
  mapLayer: 'heatmap' | 'markers' | 'clusters'
  setMapLayer: (layer: 'heatmap' | 'markers' | 'clusters') => void
}

export const useStore = create<AppState>((set) => ({
  // Filters
  filters: {},
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  clearFilters: () => set({ filters: {} }),

  // Filter options
  filterOptions: null,
  setFilterOptions: (opts) => set({ filterOptions: opts }),

  // UI
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  activeView: 'command-center',
  setActiveView: (view) => set({ activeView: view }),

  // Map
  selectedJunction: null,
  setSelectedJunction: (name) => set({ selectedJunction: name }),
  mapLayer: 'heatmap',
  setMapLayer: (layer) => set({ mapLayer: layer }),
}))
