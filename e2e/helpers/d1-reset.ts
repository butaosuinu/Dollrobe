const WORKERS_BASE_URL = "http://localhost:8787";

export const resetD1 = async (): Promise<void> => {
  const response = await fetch(`${WORKERS_BASE_URL}/api/test/reset`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`D1 reset failed: ${response.status}`);
  }
};
