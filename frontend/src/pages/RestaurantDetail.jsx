// Recovered from deployed build. Original local names/types/comments are unavailable.
import { React } from "../vendor/runtime.js";
import {
  D as restaurantApi,
  F as useQuery,
  G as interopModule,
  I as useQueryClient,
  L as getJSXRuntime,
  N as toast,
  P as useMutation,
  R as useNavigate,
  U as getReactDOMCore,
  W as getReact,
  _ as IconMapPin,
  a as CARD_SHADOW,
  f as IconTrash2,
  g as IconPencil,
  h as IconPlus,
  l as restaurantEmoji,
  o as SectionHeader,
  p as IconStar,
  s as PageHeader,
  t as PhotoViewer,
  u as restaurantImageURL,
  v as IconHeart,
  z as useParams,
} from "../application.jsx";
import { t as AddRestaurantSheet } from "../components/AddRestaurantSheet.jsx";
var T = interopModule(getReactDOMCore(), 1),
  jsxRuntime = getJSXRuntime();
function StarRating({ n: e }) {
  return (
    <span
      className={`inline-flex items-center`}
      children={[1, 2, 3, 4, 5].map((t) => (
        <IconStar size={11} className={t <= e ? `text-yellow fill-yellow` : `text-text4`} key={t} />
      ))}
    />
  );
}
function RestaurantDetail() {
  var n;
  let { id: i } = useParams(),
    c = Number(i),
    l = useNavigate(),
    d = useQueryClient(),
    [_, D] = (0, React.useState)([]),
    [O, j] = (0, React.useState)(0),
    [M, N] = (0, React.useState)(false),
    [P, F] = (0, React.useState)(false),
    { data: I, isLoading: L } = useQuery({
      queryKey: [`restaurant`, c],
      queryFn: () => restaurantApi.get(c),
      enabled: !!c,
    }),
    { data: R } = useQuery({
      queryKey: [`restaurant`, c, `dishes`],
      queryFn: () => restaurantApi.dishes(c),
      enabled: !!c,
    }),
    { data: z } = useQuery({
      queryKey: [`restaurant`, c, `visits`],
      queryFn: () => restaurantApi.visits(c),
      enabled: !!c,
    }),
    B = useMutation({
      mutationFn: () => restaurantApi.toggleWish(c),
      onSuccess: () => {
        (d.invalidateQueries({
          queryKey: [`restaurant`, c],
        }),
          d.invalidateQueries({
            queryKey: [`restaurants`],
          }));
      },
    }),
    V = useMutation({
      mutationFn: () => restaurantApi.delete(c),
      onSuccess: () => {
        (toast.success(`已删除餐厅`),
          d.invalidateQueries({
            queryKey: [`restaurants`],
          }),
          l(`/restaurants`, {
            replace: true,
          }));
      },
      onError: () => toast.error(`删除失败`),
    });
  if (L || !I) return <div className={`p-8 text-center text-text2`} children={`加载中…`} />;
  let H = I.restaurant,
    U = I.visit_count;
  function W(e, t) {
    (D(e), j(t), N(true));
  }
  function G() {
    if (U > 0) {
      toast.error(`这家店已有打卡记录，先删除相关打卡后再删除餐厅`);
      return;
    }
    confirm(`确定删除「${H.name}」吗？`) && V.mutate();
  }
  return (
    <div
      className={`min-h-screen bg-bg`}
      children={[
        <PageHeader
          title={`餐厅`}
          subtitle={H.name}
          onBack={() => l(-1)}
          actions={
            <jsxRuntime.Fragment
              children={[
                <button
                  onClick={() => F(true)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 text-text2 shadow-[0_1px_3px_rgba(26,26,46,.05),0_6px_18px_rgba(26,26,46,.06)] transition-all active:scale-95 active:text-primary`}
                  aria-label={`编辑餐厅`}
                  title={`编辑餐厅`}
                  children={<IconPencil size={16} strokeWidth={2.35} />}
                />,
                <button
                  onClick={G}
                  disabled={V.isPending}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 text-text3 shadow-[0_1px_3px_rgba(26,26,46,.05),0_6px_18px_rgba(26,26,46,.06)] transition-all active:scale-95 active:text-red disabled:opacity-50`}
                  aria-label={`删除餐厅`}
                  title={`删除餐厅`}
                  children={<IconTrash2 size={16} strokeWidth={2.35} />}
                />,
              ]}
            />
          }
        />,
        <div
          className={`relative h-[240px] bg-gradient-to-br from-primary-light to-mint-light overflow-hidden`}
          children={[
            restaurantImageURL(H) ? (
              <img
                src={restaurantImageURL(H)}
                alt={H.name}
                className={`w-full h-full object-cover`}
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center text-[80px]`}
                children={restaurantEmoji(H)}
              />
            ),
            <div
              className={`absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-bg to-transparent`}
            />,
            <button
              onClick={() => B.mutate()}
              className={`absolute bottom-4 right-5 w-11 h-11 rounded-full bg-card shadow-md flex items-center justify-center transition-all active:scale-90 ${H.wish ? `text-pink` : `text-text3`}`}
              children={<IconHeart size={20} className={H.wish ? `fill-pink` : ``} />}
            />,
          ]}
        />,
        <div
          className={`px-5 py-5 max-w-[640px] mx-auto`}
          style={{
            paddingBottom: `calc(80px + env(safe-area-inset-bottom))`,
          }}
          children={[
            <div className={`text-2xl font-extrabold mb-2`} children={H.name} />,
            <div
              className={`flex gap-2 flex-wrap items-center mb-3`}
              children={[
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-mint-light text-mint`}
                  children={H.category || `其他`}
                />,
                H.address && (
                  <span
                    className={`text-[12px] text-text2 flex items-center gap-1`}
                    children={[<IconMapPin size={12} />, H.address]}
                  />
                ),
              ]}
            />,
            H.signature && (
              <div
                className={`bg-yellow-light rounded-xl p-3 mb-3 border border-yellow/20 shadow-[0_1px_3px_rgba(0,0,0,.04),0_4px_12px_rgba(0,0,0,.04)]`}
                children={[
                  <span className={`text-[13px] text-yellow font-semibold`} children={`招牌：`} />,
                  <span className={`text-[13px]`} children={H.signature} />,
                ]}
              />
            ),
            ((n = H.tags) == null ? void 0 : n.length) > 0 && (
              <div
                className={`flex gap-1.5 flex-wrap mb-4`}
                children={H.tags.map((e) => (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] bg-bg text-text2 border border-border`}
                    children={[`#`, e]}
                    key={e}
                  />
                ))}
              />
            ),
            <div
              className={`grid grid-cols-4 gap-2 mb-6`}
              children={[
                <DetailStat label={`一起去过`} value={`${I.visit_count}次`} />,
                <DetailStat
                  label={`累计花费`}
                  value={I.total_cost > 0 ? `¥${I.total_cost}` : `-`}
                />,
                <DetailStat label={`我评分`} value={I.my_avg > 0 ? I.my_avg.toFixed(1) : `-`} />,
                <DetailStat label={`她评分`} value={I.her_avg > 0 ? I.her_avg.toFixed(1) : `-`} />,
              ]}
            />,
            R && R.length > 0 && (
              <div
                className={`mb-6`}
                children={[
                  <SectionHeader title={`🍽 招牌菜单`} />,
                  <div
                    className={`flex flex-wrap gap-2`}
                    children={R.map((e) => (
                      <span
                        className={`px-3 py-1.5 rounded-full text-[13px] bg-card border border-border`}
                        children={e.name}
                        key={e.id}
                      />
                    ))}
                  />,
                ]}
              />
            ),
            <SectionHeader
              title={<span children={[`📅 一起来过`, z ? ` (${z.length})` : ``]} />}
            />,
            !z || z.length === 0 ? (
              <div
                className={`text-center py-8 text-text3 text-[13px]`}
                children={`还没有一起来过，点下面记录第一次吧～`}
              />
            ) : (
              <div
                className={`space-y-3`}
                children={z.map((e) => (
                  <RestaurantVisitCard
                    v={e}
                    onPhoto={W}
                    onEdit={() => l(`/check-in?visit=${e.id}`)}
                    key={e.id}
                  />
                ))}
              />
            ),
          ]}
        />,
        <div
          className={`fixed bottom-0 left-0 right-0 z-[210] bg-bg/92 backdrop-blur-xl px-5 py-3 border-t border-border`}
          style={{
            paddingBottom: `calc(12px + env(safe-area-inset-bottom))`,
          }}
          children={
            <button
              onClick={() => l(`/check-in?restaurant=${c}`)}
              className={`w-full py-3 rounded-full text-[15px] font-semibold bg-primary text-white active:scale-96 flex items-center justify-center gap-2`}
              children={[<IconPlus size={18} />, ` 记录这一餐`]}
            />
          }
        />,
        M &&
          _.length > 0 &&
          (0, T.createPortal)(
            <PhotoViewer photos={_} idx={O} setIdx={j} onClose={() => N(false)} />,
            document.body,
          ),
        P && (
          <AddRestaurantSheet
            restaurant={H}
            onClose={() => F(false)}
            onUpdated={() => {
              (d.invalidateQueries({
                queryKey: [`restaurant`, c],
              }),
                d.invalidateQueries({
                  queryKey: [`restaurants`],
                }));
            }}
          />
        ),
      ]}
    />
  );
}
function DetailStat({ label: e, value: t }) {
  return (
    <div
      className={`text-center bg-card rounded-xl py-2.5 border border-border`}
      children={[
        <div className={`text-[15px] font-extrabold text-primary leading-tight`} children={t} />,
        <div className={`text-[10px] text-text3 mt-0.5`} children={e} />,
      ]}
    />
  );
}
function RestaurantVisitCard({ v: e, onPhoto: t, onEdit: n }) {
  var r, i;
  return (
    <div
      className={`bg-card rounded-2xl p-3.5 border border-border ${CARD_SHADOW}`}
      children={[
        <div
          className={`flex items-center justify-between mb-2`}
          children={[
            <span className={`text-[14px] font-bold`} children={e.visit_date} />,
            <div
              className={`flex items-center gap-2`}
              children={[
                e.cost > 0 && (
                  <span className={`text-[12px] text-text2`} children={[`¥`, e.cost]} />
                ),
                <button
                  onClick={n}
                  className={`flex h-7 w-7 items-center justify-center rounded-full bg-bg text-text3 transition-all active:scale-90 active:text-primary`}
                  aria-label={`编辑打卡`}
                  title={`编辑打卡`}
                  children={<IconPencil size={13} />}
                />,
              ]}
            />,
          ]}
        />,
        ((r = e.items) == null ? void 0 : r.length) > 0 && (
          <div
            className={`space-y-1.5 mb-2`}
            children={e.items.map((e) => (
              <div
                className={`flex items-center justify-between text-[13px] gap-2`}
                children={[
                  <span className={`truncate`} children={e.dish_name} />,
                  <span
                    className={`flex items-center gap-2 flex-shrink-0 text-[11px] text-text3`}
                    children={[
                      e.my_rating > 0 && (
                        <span
                          className={`flex items-center gap-0.5`}
                          children={[`我`, <StarRating n={e.my_rating} />]}
                        />
                      ),
                      e.her_rating > 0 && (
                        <span
                          className={`flex items-center gap-0.5`}
                          children={[`她`, <StarRating n={e.her_rating} />]}
                        />
                      ),
                    ]}
                  />,
                ]}
                key={e.id}
              />
            ))}
          />
        ),
        e.remark && (
          <div className={`text-[12px] text-text2 mb-2`} children={[`"`, e.remark, `"`]} />
        ),
        ((i = e.photos) == null ? void 0 : i.length) > 0 && (
          <div
            className={`flex gap-1.5 overflow-x-auto scrollbar-none`}
            children={e.photos.map((n, r) => (
              <div
                onClick={() => t(e.photos, r)}
                className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-border cursor-pointer active:scale-95`}
                children={
                  <img src={n} alt={``} className={`w-full h-full object-cover`} loading={`lazy`} />
                }
                key={r}
              />
            ))}
          />
        ),
      ]}
    />
  );
}
export { RestaurantDetail as default };
