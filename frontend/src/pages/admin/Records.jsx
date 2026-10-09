// Recovered from deployed build. Original local names/types/comments are unavailable.
import { React } from "../../vendor/runtime.js";
import {
  E as recordApi,
  F as useQuery,
  G as interopModule,
  I as useQueryClient,
  L as getJSXRuntime,
  N as toast,
  P as useMutation,
  W as getReact,
} from "../../application.jsx";
var jsxRuntime = getJSXRuntime();
function moodEmoji(e) {
  return e === `yum` || e === `great`
    ? `😋`
    : e === `ok`
      ? `😐`
      : e === `no` || e === `meh`
        ? `😒`
        : `🍽`;
}
function mealLabel(e) {
  return e === `lunch` ? `午餐` : `晚餐`;
}
function Records() {
  let n = useQueryClient(),
    [i, s] = (0, React.useState)(1),
    [f, p] = (0, React.useState)(``),
    [m, h] = (0, React.useState)(``),
    [g, _] = (0, React.useState)(``),
    v = {
      pageSize: `30`,
      page: String(i),
    };
  (f && (v.meal_type = f), m && (v.date_from = m), g && (v.date_to = g));
  let { data: y, isLoading: b } = useQuery({
      queryKey: [`admin`, `records`, v],
      queryFn: () => recordApi.list(v),
    }),
    x = (y == null ? void 0 : y.items) || [],
    S = (y == null ? void 0 : y.total) || 0,
    C = Math.ceil(S / 30),
    w = useMutation({
      mutationFn: (t) => recordApi.delete(t),
      onSuccess: () => {
        (n.invalidateQueries({
          queryKey: [`admin`, `records`],
        }),
          toast.success(`已删除`));
      },
    }),
    T = (e) =>
      `px-3 py-1.5 rounded-full text-xs border-[1.5px] transition-all ${e ? `bg-primary text-white border-primary` : `border-border text-text2`}`;
  return (
    <div
      className={`px-5 py-4 max-w-[640px] mx-auto pb-20`}
      children={[
        <div
          className={`flex items-center justify-between mb-3`}
          children={[
            <div className={`text-lg font-bold`} children={`用餐记录`} />,
            <span className={`text-xs text-text3`} children={[`共 `, S, ` 条`]} />,
          ]}
        />,
        <div
          className={`flex flex-wrap gap-1.5 mb-3`}
          children={[
            <button
              onClick={() => {
                (p(``), s(1));
              }}
              className={T(f === ``)}
              children={`全部`}
            />,
            <button
              onClick={() => {
                (p(`lunch`), s(1));
              }}
              className={T(f === `lunch`)}
              children={`午餐`}
            />,
            <button
              onClick={() => {
                (p(`dinner`), s(1));
              }}
              className={T(f === `dinner`)}
              children={`晚餐`}
            />,
          ]}
        />,
        <div
          className={`bg-card rounded-2xl p-3 shadow-sm border border-border mb-3`}
          children={
            <div
              className={`flex items-center gap-2`}
              children={[
                <input
                  type={`date`}
                  value={m}
                  onChange={(e) => {
                    (h(e.target.value), s(1));
                  }}
                  className={`flex-1 min-w-0 py-2 px-2.5 rounded-lg border-[1.5px] border-border bg-bg text-xs outline-none focus:border-primary`}
                />,
                <span className={`text-xs text-text3`} children={`—`} />,
                <input
                  type={`date`}
                  value={g}
                  onChange={(e) => {
                    (_(e.target.value), s(1));
                  }}
                  className={`flex-1 min-w-0 py-2 px-2.5 rounded-lg border-[1.5px] border-border bg-bg text-xs outline-none focus:border-primary`}
                />,
                (m || g) && (
                  <button
                    onClick={() => {
                      (h(``), _(``), s(1));
                    }}
                    className={`text-[11px] text-primary font-semibold flex-shrink-0`}
                    children={`清除`}
                  />
                ),
              ]}
            />
          }
        />,
        b ? (
          <div className={`py-12 text-center text-text2`} children={`加载中...`} />
        ) : (
          <div
            className={`bg-card rounded-2xl overflow-hidden shadow-sm border border-border`}
            children={[
              x.map((e) => (
                <div
                  className={`flex items-center gap-2.5 px-4 py-2.5 border-b border-border last:border-0`}
                  children={[
                    <span className={`text-base flex-shrink-0`} children={moodEmoji(e.mood)} />,
                    <div
                      className={`flex-1 min-w-0 overflow-hidden`}
                      children={[
                        <div className={`text-sm font-semibold truncate`} children={e.dish_name} />,
                        <div
                          className={`text-[11px] text-text2 truncate`}
                          children={[
                            e.meal_date,
                            ` · `,
                            mealLabel(e.meal_type),
                            e.rating > 0 && (
                              <span className={`ml-1`} children={[`评分`, e.rating]} />
                            ),
                            e.remark && <span className={`ml-1`} children={[`· `, e.remark]} />,
                          ]}
                        />,
                      ]}
                    />,
                    e.photo && (
                      <img
                        src={e.photo}
                        alt={``}
                        className={`w-9 h-9 rounded-lg object-cover flex-shrink-0`}
                      />
                    ),
                    <button
                      onClick={() => {
                        confirm(`确定删除此记录？`) && w.mutate(e.id);
                      }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs bg-bg transition-all active:bg-red-50 active:text-red-500 flex-shrink-0`}
                      children={`🗑`}
                    />,
                  ]}
                  key={e.id}
                />
              )),
              x.length === 0 && (
                <div className={`py-12 text-center text-sm text-text3`} children={`暂无记录`} />
              ),
            ]}
          />
        ),
        C > 1 && (
          <div
            className={`flex items-center justify-center gap-2 mt-4`}
            children={[
              <button
                onClick={() => s(1)}
                disabled={i <= 1}
                className={`px-3 py-1.5 rounded-full text-xs border border-border disabled:opacity-30`}
                children={`首页`}
              />,
              <button
                onClick={() => s((e) => Math.max(1, e - 1))}
                disabled={i <= 1}
                className={`px-3 py-1.5 rounded-full text-xs border border-border disabled:opacity-30`}
                children={`上一页`}
              />,
              <span className={`text-xs text-text2`} children={[i, `/`, C]} />,
              <button
                onClick={() => s((e) => Math.min(C, e + 1))}
                disabled={i >= C}
                className={`px-3 py-1.5 rounded-full text-xs border border-border disabled:opacity-30`}
                children={`下一页`}
              />,
              <button
                onClick={() => s(C)}
                disabled={i >= C}
                className={`px-3 py-1.5 rounded-full text-xs border border-border disabled:opacity-30`}
                children={`末页`}
              />,
            ]}
          />
        ),
      ]}
    />
  );
}
export { Records as default };
