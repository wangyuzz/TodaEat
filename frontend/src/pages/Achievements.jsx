// Recovered from deployed build. Original local names/types/comments are unavailable.
import { React } from "../vendor/runtime.js";
import {
  F as useQuery,
  L as getJSXRuntime,
  R as useNavigate,
  s as PageHeader,
  x as achievementApi,
} from "../application.jsx";
var jsxRuntime = getJSXRuntime();
function formatUnlockDate(e) {
  if (!e) return ``;
  let t = new Date(e);
  return Number.isNaN(t.getTime()) ? `` : `${t.getMonth() + 1}月${t.getDate()}日`;
}
function Achievements() {
  let t = useNavigate(),
    { data: s } = useQuery({
      queryKey: [`achievements`],
      queryFn: () => achievementApi.list(),
    }),
    c = Array.isArray(s) ? s : [],
    l = c.filter((e) => e.is_unlocked).length,
    u = c.filter((e) => e.condition === `auto`).length,
    d = c.length - u,
    f = c.length > 0 ? Math.round((l / c.length) * 100) : 0,
    p = c
      .slice()
      .sort((e, t) => (e.is_unlocked === t.is_unlocked ? e.id - t.id : e.is_unlocked ? -1 : 1));
  return (
    <div
      className={`animate-fadeUp`}
      children={[
        <PageHeader
          title={`成就墙`}
          subtitle={`记录你们一起解锁的小目标`}
          meta={`${l}/${c.length}`}
          onBack={() => t(-1)}
        />,
        <div
          className={`px-5 py-4 max-w-[640px] mx-auto`}
          children={[
            <div
              className={`bg-card rounded-2xl border border-border p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,.04),0_4px_12px_rgba(0,0,0,.04)]`}
              children={[
                <div
                  className={`flex items-end justify-between mb-2.5`}
                  children={[
                    <div
                      children={[
                        <div className={`text-[13px] text-text2 mb-0.5`} children={`成就进度`} />,
                        <div
                          className={`text-2xl font-extrabold tracking-tight`}
                          children={[f, `%`]}
                        />,
                      ]}
                    />,
                    <div
                      className={`text-right text-xs text-text2 leading-relaxed`}
                      children={[<div children={[`自动 `, u]} />, <div children={[`手动 `, d]} />]}
                    />,
                  ]}
                />,
                <div
                  className={`h-2 rounded-full bg-bg overflow-hidden`}
                  children={
                    <div
                      className={`h-full rounded-full bg-primary transition-all`}
                      style={{
                        width: `${f}%`,
                      }}
                    />
                  }
                />,
              ]}
            />,
            <div
              className={`grid grid-cols-3 gap-3`}
              children={p.map((e) => (
                <div
                  className={`bg-card rounded-2xl p-3.5 pt-4 text-center shadow-[0_1px_3px_rgba(0,0,0,.04),0_4px_12px_rgba(0,0,0,.04)] border transition-all relative overflow-hidden ${e.is_unlocked ? `border-primary/20` : `border-border opacity-45 grayscale-[.9]`}`}
                  children={[
                    e.is_unlocked && (
                      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-primary`} />
                    ),
                    <span className={`text-[32px] block mb-1.5`} children={e.icon} />,
                    <div className={`text-xs font-semibold mb-0.5`} children={e.name} />,
                    <div
                      className={`text-[10px] text-text2 leading-snug min-h-[28px]`}
                      children={e.description}
                    />,
                    <div
                      className={`mt-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-semibold ${e.is_unlocked ? `bg-primary-light text-primary` : `bg-bg text-text3`}`}
                      children={
                        e.is_unlocked
                          ? `已解锁 ${formatUnlockDate(e.unlocked_at)}`
                          : e.condition === `auto`
                            ? `自动检测`
                            : `手动成就`
                      }
                    />,
                  ]}
                  key={e.id}
                />
              ))}
            />,
            c.length === 0 && (
              <div className={`py-16 text-center text-sm text-text3`} children={`还没有成就`} />
            ),
          ]}
        />,
      ]}
    />
  );
}
export { Achievements as default };
