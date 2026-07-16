export function buildRecentActivities({ bandsData = [], setlistsData = [], songsData = [], gigsData = [], now = new Date() }) {
  const activities = [];

  if (bandsData.length > 0) {
    activities.push({ icon: '🎸', text: `${bandsData.length} band terdaftar`, time: 'Recently' });
  }

  if (setlistsData.length > 0) {
    activities.push({ icon: '📋', text: `${setlistsData.length} setlist tersedia`, time: 'Recently' });
  }

  if (songsData.length > 0) {
    activities.unshift({ icon: '🎵', text: `${songsData.length} lagu dalam database`, time: 'Always' });
  }

  if (gigsData.length > 0) {
    const completedGigs = gigsData.filter(g => new Date(g.date) < now).length;
    activities.push({ icon: '🎤', text: `${completedGigs} gig telah selesai`, time: 'All time' });
  }

  return activities.slice(0, 4);
}

export function buildUpcomingEvents({ gigsData = [], now = new Date() }) {
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcomingGigs = gigsData
    .filter(g => {
      const gigDate = new Date(g.date);
      return gigDate >= now && gigDate <= sevenDaysLater;
    })
    .map(g => ({
      type: 'gig',
      id: g.id,
      title: `${g.venue || 'Venue'} - ${g.bandName || 'Gig'}`,
      date: g.date,
      icon: '🎤',
    }));

  return upcomingGigs
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);
}
