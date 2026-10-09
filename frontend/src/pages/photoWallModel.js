const dateLabel = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', timeZone: 'UTC',
});
const monthLabel = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: 'long', timeZone: 'UTC',
});

// Visit dates describe a calendar day, independent of the browser's timezone.
export function albumDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return {
    value, label: dateLabel.format(date), day: String(date.getUTCDate()).padStart(2, '0'),
    month: value.slice(0, 7), monthLabel: monthLabel.format(date),
  };
}

export function albumPhotos(value) {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return []; }
  }
  return Array.isArray(value) ? value.filter(photo => typeof photo === 'string' && photo.trim()) : [];
}

export function albumMonths(days) {
  const months = new Map();
  for (const visit of Array.isArray(days) ? days : []) {
    if (!visit || typeof visit !== 'object') continue;
    const photos = albumPhotos(visit.photos);
    if (!photos.length) continue;
    const date = albumDate(visit.visit_date);
    const key = date?.month ?? 'undated';
    if (!months.has(key)) months.set(key, {
      key, label: date?.monthLabel ?? '日期待确认', visits: [], photoCount: 0,
    });
    const month = months.get(key);
    month.visits.push({ ...visit, photos, date });
    month.photoCount += photos.length;
  }
  return Array.from(months.values()).sort((a, b) => {
    if (a.key === 'undated') return 1;
    if (b.key === 'undated') return -1;
    return b.key.localeCompare(a.key);
  }).map(month => ({
    ...month,
    visits: month.visits.sort((a, b) =>
      (b.date?.value ?? '').localeCompare(a.date?.value ?? '') || Number(b.visit_id) - Number(a.visit_id)),
  }));
}
