interface Window {
  __e2eSimulateScan?: (data: string) => void;
  __e2eScanLocationsLoaded?: number;
  __e2eSeedDb?: (
    data: Record<string, ReadonlyArray<Record<string, unknown>>>,
  ) => Promise<void>;
}
