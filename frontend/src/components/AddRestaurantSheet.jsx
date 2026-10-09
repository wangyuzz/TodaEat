// Recovered from deployed build. Original local names/types/comments are unavailable.
import { React } from "../vendor/runtime.js";
import {
  D as restaurantApi,
  G as interopModule,
  L as getJSXRuntime,
  N as toast,
  P as useMutation,
  W as getReact,
  d as IconX,
  n as BottomSheet,
  r as LocationInput,
} from "../application.jsx";
var jsxRuntime = getJSXRuntime(),
  INPUT_CLASS = `w-full py-2 px-3 rounded-xl bg-bg border border-border text-[14px] focus:border-primary outline-none transition-all`;
function FormField({ label: e, children: t }) {
  return (
    <div
      children={[<div className={`text-[12px] font-semibold text-text2 mb-1.5`} children={e} />, t]}
    />
  );
}
function AddRestaurantSheet({
  onClose: t,
  onCreated: n,
  onUpdated: a,
  defaultName: p = ``,
  defaultWish: m = false,
  restaurant: h,
}) {
  var g, _;
  let v = !!h,
    [y, b] = (0, React.useState)((h == null ? void 0 : h.name) || p),
    x = (h == null ? void 0 : h.category) || `其他`,
    [S, C] = (0, React.useState)((h == null ? void 0 : h.address) || ``),
    [w, T] = (0, React.useState)((h == null ? void 0 : h.signature) || ``),
    [E, D] = (0, React.useState)((h == null || (g = h.tags) == null ? void 0 : g.join(`，`)) || ``),
    [O, k] = (0, React.useState)((_ = h == null ? void 0 : h.wish) == null ? m : _),
    A = useMutation({
      mutationFn: (t) => (h ? restaurantApi.update(h.id, t) : restaurantApi.create(t)),
      onSuccess: (e) => {
        (toast.success(v ? `已更新餐厅` : `已添加餐厅`),
          v ? a == null || a(e) : n == null || n(e),
          t());
      },
      onError: () => toast.error(v ? `更新失败` : `添加失败`),
    });
  function j() {
    if (!y.trim()) {
      toast.error(`请填写店名`);
      return;
    }
    let e = E.split(/[,，\s]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    A.mutate({
      name: y.trim(),
      category: x,
      address: S.trim(),
      cover_url: (h == null ? void 0 : h.cover_url) || ``,
      images: JSON.stringify((h == null ? void 0 : h.images) || []),
      signature: w.trim(),
      remark: (h == null ? void 0 : h.remark) || ``,
      tags: JSON.stringify(e),
      wish: O,
      sort_order: (h == null ? void 0 : h.sort_order) || 0,
    });
  }
  return (
    <BottomSheet
      onClose={t}
      className={`flex max-h-[82dvh] flex-col rounded-t-2xl`}
      children={({ close: e }) => (
        <jsxRuntime.Fragment
          children={[
            <div
              className={`flex items-center justify-between px-5 py-4 border-b border-border`}
              children={[
                <div className={`text-base font-bold`} children={v ? `编辑餐厅` : `添加餐厅`} />,
                <button
                  onClick={e}
                  className={`w-8 h-8 rounded-full bg-bg flex items-center justify-center text-text2 active:scale-95`}
                  children={<IconX size={16} />}
                />,
              ]}
            />,
            <div
              className={`flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-none`}
              children={[
                <FormField
                  label={`店名 *`}
                  children={
                    <input
                      value={y}
                      onChange={(e) => b(e.target.value)}
                      placeholder={`如：海底捞 万达店`}
                      className={INPUT_CLASS}
                    />
                  }
                />,
                <FormField
                  label={`地址`}
                  children={<LocationInput value={S} onChange={C} nameHint={y} />}
                />,
                <FormField
                  label={`招牌菜`}
                  children={
                    <input
                      value={w}
                      onChange={(e) => T(e.target.value)}
                      placeholder={`可选，如：毛肚 虾滑`}
                      className={INPUT_CLASS}
                    />
                  }
                />,
                <FormField
                  label={`标签`}
                  children={
                    <input
                      value={E}
                      onChange={(e) => D(e.target.value)}
                      placeholder={`逗号分隔，如：适合约会, 有包间`}
                      className={INPUT_CLASS}
                    />
                  }
                />,
                <label
                  className={`flex items-center gap-2 text-[13px] cursor-pointer`}
                  children={[
                    <input
                      type={`checkbox`}
                      checked={O}
                      onChange={(e) => k(e.target.checked)}
                      className={`w-4 h-4 accent-pink`}
                    />,
                    `先加入「想去清单」（还没去过）`,
                  ]}
                />,
              ]}
            />,
            <div
              className={`px-5 py-3 border-t border-border`}
              style={{
                paddingBottom: `calc(12px + env(safe-area-inset-bottom))`,
              }}
              children={
                <button
                  onClick={j}
                  disabled={A.isPending}
                  className={`w-full py-2.5 rounded-full text-[14px] font-semibold bg-primary text-white active:scale-96 disabled:opacity-60`}
                  children={A.isPending ? `保存中...` : `保存`}
                />
              }
            />,
          ]}
        />
      )}
    />
  );
}
export { AddRestaurantSheet as t };
