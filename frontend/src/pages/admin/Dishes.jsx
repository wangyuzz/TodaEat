// Recovered from deployed build. Original local names/types/comments are unavailable.
import { React } from "../../vendor/runtime.js";
import {
  F as useQuery,
  G as interopModule,
  I as useQueryClient,
  L as getJSXRuntime,
  N as toast,
  O as settingsApi,
  P as useMutation,
  R as useNavigate,
  W as getReact,
  m as IconSearch,
  w as dishApi,
} from "../../application.jsx";
import { t as parseArray } from "../../components/utils.jsx";
var jsxRuntime = getJSXRuntime(),
  m = {
    川菜: `🌶`,
    粤菜: `🐟`,
    家常菜: `🍳`,
    快手菜: `⚡`,
    汤品: `🍲`,
    主食: `🍚`,
    小食: `🥟`,
    湘菜: `🔥`,
    东北菜: `🥬`,
    新疆菜: `🐑`,
    云南菜: `🍄`,
    贵州菜: `🌶`,
  };
function dishImageURL(e) {
  return m[e.category] || `🍽`;
}
function Dishes() {
  let t = useNavigate(),
    r = useQueryClient(),
    [c, m] = (0, React.useState)(``),
    [h, g] = (0, React.useState)(``),
    [_, v] = (0, React.useState)(``),
    [y, b] = (0, React.useState)(``),
    [x, S] = (0, React.useState)(1),
    [C, w] = (0, React.useState)(new Set()),
    [T, E] = (0, React.useState)(false),
    [D, O] = (0, React.useState)(false),
    [k, A] = (0, React.useState)(``),
    [j, M] = (0, React.useState)(false),
    N = (0, React.useRef)(null);
  (0, React.useEffect)(() => {
    j && N.current && N.current.focus();
  }, [j]);
  let { data: P } = useQuery({
      queryKey: [`settings`],
      queryFn: () => settingsApi.get(),
    }),
    F = parseArray(P == null ? void 0 : P.categories).filter((e) => typeof e == `string`);
  F.length === 0 && F.push(`家常菜`, `川菜`, `粤菜`, `快手菜`, `汤品`, `主食`);
  let I = {
    pageSize: `30`,
    page: String(x),
  };
  (c && (I.search = c), h && (I.category = h), _ && (I.meal_type = _), y && (I.enabled = y));
  let { data: L, isLoading: R } = useQuery({
      queryKey: [`admin`, `dishes`, I],
      queryFn: () => dishApi.list(I),
    }),
    z = (L == null ? void 0 : L.items) || [],
    B = (L == null ? void 0 : L.total) || 0,
    V = Math.ceil(B / 30),
    H = useMutation({
      mutationFn: (e) => dishApi.delete(e),
      onSuccess: () => {
        (r.invalidateQueries({
          queryKey: [`admin`, `dishes`],
        }),
          toast.success(`已删除`));
      },
    }),
    U = useMutation({
      mutationFn: (e) => dishApi.clone(e),
      onSuccess: () => {
        (r.invalidateQueries({
          queryKey: [`admin`, `dishes`],
        }),
          toast.success(`已克隆`));
      },
    }),
    W = useMutation({
      mutationFn: (e) => dishApi.toggle(e),
      onSuccess: () => {
        r.invalidateQueries({
          queryKey: [`admin`, `dishes`],
        });
      },
    }),
    G = useMutation({
      mutationFn: ({ ids: e, enabled: t }) => dishApi.batchToggle(e, t),
      onSuccess: () => {
        (r.invalidateQueries({
          queryKey: [`admin`, `dishes`],
        }),
          w(new Set()),
          toast.success(`批量操作成功`));
      },
    }),
    K = useMutation({
      mutationFn: (e) => dishApi.batchDelete(e),
      onSuccess: () => {
        (r.invalidateQueries({
          queryKey: [`admin`, `dishes`],
        }),
          w(new Set()),
          toast.success(`批量删除成功`));
      },
    }),
    q = useMutation({
      mutationFn: ({ ids: e, category: t }) => dishApi.batchCategory(e, t),
      onSuccess: () => {
        (r.invalidateQueries({
          queryKey: [`admin`, `dishes`],
        }),
          w(new Set()),
          O(false),
          toast.success(`分类已修改`));
      },
    }),
    J = (0, React.useCallback)((e) => {
      w((t) => {
        let n = new Set(t);
        return (n.has(e) ? n.delete(e) : n.add(e), n);
      });
    }, []),
    Y = (0, React.useCallback)(() => {
      C.size === z.length ? w(new Set()) : w(new Set(z.map((e) => e.id)));
    }, [z, C.size]),
    X = c || h || _ || y,
    Z = () => {
      (m(``), g(``), v(``), b(``), S(1));
    },
    Q = (e) =>
      `px-3 py-1.5 rounded-full text-xs border-[1.5px] transition-all whitespace-nowrap flex-shrink-0 ${e ? `bg-primary text-white border-primary` : `border-border text-text2`}`,
    $ = (e, t) =>
      e
        ? `px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary text-white`
        : `px-2.5 py-1 rounded-full text-[11px] font-semibold border border-border text-text3`;
  return (
    <div
      className={`py-4 max-w-[640px] mx-auto pb-20`}
      children={[
        <div
          className={`flex items-center justify-between mb-3 px-5`}
          children={[
            <div className={`text-lg font-bold`} children={`菜单项维护`} />,
            <div
              className={`flex items-center gap-1.5`}
              children={[
                <button
                  onClick={() => M(!j)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${j || c ? `bg-primary text-white` : `bg-card border border-border text-text2`}`}
                  children={<IconSearch size={15} />}
                />,
                <button
                  onClick={() => {
                    (E(!T), w(new Set()));
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border-[1.5px] transition-all ${T ? `bg-primary text-white border-primary` : `border-border text-text2`}`}
                  children={T ? `取消` : `批量`}
                />,
                <button
                  onClick={() => t(`/admin/dishes/new`)}
                  className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-4 rounded-full text-xs font-semibold bg-primary text-white transition-all active:scale-96`}
                  children={`+ 添加`}
                />,
              ]}
            />,
          ]}
        />,
        j && (
          <div
            className={`mb-2 px-5`}
            children={
              <div
                className={`flex items-stretch rounded-xl border-[1.5px] border-border bg-card overflow-hidden transition-all focus-within:border-primary`}
                children={[
                  <IconSearch size={15} className={`flex-shrink-0 my-auto ml-3 text-text3`} />,
                  <input
                    ref={N}
                    type={`text`}
                    value={c}
                    onChange={(e) => {
                      (m(e.target.value), S(1));
                    }}
                    placeholder={`搜索菜单项...`}
                    className={`flex-1 min-w-0 py-2 px-2.5 bg-transparent text-sm outline-none`}
                  />,
                  c && (
                    <button
                      onClick={() => {
                        (m(``), S(1));
                      }}
                      className={`flex-shrink-0 px-2.5 text-text3 text-xs hover:text-primary transition-colors`}
                      children={`✕`}
                    />
                  ),
                ]}
              />
            }
          />
        ),
        <div
          className={`flex gap-1.5 overflow-x-auto overscroll-x-contain scrollbar-none px-5`}
          style={{
            WebkitOverflowScrolling: `touch`,
          }}
          children={[
            <button
              onClick={() => {
                (g(``), S(1));
              }}
              className={Q(h === ``)}
              children={`全部`}
            />,
            F.map((e) => (
              <button
                onClick={() => {
                  (g(h === e ? `` : e), S(1));
                }}
                className={Q(h === e)}
                children={e}
                key={e}
              />
            )),
          ]}
        />,
        <div
          className={`flex items-center gap-1 mt-2 px-5 flex-wrap`}
          children={[
            <span className={`text-[10px] text-text3 font-semibold mr-0.5`} children={`场景`} />,
            <button
              onClick={() => {
                (v(``), S(1));
              }}
              className={$(_ === ``)}
              children={`全部`}
            />,
            <button
              onClick={() => {
                (v(`lunch`), S(1));
              }}
              className={$(_ === `lunch`)}
              children={`午餐`}
            />,
            <button
              onClick={() => {
                (v(`dinner`), S(1));
              }}
              className={$(_ === `dinner`)}
              children={`晚餐`}
            />,
            <span className={`w-px h-4 bg-border mx-1`} />,
            [
              {
                key: ``,
                label: `全部`,
              },
              {
                key: `true`,
                label: `启用`,
              },
              {
                key: `false`,
                label: `禁用`,
              },
            ].map((e) => (
              <button
                onClick={() => {
                  (b(e.key), S(1));
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${y === e.key ? (e.key === `false` ? `bg-red-light text-red` : e.key === `true` ? `bg-mint-light text-mint` : `bg-primary text-white`) : `border border-border text-text3`}`}
                children={e.label}
                key={e.key}
              />
            )),
          ]}
        />,
        X && (
          <div
            className={`flex items-center gap-2 mt-2 px-5`}
            children={[
              <span className={`text-[11px] text-text2`} children={[`共 `, B, ` 条`]} />,
              <button onClick={Z} className={`text-[11px] text-primary`} children={`清除筛选`} />,
            ]}
          />
        ),
        <div
          className={`px-5 mt-3`}
          children={[
            T && C.size > 0 && (
              <div
                className={`mb-3 bg-primary-light rounded-2xl p-3 flex items-center gap-2 flex-wrap`}
                children={[
                  <span
                    className={`text-xs font-semibold text-primary`}
                    children={[`已选 `, C.size, ` 项`]}
                  />,
                  <button
                    onClick={Y}
                    className={`px-2.5 py-1 rounded-full text-[11px] bg-card font-semibold`}
                    children={C.size === z.length ? `取消全选` : `全选当前页`}
                  />,
                  <button
                    onClick={() =>
                      G.mutate({
                        ids: [...C],
                        enabled: true,
                      })
                    }
                    className={`px-2.5 py-1 rounded-full text-[11px] bg-mint text-white font-semibold`}
                    children={`批量启用`}
                  />,
                  <button
                    onClick={() =>
                      G.mutate({
                        ids: [...C],
                        enabled: false,
                      })
                    }
                    className={`px-2.5 py-1 rounded-full text-[11px] bg-text3 text-white font-semibold`}
                    children={`批量禁用`}
                  />,
                  <button
                    onClick={() => O(true)}
                    className={`px-2.5 py-1 rounded-full text-[11px] bg-primary text-white font-semibold`}
                    children={`改分类`}
                  />,
                  <button
                    onClick={() => {
                      confirm(`确定删除选中的 ${C.size} 个菜单项？`) && K.mutate([...C]);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] bg-red-500 text-white font-semibold`}
                    children={`批量删除`}
                  />,
                ]}
              />
            ),
            R ? (
              <div className={`py-12 text-center text-text2`} children={`加载中...`} />
            ) : (
              <div
                className={`bg-card rounded-2xl overflow-hidden shadow-sm border border-border`}
                children={[
                  z.map((e) => (
                    <div
                      onClick={() => {
                        T || t(`/admin/dishes/${e.id}`);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 transition-all ${e.enabled ? `` : `opacity-50`} ${T ? `cursor-default` : `active:bg-bg cursor-pointer`} ${C.has(e.id) ? `bg-primary-light/50` : ``}`}
                      children={[
                        T && (
                          <button
                            onClick={() => J(e.id)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${C.has(e.id) ? `bg-primary border-primary text-white` : `border-border2`}`}
                            children={C.has(e.id) && <span className={`text-xs`} children={`✓`} />}
                          />
                        ),
                        <div
                          className={`w-10 h-10 rounded-[10px] bg-primary-light flex items-center justify-center text-xl flex-shrink-0`}
                          children={
                            e.image_url ? (
                              <img
                                src={e.image_url}
                                alt={``}
                                className={`w-full h-full object-cover rounded-[10px]`}
                              />
                            ) : (
                              dishImageURL(e)
                            )
                          }
                        />,
                        <div
                          className={`flex-1 min-w-0 overflow-hidden`}
                          children={[
                            <div className={`text-sm font-semibold truncate`} children={e.name} />,
                            <div
                              className={`text-[11px] text-text2 truncate`}
                              children={[e.category || `未分类`, e.taste ? ` · ${e.taste}` : ``]}
                            />,
                          ]}
                        />,
                        !T && (
                          <div
                            className={`flex gap-1 flex-shrink-0`}
                            children={[
                              <button
                                onClick={(t) => {
                                  (t.stopPropagation(), W.mutate(e.id));
                                }}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all active:scale-95 ${e.enabled ? `bg-mint-light text-mint` : `bg-bg text-text3`}`}
                                children={e.enabled ? `开` : `关`}
                              />,
                              <button
                                onClick={(t) => {
                                  (t.stopPropagation(), U.mutate(e.id));
                                }}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs bg-bg transition-all active:bg-primary-light flex-shrink-0`}
                                children={`📋`}
                              />,
                              <button
                                onClick={(n) => {
                                  (n.stopPropagation(), t(`/admin/dishes/${e.id}`));
                                }}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs bg-bg transition-all active:bg-primary-light flex-shrink-0`}
                                children={`✎`}
                              />,
                              <button
                                onClick={(t) => {
                                  (t.stopPropagation(),
                                    confirm(`确定删除菜单项「${e.name}」吗？`) && H.mutate(e.id));
                                }}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs bg-bg transition-all active:bg-red-50 active:text-red-500 flex-shrink-0`}
                                children={`🗑`}
                              />,
                            ]}
                          />
                        ),
                      ]}
                      key={e.id}
                    />
                  )),
                  z.length === 0 && (
                    <div
                      className={`py-12 text-center text-sm text-text3`}
                      children={X ? `没有匹配的菜单项` : `还没有菜单项，先添加一道招牌菜吧`}
                    />
                  ),
                ]}
              />
            ),
            V > 1 && (
              <div
                className={`flex items-center justify-center gap-2 mt-4`}
                children={[
                  <button
                    onClick={() => S(1)}
                    disabled={x <= 1}
                    className={`px-3 py-1.5 rounded-full text-xs border border-border disabled:opacity-30`}
                    children={`首页`}
                  />,
                  <button
                    onClick={() => S((e) => Math.max(1, e - 1))}
                    disabled={x <= 1}
                    className={`px-3 py-1.5 rounded-full text-xs border border-border disabled:opacity-30`}
                    children={`上一页`}
                  />,
                  <span className={`text-xs text-text2`} children={[x, `/`, V]} />,
                  <button
                    onClick={() => S((e) => Math.min(V, e + 1))}
                    disabled={x >= V}
                    className={`px-3 py-1.5 rounded-full text-xs border border-border disabled:opacity-30`}
                    children={`下一页`}
                  />,
                  <button
                    onClick={() => S(V)}
                    disabled={x >= V}
                    className={`px-3 py-1.5 rounded-full text-xs border border-border disabled:opacity-30`}
                    children={`末页`}
                  />,
                ]}
              />
            ),
          ]}
        />,
        D && (
          <div
            className={`fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm`}
            onClick={() => O(false)}
            children={
              <div
                className={`bg-card rounded-2xl p-5 w-full max-w-[320px] shadow-xl`}
                onClick={(e) => e.stopPropagation()}
                children={[
                  <div className={`text-base font-bold mb-3`} children={`批量修改分类`} />,
                  <div
                    className={`flex flex-wrap gap-2 mb-4`}
                    children={F.map((e) => (
                      <button
                        onClick={() => A(e)}
                        className={`px-3 py-1.5 rounded-full text-xs border-[1.5px] transition-all ${k === e ? `bg-primary text-white border-primary` : `border-border text-text2`}`}
                        children={e}
                        key={e}
                      />
                    ))}
                  />,
                  <div
                    className={`flex gap-2.5`}
                    children={[
                      <button
                        onClick={() => O(false)}
                        className={`flex-1 py-2.5 px-5 rounded-full text-sm font-semibold border-[1.5px] border-border2`}
                        children={`取消`}
                      />,
                      <button
                        onClick={() =>
                          k &&
                          q.mutate({
                            ids: [...C],
                            category: k,
                          })
                        }
                        disabled={!k}
                        className={`flex-1 py-2.5 px-5 rounded-full text-sm font-semibold bg-primary text-white disabled:opacity-50`}
                        children={`确定`}
                      />,
                    ]}
                  />,
                ]}
              />
            }
          />
        ),
      ]}
    />
  );
}
export { Dishes as default };
