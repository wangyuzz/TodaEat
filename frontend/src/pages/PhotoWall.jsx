import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Camera, Images } from 'lucide-react';
import { PageHeader, PhotoViewer, photoWallApi } from '../application.jsx';
import { albumMonths } from './photoWallModel.js';
import './PhotoWall.css';

const moods = {
  happy: { emoji: '😊', label: '开心' }, love: { emoji: '🥰', label: '心动' },
  full: { emoji: '😋', label: '满足' }, ok: { emoji: '😐', label: '平静' },
  meh: { emoji: '😕', label: '一般' },
};
const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency', currency: 'CNY', maximumFractionDigits: 0,
});

function MoodTag({ person, mood }) {
  const detail = moods[mood];
  if (!detail) return null;
  return <span className="album-mood" aria-label={`${person}的心情：${detail.label}`}>
    {person} <span aria-hidden="true">{detail.emoji}</span>
  </span>;
}

function VisitAlbum({ visit, onOpen, onRestaurant }) {
  const cover = visit.photos.slice(0, 4);
  const remaining = visit.photos.length - cover.length;
  const items = Array.isArray(visit.items) ? visit.items : [];
  const restaurantName = visit.restaurant_name || '一起吃过的一餐';
  return <article className="album-entry">
    <header className="album-entry-header">
      <div className="album-date-badge" aria-hidden="true">{visit.date?.day ?? '—'}</div>
      <div className="album-entry-heading">
        <time dateTime={visit.date?.value}>{visit.date?.label ?? '日期待确认'}</time>
        <button type="button" className="album-restaurant" onClick={() => onRestaurant(visit.restaurant_id)}>
          <span>{restaurantName}</span><ArrowUpRight size={15} aria-hidden="true" />
        </button>
      </div>
      <span className="album-entry-count">{visit.photos.length} 张</span>
    </header>
    <div className={`album-mosaic album-mosaic-${cover.length}`}>
      {cover.map((photo, index) => <button
        type="button" className="album-photo" key={`${photo}-${index}`}
        aria-label={`查看${restaurantName}第 ${index + 1} 张照片${index === cover.length - 1 && remaining > 0 ? `，另有 ${remaining} 张` : ''}`}
        onClick={() => onOpen(visit.photos, index)}
      >
        <img src={photo} alt={`${restaurantName}的用餐照片 ${index + 1}`} loading="lazy" />
        {index === cover.length - 1 && remaining > 0 && <span className="album-photo-more">+{remaining}</span>}
      </button>)}
    </div>
    <div className="album-entry-footer">
      <div className="album-details">
        {visit.cost > 0 && <span className="album-cost">{money.format(visit.cost)}</span>}
        <MoodTag person="我" mood={visit.my_mood} />
        <MoodTag person="她" mood={visit.her_mood} />
      </div>
      {visit.remark && <p className="album-remark">{visit.remark}</p>}
      {items.length > 0 && <ul className="album-dishes" aria-label="这一餐的菜品">
        {items.map((item, index) => <li key={`${item.dish_id ?? ''}-${index}`}>{item.dish_name}</li>)}
      </ul>}
    </div>
  </article>;
}

function AlbumPlaceholder({ loading, failed, onAction }) {
  if (loading) return <div className="album-loading" role="status" aria-label="正在加载相册">
    {[1, 2, 3].map(index => <div className="album-loading-card" key={index}><div /><div /></div>)}
  </div>;
  return <div className="album-empty" role={failed ? 'alert' : undefined}>
    <Camera size={42} strokeWidth={1.5} aria-hidden="true" />
    <h2>{failed ? '相册暂时没有加载出来' : '给下一餐留一张照片'}</h2>
    <p>{failed ? '稍后重试，就能继续翻看一起吃饭的回忆。' : '记录餐厅、心情和照片，让一起吃过的每一餐都有迹可循。'}</p>
    <button type="button" className="album-action" onClick={onAction}>{failed ? '重新加载' : '去记录一餐'}</button>
  </div>;
}

export default function PhotoWall() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['photo-wall'], queryFn: () => photoWallApi.get(),
  });
  const [selectedMonth, setSelectedMonth] = useState('');
  const [viewer, setViewer] = useState(null);
  const months = useMemo(() => albumMonths(data?.days), [data]);
  const monthFilter = months.some(month => month.key === selectedMonth) ? selectedMonth : '';
  const visible = monthFilter ? months.filter(month => month.key === monthFilter) : months;
  const visitCount = months.reduce((total, month) => total + month.visits.length, 0);
  const photoCount = months.reduce((total, month) => total + month.photoCount, 0);

  return <div className="album-page">
    <PageHeader title="相册" subtitle="把每一次约饭收进回忆" icon={Images}
      meta={photoCount > 0 ? `${visitCount} 次打卡 · ${photoCount} 张` : undefined} />
    <main className="album-content">
      {isLoading || isError || !months.length ? <AlbumPlaceholder
        loading={isLoading} failed={isError}
        onAction={isError ? () => refetch() : () => navigate('/check-in')}
      /> : <>
        <div className="album-toolbar">
          <div><p className="album-eyebrow">一起吃过的日子</p><h2>每一餐，都是一页回忆</h2></div>
          <label className="album-month-filter"><span className="album-visually-hidden">按月份浏览相册</span>
            <select value={monthFilter} onChange={event => setSelectedMonth(event.target.value)}>
              <option value="">全部月份</option>
              {months.map(month => <option key={month.key} value={month.key}>{month.label}</option>)}
            </select>
          </label>
        </div>
        {visible.map(month => <section className="album-month" key={month.key} aria-label={month.label}>
          <div className="album-month-header"><h3>{month.label}</h3><span>{month.visits.length} 次打卡 · {month.photoCount} 张照片</span></div>
          <div className="album-entries">{month.visits.map((visit, index) => <VisitAlbum
            key={visit.visit_id ?? `${visit.visit_date}-${index}`} visit={visit}
            onOpen={(photos, photoIndex) => setViewer({ photos, index: photoIndex })}
            onRestaurant={id => navigate(`/restaurants/${id}`)}
          />)}</div>
        </section>)}
        <p className="album-end">回忆先翻到这里，下次约饭再续。</p>
      </>}
    </main>
    {viewer && createPortal(<PhotoViewer photos={viewer.photos} idx={viewer.index}
      setIdx={index => setViewer(current => current ? { ...current, index } : null)}
      onClose={() => setViewer(null)} />, document.body)}
  </div>;
}
