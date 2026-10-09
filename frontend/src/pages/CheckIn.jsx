// Recovered from deployed build. Original local names/types/comments are unavailable.
import { React } from "../vendor/runtime.js";
import {
  A as visitApi,
  B as useSearchParams,
  D as restaurantApi,
  F as useQuery,
  G as interopModule,
  H as initHelpers,
  I as useQueryClient,
  L as getJSXRuntime,
  N as toast,
  P as useMutation,
  R as useNavigate,
  V as d,
  W as getReact,
  a as CARD_SHADOW,
  c as RestaurantImage,
  d as IconX,
  h as IconPlus,
  j as getErrorMessage,
  k as uploadApi,
  p as IconStar,
  s as PageHeader,
  y as IconCamera,
} from "../application.jsx";
import { t as AddRestaurantSheet } from "../components/AddRestaurantSheet.jsx";
import {
  i as splitUploadFiles,
  n as oversizedFileMessage,
  r as compressImage,
  t as formatSize,
} from "../components/upload.jsx";
var jsxRuntime = getJSXRuntime();
initHelpers();
function formatDate(e = new Date()) {
  return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, `0`)}-${String(e.getDate()).padStart(2, `0`)}`;
}
var MOOD_CHOICES = [
    {
      key: `happy`,
      emoji: `😊`,
      label: `开心`,
    },
    {
      key: `love`,
      emoji: `🥰`,
      label: `幸福`,
    },
    {
      key: `full`,
      emoji: `😋`,
      label: `满足`,
    },
    {
      key: `ok`,
      emoji: `😐`,
      label: `一般`,
    },
    {
      key: `meh`,
      emoji: `😕`,
      label: `踩雷`,
    },
  ],
  INPUT_CLASS = `w-full py-2 px-3 rounded-xl bg-bg border border-border text-[14px] focus:border-primary outline-none transition-all`;
function CheckIn() {
  let [n] = useSearchParams(),
    i = useNavigate(),
    a = Number(n.get(`visit`)) || 0,
    [o, s] = (0, React.useState)(Number(n.get(`restaurant`)) || 0),
    [c, l] = (0, React.useState)(false),
    { data: d, isLoading: f } = useQuery({
      queryKey: [`visit`, a],
      queryFn: () => visitApi.get(a),
      enabled: !!a,
    });
  if (
    ((0, React.useEffect)(() => {
      d && !c && s(d.restaurant_id);
    }, [d, c]),
    a && f)
  )
    return <div className={`p-8 text-center text-text2`} children={`加载打卡记录中…`} />;
  let p = c ? 0 : o || (d == null ? void 0 : d.restaurant_id) || 0;
  return p ? (
    <VisitForm
      restaurantId={p}
      visit={d}
      onChangeRestaurant={() => {
        (s(0), l(true));
      }}
      onBack={() => i(-1)}
    />
  ) : (
    <RestaurantPicker
      onPick={(e) => {
        (s(e), l(false));
      }}
      onBack={() => i(-1)}
    />
  );
}
function RestaurantPicker({ onPick: e, onBack: t }) {
  var i;
  let [a, s] = (0, React.useState)(``),
    [c, l] = (0, React.useState)(false),
    u = useQueryClient(),
    { data: d } = useQuery({
      queryKey: [
        `restaurants`,
        {
          search: a,
        },
      ],
      queryFn: () =>
        restaurantApi.list({
          pageSize: `100`,
          search: a,
        }),
    }),
    { data: f } = useQuery({
      queryKey: [`restaurants`, `category-counts`],
      queryFn: () => restaurantApi.categoryCounts(),
    }),
    h = (d == null ? void 0 : d.items) || [],
    ee = (f == null || (i = f.categories) == null ? void 0 : i.map((e) => e.category)) || [],
    _ = a.trim();
  return (
    <div
      className={`min-h-screen bg-bg`}
      children={[
        <PageHeader title={`选择餐厅`} subtitle={`今天去哪家店？`} onBack={t} />,
        <div
          className={`px-5 py-3 max-w-[640px] mx-auto`}
          children={[
            <input
              value={a}
              onChange={(e) => s(e.target.value)}
              placeholder={`搜索餐厅…`}
              className={INPUT_CLASS}
            />,
            <button
              onClick={() => l(true)}
              className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-primary text-white text-[14px] font-semibold active:scale-98 transition-all`}
              children={[<IconPlus size={16} strokeWidth={2.4} />, _ ? `新增「${_}」` : `新增餐厅`]}
            />,
            <div
              className={`space-y-2 mt-3`}
              children={[
                h.map((t) => (
                  <button
                    onClick={() => e(t.id)}
                    className={`w-full flex items-center gap-3 p-2.5 bg-card rounded-2xl border border-border ${CARD_SHADOW} active:scale-98 text-left transition-all`}
                    children={[
                      <div
                        className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary-light to-mint-light`}
                        children={
                          <RestaurantImage
                            restaurant={t}
                            className={`w-full h-full`}
                            emojiSize={`text-2xl`}
                          />
                        }
                      />,
                      <div
                        className={`flex-1 min-w-0`}
                        children={[
                          <div className={`text-[14px] font-bold truncate`} children={t.name} />,
                          <div
                            className={`text-[11px] text-text2`}
                            children={t.category || `其他`}
                          />,
                        ]}
                      />,
                    ]}
                    key={t.id}
                  />
                )),
                h.length === 0 && (
                  <div
                    className={`text-center py-10 text-text3 text-[13px]`}
                    children={`还没有餐厅，可以直接新增后开始记录`}
                  />
                ),
              ]}
            />,
          ]}
        />,
        c && (
          <AddRestaurantSheet
            onClose={() => l(false)}
            categories={ee}
            defaultName={_}
            onCreated={(t) => {
              (u.invalidateQueries({
                queryKey: [`restaurants`],
              }),
                e(t.id));
            }}
          />
        ),
      ]}
    />
  );
}
function EditableStarRating({ value: e, onChange: t }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5`}
      children={[1, 2, 3, 4, 5].map((n) => (
        <button
          type={`button`}
          onClick={() => t(n === e ? 0 : n)}
          className={`active:scale-90 transition-transform`}
          children={
            <IconStar size={16} className={n <= e ? `text-yellow fill-yellow` : `text-text4`} />
          }
          key={n}
        />
      ))}
    />
  );
}
function VisitForm({ restaurantId: t, visit: i, onChangeRestaurant: a, onBack: s }) {
  let f = useNavigate(),
    v = useQueryClient(),
    { data: b } = useQuery({
      queryKey: [`restaurant`, t],
      queryFn: () => restaurantApi.get(t),
    }),
    { data: T } = useQuery({
      queryKey: [`restaurant`, t, `dishes`],
      queryFn: () => restaurantApi.dishes(t),
    }),
    D = b == null ? void 0 : b.restaurant,
    [O, A] = (0, React.useState)(formatDate()),
    [M, N] = (0, React.useState)([]),
    [P, F] = (0, React.useState)(``),
    [I, L] = (0, React.useState)(``),
    [R, z] = (0, React.useState)(``),
    [B, V] = (0, React.useState)(``),
    [H, U] = (0, React.useState)([]),
    [W, G] = (0, React.useState)(``),
    [K, q] = (0, React.useState)(false),
    [J, Y] = (0, React.useState)(``),
    [X, Z] = (0, React.useState)(0),
    ae = new Set(M.filter((e) => e.dish_id).map((e) => e.dish_id));
  (0, React.useEffect)(() => {
    i &&
      (A(i.visit_date || formatDate()),
      N(
        (i.items || []).map((e, t) => ({
          key: `visit-${e.id || t}`,
          dish_id: e.dish_id || void 0,
          dish_name: e.dish_name,
          my_rating: e.my_rating || 0,
          her_rating: e.her_rating || 0,
        })),
      ),
      F(i.cost > 0 ? String(i.cost) : ``),
      L(i.my_mood || ``),
      z(i.her_mood || ``),
      V(i.remark || ``),
      U(Array.isArray(i.photos) ? i.photos : []));
  }, [i]);
  function oe(e) {
    N((t) =>
      t.find((t) => t.dish_id === e.id)
        ? t.filter((t) => t.dish_id !== e.id)
        : [
            ...t,
            {
              key: `d${e.id}`,
              dish_id: e.id,
              dish_name: e.name,
              my_rating: 0,
              her_rating: 0,
            },
          ],
    );
  }
  function Q() {
    let e = W.trim();
    e &&
      (N((t) => [
        ...t,
        {
          key: `f${Date.now()}-${t.length}`,
          dish_name: e,
          my_rating: 0,
          her_rating: 0,
        },
      ]),
      G(``));
  }
  function se(e) {
    N((t) => t.filter((t) => t.key !== e));
  }
  function ce(e, t, n) {
    N((r) =>
      r.map((r) =>
        r.key === e
          ? d(
              d({}, r),
              {},
              {
                [t === `my` ? `my_rating` : `her_rating`]: n,
              },
            )
          : r,
      ),
    );
  }
  async function le(e) {
    let t = e.target.files;
    if (!t || t.length === 0) return;
    let { uploadable: n, oversized: r } = splitUploadFiles(Array.from(t));
    if ((r.forEach((e) => toast.error(oversizedFileMessage(e))), n.length === 0)) {
      e.target.value = ``;
      return;
    }
    (q(true), Z(0), Y(`准备上传 ${n.length} 张`));
    try {
      for (let e = 0; e < n.length; e++) {
        var i;
        let t = n[e];
        Y(`压缩图片 ${e + 1}/${n.length}`);
        let r = await compressImage(t),
          a = r.compressed
            ? `，已从 ${formatSize(r.originalSize)} 压到 ${formatSize(r.finalSize)}`
            : ``;
        (Z(0), Y(`上传中 ${e + 1}/${n.length}${a}`));
        let o = await uploadApi.image(r.file, (t) => {
          (Z(t), Y(`上传中 ${e + 1}/${n.length} · ${t}%${a}`));
        });
        (Z(100), Y(`服务器处理中 ${e + 1}/${n.length}`));
        let s = (i = o.data) == null || (i = i.data) == null ? void 0 : i.url;
        s && U((e) => [...e, s]);
      }
      toast.success(n.length > 1 ? `已上传 ${n.length} 张照片` : `照片已上传`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      (q(false), Y(``), Z(0), (e.target.value = ``));
    }
  }
  async function ue(e) {
    var t;
    if (
      (U((t) => t.filter((t) => t !== e)),
      !(!(i == null || (t = i.photos) == null) && t.includes(e)))
    )
      try {
        await uploadApi.deleteImage(e);
      } catch (e) {}
  }
  let $ = useMutation({
    mutationFn: () => {
      let n = {
        visit_date: O,
        restaurant_id: t,
        cost: P ? Number(P) : 0,
        my_mood: I,
        her_mood: R,
        remark: B.trim(),
        photos: JSON.stringify(H),
        items: M.map((e) => ({
          dish_id: e.dish_id,
          dish_name: e.dish_name,
          my_rating: e.my_rating,
          her_rating: e.her_rating,
        })),
      };
      return i ? visitApi.update(i.id, n) : visitApi.create(n);
    },
    onSuccess: () => {
      (toast.success(i ? `已保存修改` : `打卡成功！❤`),
        v.invalidateQueries(),
        f(i ? -1 : `/history`));
    },
    onError: () => toast.error(`保存失败，稍后再试`),
  });
  return (
    <div
      className={`min-h-screen bg-bg`}
      children={[
        <PageHeader
          title={i ? `编辑这一餐` : `记录这一餐`}
          subtitle={D == null ? void 0 : D.name}
          onBack={s}
        />,
        <div
          className={`px-5 py-4 max-w-[640px] mx-auto space-y-5`}
          style={{
            paddingBottom: `calc(84px + env(safe-area-inset-bottom))`,
          }}
          children={[
            <div
              className={`flex items-center gap-3 p-3 bg-card rounded-2xl border border-border ${CARD_SHADOW}`}
              children={[
                D && (
                  <div
                    className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary-light to-mint-light`}
                    children={
                      <RestaurantImage
                        restaurant={D}
                        className={`w-full h-full`}
                        emojiSize={`text-2xl`}
                      />
                    }
                  />
                ),
                <div
                  className={`flex-1 min-w-0`}
                  children={[
                    <div
                      className={`text-[15px] font-bold truncate`}
                      children={(D == null ? void 0 : D.name) || `加载中…`}
                    />,
                    <button
                      onClick={a}
                      className={`text-[12px] text-primary`}
                      children={`换一家 ›`}
                    />,
                  ]}
                />,
                <input
                  type={`date`}
                  value={O}
                  onChange={(e) => A(e.target.value)}
                  className={`py-1.5 px-2 rounded-lg bg-bg border border-border text-[13px] outline-none`}
                />,
              ]}
            />,
            T && T.length > 0 && (
              <div
                children={[
                  <div
                    className={`text-[13px] font-bold mb-2`}
                    children={`点了什么？（从菜单选）`}
                  />,
                  <div
                    className={`flex flex-wrap gap-2`}
                    children={T.map((e) => (
                      <button
                        onClick={() => oe(e)}
                        className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all active:scale-95 ${ae.has(e.id) ? `bg-primary text-white` : `bg-card border border-border text-text2`}`}
                        children={e.name}
                        key={e.id}
                      />
                    ))}
                  />,
                ]}
              />
            ),
            <div
              className={`flex gap-2`}
              children={[
                <input
                  value={W}
                  onChange={(e) => G(e.target.value)}
                  onKeyDown={(e) => {
                    e.key === `Enter` && Q();
                  }}
                  placeholder={`菜单没有？手动加一道菜…`}
                  className={INPUT_CLASS}
                />,
                <button
                  onClick={Q}
                  className={`px-4 rounded-xl bg-mint text-white text-[13px] font-semibold active:scale-95 flex-shrink-0 flex items-center`}
                  children={<IconPlus size={16} />}
                />,
              ]}
            />,
            M.length > 0 && (
              <div
                className={`space-y-2`}
                children={[
                  <div className={`text-[13px] font-bold`} children={`这一餐点的菜 · 各自打分`} />,
                  M.map((e) => (
                    <div
                      className={`p-3 bg-card rounded-xl border border-border shadow-[0_1px_3px_rgba(0,0,0,.04),0_4px_12px_rgba(0,0,0,.04)]`}
                      children={[
                        <div
                          className={`flex items-center justify-between mb-2`}
                          children={[
                            <span
                              className={`text-[14px] font-semibold truncate`}
                              children={e.dish_name}
                            />,
                            <button
                              onClick={() => se(e.key)}
                              className={`text-text3 active:scale-90`}
                              children={<IconX size={16} />}
                            />,
                          ]}
                        />,
                        <div
                          className={`flex items-center gap-4 text-[12px] text-text2`}
                          children={[
                            <span
                              className={`flex items-center gap-1.5`}
                              children={[
                                `我 `,
                                <EditableStarRating
                                  value={e.my_rating}
                                  onChange={(t) => ce(e.key, `my`, t)}
                                />,
                              ]}
                            />,
                            <span
                              className={`flex items-center gap-1.5`}
                              children={[
                                `她 `,
                                <EditableStarRating
                                  value={e.her_rating}
                                  onChange={(t) => ce(e.key, `her`, t)}
                                />,
                              ]}
                            />,
                          ]}
                        />,
                      ]}
                      key={e.key}
                    />
                  )),
                ]}
              />
            ),
            <div
              children={[
                <div className={`text-[13px] font-bold mb-2`} children={`这一餐花了多少`} />,
                <div
                  className={`relative`}
                  children={[
                    <span
                      className={`absolute left-3 top-1/2 -translate-y-1/2 text-text3`}
                      children={`¥`}
                    />,
                    <input
                      type={`number`}
                      inputMode={`decimal`}
                      value={P}
                      onChange={(e) => F(e.target.value)}
                      placeholder={`总花费（元）`}
                      className={`${INPUT_CLASS} pl-7`}
                    />,
                  ]}
                />,
              ]}
            />,
            <div
              children={[
                <div className={`text-[13px] font-bold mb-2`} children={`今天的心情`} />,
                <MoodPicker label={`我`} value={I} onChange={L} />,
                <div className={`h-2`} />,
                <MoodPicker label={`她`} value={R} onChange={z} />,
              ]}
            />,
            <div
              children={[
                <div
                  className={`flex items-end justify-between gap-3 mb-2`}
                  children={[
                    <div
                      children={[
                        <div className={`text-[13px] font-bold`} children={`拍了照片吗`} />,
                        <div
                          className={`text-[11px] text-text3 mt-0.5`}
                          children={[`单张不超过 `, 20, `MB，上传后自动压缩`]}
                        />,
                      ]}
                    />,
                    J && <div className={`text-[11px] font-semibold text-primary`} children={J} />,
                  ]}
                />,
                K && (
                  <div
                    className={`mb-2 rounded-xl border border-primary/20 bg-primary-light px-3 py-2`}
                    children={[
                      <div
                        className={`flex items-center justify-between gap-3 text-[11px] font-semibold text-primary`}
                        children={[
                          <span children={J || `图片处理中`} />,
                          <span children={X > 0 ? `${X}%` : `...`} />,
                        ]}
                      />,
                      <div
                        className={`mt-2 h-1.5 overflow-hidden rounded-full bg-white`}
                        children={
                          <div
                            className={`h-full rounded-full bg-primary transition-all duration-200`}
                            style={{
                              width: `${Math.max(8, X)}%`,
                            }}
                          />
                        }
                      />,
                    ]}
                  />
                ),
                <div
                  className={`flex gap-2 flex-wrap`}
                  children={[
                    H.map((e, t) => (
                      <div
                        className={`relative w-20 h-20 rounded-xl overflow-hidden border border-border`}
                        children={[
                          <img src={e} alt={``} className={`w-full h-full object-cover`} />,
                          <button
                            onClick={() => ue(e)}
                            className={`absolute top-1 right-1 w-5 h-5 rounded-full bg-black/55 text-white flex items-center justify-center`}
                            children={<IconX size={12} />}
                          />,
                        ]}
                        key={t}
                      />
                    )),
                    <label
                      className={`w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-transform ${K ? `border-primary bg-primary-light text-primary pointer-events-none` : `border-border text-text3 active:scale-95`}`}
                      children={[
                        <IconCamera size={20} className={K ? `animate-pulse` : ``} />,
                        <span
                          className={`text-[10px] mt-1`}
                          children={K ? (X > 0 ? `${X}%` : `处理中`) : `添加`}
                        />,
                        <input
                          type={`file`}
                          accept={`image/*`}
                          multiple={true}
                          className={`hidden`}
                          onChange={le}
                          disabled={K}
                        />,
                      ]}
                    />,
                  ]}
                />,
              ]}
            />,
            <div
              children={[
                <div className={`text-[13px] font-bold mb-2`} children={`想说点什么`} />,
                <textarea
                  value={B}
                  onChange={(e) => V(e.target.value)}
                  rows={3}
                  placeholder={`这次约会的小记…`}
                  className={`${INPUT_CLASS} resize-none`}
                />,
              ]}
            />,
          ]}
        />,
        <div
          className={`fixed bottom-0 left-0 right-0 z-[210] bg-bg/92 backdrop-blur-xl px-5 py-3 border-t border-border`}
          style={{
            paddingBottom: `calc(12px + env(safe-area-inset-bottom))`,
          }}
          children={
            <button
              onClick={() => $.mutate()}
              disabled={$.isPending || K}
              className={`w-full py-3 rounded-full text-[15px] font-semibold bg-primary text-white active:scale-96 disabled:opacity-60`}
              children={$.isPending ? `保存中…` : i ? `保存修改` : `完成打卡 ❤`}
            />
          }
        />,
      ]}
    />
  );
}
function MoodPicker({ label: e, value: t, onChange: n }) {
  return (
    <div
      className={`flex items-center gap-2`}
      children={[
        <span className={`text-[12px] text-text2 w-5`} children={e} />,
        <div
          className={`flex gap-2 overflow-x-auto scrollbar-none`}
          children={MOOD_CHOICES.map((e) => (
            <button
              onClick={() => n(t === e.key ? `` : e.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all active:scale-95 ${t === e.key ? `bg-primary-light border border-primary text-primary` : `bg-card border border-border text-text2`}`}
              children={[e.emoji, ` `, e.label]}
              key={e.key}
            />
          ))}
        />,
      ]}
    />
  );
}
export { CheckIn as default };
