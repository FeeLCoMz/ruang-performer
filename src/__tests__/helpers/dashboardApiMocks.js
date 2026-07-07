export function createDefaultDashboardApiResponses() {
  return {
    fetchSetLists: [],
    fetchBands: [],
    fetchSongs: [],
    fetchGigs: [],
    fetchPracticeSessions: [],
    fetchPopularSongs: { youtubeSongs: [] },
  };
}

export function applyDefaultDashboardApiMocks(apiClient, overrides = {}) {
  const responses = { ...createDefaultDashboardApiResponses(), ...overrides };
  apiClient.fetchSetLists.mockResolvedValue(responses.fetchSetLists);
  apiClient.fetchBands.mockResolvedValue(responses.fetchBands);
  apiClient.fetchSongs.mockResolvedValue(responses.fetchSongs);
  apiClient.fetchGigs.mockResolvedValue(responses.fetchGigs);
  apiClient.fetchPracticeSessions.mockResolvedValue(responses.fetchPracticeSessions);
  apiClient.fetchPopularSongs.mockResolvedValue(responses.fetchPopularSongs);
}
