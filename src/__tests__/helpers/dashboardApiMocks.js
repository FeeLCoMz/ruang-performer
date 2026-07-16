export function createDefaultDashboardApiResponses() {
  return {
    fetchSetLists: [],
    fetchBands: [],
    fetchSongs: [],
    fetchGigs: [],
    fetchPopularSongs: { youtubeSongs: [] },
  };
}

export function applyDefaultDashboardApiMocks(apiClient, overrides = {}) {
  const responses = { ...createDefaultDashboardApiResponses(), ...overrides };
  apiClient.fetchSetLists.mockResolvedValue(responses.fetchSetLists);
  apiClient.fetchBands.mockResolvedValue(responses.fetchBands);
  apiClient.fetchSongs.mockResolvedValue(responses.fetchSongs);
  apiClient.fetchGigs.mockResolvedValue(responses.fetchGigs);
  apiClient.fetchPopularSongs.mockResolvedValue(responses.fetchPopularSongs);
}
