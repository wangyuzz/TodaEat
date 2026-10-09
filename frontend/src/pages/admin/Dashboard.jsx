// Recovered from deployed build. Original local names/types/comments are unavailable.
import { React } from "../../vendor/runtime.js";
import {
  C as dashboardApi,
  F as useQuery,
  L as getJSXRuntime,
  R as useNavigate,
} from "../../application.jsx";
var jsxRuntime = getJSXRuntime();
function moodEmoji(e) {
  return e === `yum` || e === `great`
    ? `😋`
    : e === `ok`
      ? `😐`
      : e === `no` || e === `meh`
        ? `😒`
        : ``;
}
function mealLabel(e) {
  return e === `lunch` ? `午餐` : e === `dinner` ? `晚餐` : `约饭`;
}
function Dashboard() {
  let n = useNavigate(),
    { data: s, isLoading: c } = useQuery({
      queryKey: [`admin`, `dashboard`],
      queryFn: () => dashboardApi.get(),
    });
  if (c) return <div className={`p-8 text-center text-text2`} children={`加载中...`} />;
  let l = (s == null ? void 0 : s.week_trend) || [],
    u = Math.max(...l.map((e) => e.count), 1);
  return (
    <div
      className={`px-5 py-4 max-w-[640px] mx-auto pb-20`}
      children={[
        <div
          className={`grid grid-cols-3 gap-2.5 mb-5`}
          children={[
            <div
              className={`bg-card rounded-2xl p-3 shadow-sm text-center`}
              children={[
                <div
                  className={`text-xl font-extrabold`}
                  children={(s == null ? void 0 : s.total_dishes) || 0}
                />,
                <div className={`text-[11px] text-text2`} children={`菜单项`} />,
              ]}
            />,
            <div
              className={`bg-card rounded-2xl p-3 shadow-sm text-center`}
              children={[
                <div
                  className={`text-xl font-extrabold text-mint`}
                  children={(s == null ? void 0 : s.enabled_dishes) || 0}
                />,
                <div className={`text-[11px] text-text2`} children={`启用中`} />,
              ]}
            />,
            <div
              className={`bg-card rounded-2xl p-3 shadow-sm text-center`}
              children={[
                <div
                  className={`text-xl font-extrabold text-text3`}
                  children={(s == null ? void 0 : s.disabled_dishes) || 0}
                />,
                <div className={`text-[11px] text-text2`} children={`已禁用`} />,
              ]}
            />,
          ]}
        />,
        <div
          className={`grid grid-cols-2 gap-2.5 mb-5`}
          children={[
            <div
              className={`bg-card rounded-2xl p-3 shadow-sm text-center`}
              children={[
                <div
                  className={`text-xl font-extrabold`}
                  children={(s == null ? void 0 : s.today_records) || 0}
                />,
                <div className={`text-[11px] text-text2`} children={`今日打卡`} />,
              ]}
            />,
            <div
              className={`bg-card rounded-2xl p-3 shadow-sm text-center`}
              children={[
                <div
                  className={`text-xl font-extrabold`}
                  children={(s == null ? void 0 : s.total_records) || 0}
                />,
                <div className={`text-[11px] text-text2`} children={`总记录`} />,
              ]}
            />,
          ]}
        />,
        <div
          className={`mb-5`}
          children={[
            <div className={`text-sm font-bold mb-2`} children={`近7天打卡趋势`} />,
            <div
              className={`bg-card rounded-2xl p-4 shadow-sm`}
              children={
                <div
                  className={`flex items-end gap-1.5 h-20`}
                  children={l.map((e, t) => (
                    <div
                      className={`flex-1 flex flex-col items-center gap-1`}
                      children={[
                        <span
                          className={`text-[10px] text-text2 font-semibold`}
                          children={e.count}
                        />,
                        <div
                          className={`w-full rounded-t-md bg-primary/70 transition-all`}
                          style={{
                            height: `${Math.max((e.count / u) * 48, 3)}px`,
                          }}
                        />,
                        <span className={`text-[9px] text-text3`} children={e.date.slice(5)} />,
                      ]}
                      key={t}
                    />
                  ))}
                />
              }
            />,
          ]}
        />,
        <div
          className={`mb-5`}
          children={[
            <div className={`text-sm font-bold mb-2`} children={`分类分布`} />,
            <div
              className={`bg-card rounded-2xl p-4 shadow-sm`}
              children={
                <div
                  className={`flex flex-wrap gap-2`}
                  children={((s == null ? void 0 : s.category_counts) || []).map((e) => (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-primary-light text-primary font-semibold`}
                      children={[e.category, <span className={`text-text2`} children={e.count} />]}
                      key={e.category}
                    />
                  ))}
                />
              }
            />,
          ]}
        />,
        <div
          className={`mb-5`}
          children={[
            <div className={`text-sm font-bold mb-2`} children={`常点菜单 TOP8`} />,
            <div
              className={`bg-card rounded-2xl overflow-hidden shadow-sm border border-border`}
              children={[
                ((s == null ? void 0 : s.top_dishes) || []).length === 0 && (
                  <div
                    className={`py-8 text-center text-sm text-text3`}
                    children={`暂无记录数据`}
                  />
                ),
                ((s == null ? void 0 : s.top_dishes) || []).map((e, t) => (
                  <div
                    onClick={() => n(`/admin/dishes/${e.dish_id}`)}
                    className={`flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 cursor-pointer transition-all active:bg-bg`}
                    children={[
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${t < 3 ? `bg-primary text-white` : `bg-bg text-text3`}`}
                        children={t + 1}
                      />,
                      <div
                        className={`flex-1 text-sm font-medium truncate`}
                        children={e.dish_name}
                      />,
                      <div
                        className={`text-xs text-primary font-semibold`}
                        children={[e.count, `次`]}
                      />,
                    ]}
                    key={e.dish_id}
                  />
                )),
              ]}
            />,
          ]}
        />,
        <div
          className={`mb-5`}
          children={[
            <div className={`text-sm font-bold mb-2`} children={`最近记录`} />,
            <div
              className={`bg-card rounded-2xl overflow-hidden shadow-sm border border-border`}
              children={[
                ((s == null ? void 0 : s.recent_records) || []).length === 0 && (
                  <div className={`py-8 text-center text-sm text-text3`} children={`暂无记录`} />
                ),
                ((s == null ? void 0 : s.recent_records) || []).map((e) => (
                  <div
                    className={`flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0`}
                    children={[
                      <span className={`text-base`} children={moodEmoji(e.mood)} />,
                      <div
                        className={`flex-1 min-w-0`}
                        children={[
                          <div className={`text-sm font-medium truncate`} children={e.dish_name} />,
                          <div
                            className={`text-[11px] text-text2`}
                            children={[e.meal_date, ` · `, mealLabel(e.meal_type)]}
                          />,
                        ]}
                      />,
                    ]}
                    key={e.id}
                  />
                )),
              ]}
            />,
          ]}
        />,
        <div
          children={[
            <div className={`text-sm font-bold mb-2`} children={`快捷操作`} />,
            <div
              className={`grid grid-cols-2 gap-2.5`}
              children={[
                <button
                  onClick={() => n(`/admin/dishes/new`)}
                  className={`bg-card rounded-2xl p-4 shadow-sm border border-border text-left transition-all active:scale-99`}
                  children={[
                    <div className={`text-2xl mb-1.5`} children={`➕`} />,
                    <div className={`text-sm font-semibold`} children={`添加菜单项`} />,
                    <div className={`text-[11px] text-text2`} children={`新增餐厅菜单项`} />,
                  ]}
                />,
                <button
                  onClick={() => n(`/admin/dishes`)}
                  className={`bg-card rounded-2xl p-4 shadow-sm border border-border text-left transition-all active:scale-99`}
                  children={[
                    <div className={`text-2xl mb-1.5`} children={`📋`} />,
                    <div className={`text-sm font-semibold`} children={`管理菜单`} />,
                    <div className={`text-[11px] text-text2`} children={`维护餐厅招牌菜`} />,
                  ]}
                />,
                <button
                  onClick={() => n(`/admin/records`)}
                  className={`bg-card rounded-2xl p-4 shadow-sm border border-border text-left transition-all active:scale-99`}
                  children={[
                    <div className={`text-2xl mb-1.5`} children={`📋`} />,
                    <div className={`text-sm font-semibold`} children={`打卡记录`} />,
                    <div className={`text-[11px] text-text2`} children={`查看每次约饭`} />,
                  ]}
                />,
                <button
                  onClick={() => n(`/admin/settings`)}
                  className={`bg-card rounded-2xl p-4 shadow-sm border border-border text-left transition-all active:scale-99`}
                  children={[
                    <div className={`text-2xl mb-1.5`} children={`⚙`} />,
                    <div className={`text-sm font-semibold`} children={`应用设置`} />,
                    <div className={`text-[11px] text-text2`} children={`名称、分类和偏好`} />,
                  ]}
                />,
              ]}
            />,
          ]}
        />,
      ]}
    />
  );
}
export { Dashboard as default };
