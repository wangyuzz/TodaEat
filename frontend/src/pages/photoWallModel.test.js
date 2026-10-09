import assert from 'node:assert/strict';
import test from 'node:test';
import { albumDate, albumMonths, albumPhotos } from './photoWallModel.js';

test('calendar dates stay on the recorded day across timezones and reject rollover', () => {
  const previousZone = process.env.TZ;
  try {
    for (const zone of ['Asia/Shanghai', 'Pacific/Honolulu']) {
      process.env.TZ = zone;
      const date = albumDate('2026-10-09');
      assert.equal(date.day, '09');
      assert.equal(date.month, '2026-10');
      assert.match(date.label, /9日.*周五/);
      assert.equal(albumDate('2024-02-29').day, '29');
      for (const invalid of ['2026-02-29', '2026-13-01', '2026-10-32', '2026-1-1', '', null]) {
        assert.equal(albumDate(invalid), null);
      }
    }
  } finally {
    if (previousZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousZone;
  }
});

test('photos accept old stringified arrays and retain repeated images and gallery order', () => {
  assert.deepEqual(albumPhotos('["a.jpg","",null,"b.jpg","a.jpg"]'), ['a.jpg', 'b.jpg', 'a.jpg']);
  assert.deepEqual(albumPhotos(['a.jpg', 4, ' ', 'b.jpg']), ['a.jpg', 'b.jpg']);
  for (const invalid of [null, undefined, 'invalid', '{}', { photos: [] }]) assert.deepEqual(albumPhotos(invalid), []);
});

test('month grouping sorts visits, keeps separate same-day meals and preserves source data', () => {
  const days = [
    { visit_id: 1, visit_date: '2026-09-30', photos: ['september.jpg'] },
    { visit_id: 2, visit_date: '2026-10-09', photos: ['lunch.jpg'] },
    { visit_id: 3, visit_date: '2026-10-09', photos: '["dinner.jpg","dessert.jpg"]' },
    { visit_id: 4, visit_date: '2026-10-10', photos: [] },
    { visit_id: 5, visit_date: 'bad-date', photos: ['old.jpg'] },
    null,
  ];
  const source = JSON.stringify(days);
  const months = albumMonths(days);
  assert.deepEqual(months.map(month => month.key), ['2026-10', '2026-09', 'undated']);
  assert.deepEqual(months[0].visits.map(visit => visit.visit_id), [3, 2]);
  assert.equal(months[0].photoCount, 3);
  assert.equal(months[2].label, '日期待确认');
  assert.equal(JSON.stringify(days), source);
  assert.deepEqual(albumMonths({ days: [] }), []);
});
