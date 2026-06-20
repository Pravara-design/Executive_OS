import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const KEY = "rabbitt:activeDatasetId";

interface Ctx {
  activeDatasetId: string | null;
  setActiveDatasetId: (id: string | null) => void;
}

const DatasetContext = createContext<Ctx | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [activeDatasetId, setActiveDatasetIdState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem(KEY);
    if (v) setActiveDatasetIdState(v);
  }, []);

  const setActiveDatasetId = (id: string | null) => {
    setActiveDatasetIdState(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(KEY, id);
      else window.localStorage.removeItem(KEY);
    }
  };

  return (
    <DatasetContext.Provider value={{ activeDatasetId, setActiveDatasetId }}>
      {children}
    </DatasetContext.Provider>
  );
}

export function useActiveDataset() {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error("useActiveDataset must be used within DatasetProvider");
  return ctx;
}
