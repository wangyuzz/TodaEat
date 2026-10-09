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
  j as getErrorMessage,
  k as uploadApi,
  w as dishApi,
  z as useParams,
} from "../../application.jsx";
import {
  i as splitUploadFiles,
  n as oversizedFileMessage,
  r as compressImage,
  t as formatSize,
} from "../../components/upload.jsx";
import { t as parseArray } from "../../components/utils.jsx";
var jsxRuntime = getJSXRuntime(),
  DEFAULT_CATEGORIES = [`火锅`, `日料`, `烧烤`, `西餐`, `中餐`, `咖啡馆`, `甜品`, `小吃`, `其他`],
  DEFAULT_TASTES = [`招牌`, `必点`, `清淡`, `重口`, `辣`, `甜`, `酸`, `鲜`, `适合拍照`, `下次还点`];
function settingArray(e, t) {
  let n = parseArray(e).filter((e) => typeof e == `string`);
  return n.length > 0 ? n : t;
}
function FormSection({ title: e, children: t }) {
  return (
    <div
      className={`mb-5`}
      children={[
        <div
          className={`text-xs font-bold text-primary uppercase tracking-wider mb-2.5`}
          children={e}
        />,
        <div
          className={`bg-card rounded-2xl p-4 shadow-sm border border-border space-y-4`}
          children={t}
        />,
      ]}
    />
  );
}
function FormField({ label: e, hint: t, children: n }) {
  return (
    <div
      children={[
        <label className={`block text-[13px] font-semibold mb-1.5 text-text2`} children={e} />,
        t && <div className={`text-[11px] text-text3 mb-1`} children={t} />,
        n,
      ]}
    />
  );
}
var INPUT_CLASS = `w-full py-2.5 px-3.5 rounded-[10px] border-[1.5px] border-border bg-bg text-sm outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(232,115,74,.1)]`,
  TEXTAREA_CLASS = `w-full py-2.5 px-3.5 rounded-[10px] border-[1.5px] border-border bg-bg text-sm outline-none min-h-[80px] resize-y leading-relaxed transition-all focus:border-primary`;
function DishEdit() {
  let { id: t } = useParams(),
    r = useNavigate(),
    s = useQueryClient(),
    b = t ? Number(t) : 0,
    x = !t || t === `new`,
    { data: S } = useQuery({
      queryKey: [`dish`, b],
      queryFn: () => dishApi.get(b),
      enabled: !x && !!b,
    }),
    { data: C } = useQuery({
      queryKey: [`settings`],
      queryFn: () => settingsApi.get(),
    }),
    w = settingArray(C == null ? void 0 : C.categories, DEFAULT_CATEGORIES),
    T = settingArray(C == null ? void 0 : C.tastes, DEFAULT_TASTES),
    [E, se] = (0, React.useState)(``),
    [D, O] = (0, React.useState)(w[0] || `其他`),
    [k, A] = (0, React.useState)([]),
    [ce, le] = (0, React.useState)(``),
    [j, M] = (0, React.useState)(``),
    [N, P] = (0, React.useState)([]),
    [F, I] = (0, React.useState)([]),
    [L, R] = (0, React.useState)(``),
    [z, B] = (0, React.useState)(0),
    [V, H] = (0, React.useState)(``),
    [U, W] = (0, React.useState)(``),
    [G, K] = (0, React.useState)(false),
    [q, J] = (0, React.useState)(false),
    [ue, Y] = (0, React.useState)(``),
    [X, Z] = (0, React.useState)(0);
  (0, React.useEffect)(() => {
    S &&
      (se(S.name || ``),
      O(S.category || w[0] || `其他`),
      A(
        (S.taste || ``)
          .split(`,`)
          .map((e) => e.trim())
          .filter(Boolean),
      ),
      le(S.remark || ``),
      M(S.image_url || ``),
      P(parseArray(S.images).filter((e) => typeof e == `string`)),
      I(parseArray(S.tags).filter((e) => typeof e == `string`)),
      B(S.sort_order || 0));
  }, [S, w]);
  let Q = useMutation({
      mutationFn: () => {
        let e = {
          restaurant_id: (S == null ? void 0 : S.restaurant_id) || 0,
          name: E,
          category: D,
          meal_type: `all`,
          difficulty: `easy`,
          taste: k.join(`,`),
          cook_time: 0,
          ingredients: `[]`,
          seasonings: `[]`,
          steps: `[]`,
          remark: ce,
          image_url: j,
          images: JSON.stringify(N),
          video_url: ``,
          tags: JSON.stringify(F),
          sort_order: z,
        };
        return x ? dishApi.create(e) : dishApi.update(b, e);
      },
      onSuccess: () => {
        (s.invalidateQueries({
          queryKey: [`admin`, `dishes`],
        }),
          s.invalidateQueries({
            queryKey: [`dishes`],
          }),
          toast.success(`已保存`),
          r(-1));
      },
      onError: () => toast.error(`保存失败`),
    }),
    de = useMutation({
      mutationFn: (e) =>
        settingsApi.update({
          categories: JSON.stringify(e),
        }),
      onSuccess: () => {
        (s.invalidateQueries({
          queryKey: [`settings`],
        }),
          H(``),
          toast.success(`分类已更新`));
      },
      onError: () => toast.error(`保存分类失败`),
    }),
    fe = useMutation({
      mutationFn: (e) =>
        settingsApi.update({
          tastes: JSON.stringify(e),
        }),
      onSuccess: () => {
        (s.invalidateQueries({
          queryKey: [`settings`],
        }),
          W(``),
          toast.success(`标签已更新`));
      },
      onError: () => toast.error(`保存标签失败`),
    });
  function pe() {
    let e = V.trim();
    !e || w.includes(e) || (de.mutate([...w, e]), O(e));
  }
  function me() {
    let e = U.trim();
    !e || T.includes(e) || (fe.mutate([...T, e]), A((t) => (t.includes(e) ? t : [...t, e])));
  }
  function he(e) {
    A((t) => (t.includes(e) ? t.filter((t) => t !== e) : [...t, e]));
  }
  async function ge(e) {
    var t;
    let n = (t = e.target.files) == null ? void 0 : t[0];
    if (n) {
      if (n.size > 20 * 1024 * 1024) {
        (toast.error(oversizedFileMessage(n)), (e.target.value = ``));
        return;
      }
      (K(true), Z(0), Y(`压缩主图`));
      try {
        let e = await compressImage(n),
          t = e.compressed
            ? `，已从 ${formatSize(e.originalSize)} 压到 ${formatSize(e.finalSize)}`
            : ``;
        Y(`上传主图${t}`);
        let r = await uploadApi.image(e.file, (e) => {
          (Z(e), Y(`上传主图 · ${e}%${t}`));
        });
        (Z(100), Y(`服务器处理中`), M(r.data.data.url), toast.success(`主图已上传`));
      } catch (e) {
        toast.error(getErrorMessage(e));
      } finally {
        (K(false), Y(``), Z(0), (e.target.value = ``));
      }
    }
  }
  async function _e(e) {
    let t = e.target.files;
    if (!t) return;
    let { uploadable: n, oversized: r } = splitUploadFiles(Array.from(t));
    if ((r.forEach((e) => toast.error(oversizedFileMessage(e))), n.length === 0)) {
      e.target.value = ``;
      return;
    }
    (J(true), Z(0), Y(`准备上传 ${n.length} 张`));
    try {
      for (let e = 0; e < n.length; e++) {
        let t = n[e];
        Y(`压缩图片 ${e + 1}/${n.length}`);
        let r = await compressImage(t),
          i = r.compressed
            ? `，已从 ${formatSize(r.originalSize)} 压到 ${formatSize(r.finalSize)}`
            : ``;
        (Z(0), Y(`上传中 ${e + 1}/${n.length}${i}`));
        let a = await uploadApi.image(r.file, (t) => {
          (Z(t), Y(`上传中 ${e + 1}/${n.length} · ${t}%${i}`));
        });
        (Z(100), Y(`服务器处理中 ${e + 1}/${n.length}`), P((e) => [...e, a.data.data.url]));
      }
      toast.success(n.length > 1 ? `已上传 ${n.length} 张图片` : `图片已上传`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      (J(false), Y(``), Z(0), (e.target.value = ``));
    }
  }
  async function ve(e, t) {
    t === `main` ? M(``) : P((t) => t.filter((t) => t !== e));
    try {
      await uploadApi.deleteImage(e);
    } catch (e) {}
  }
  function ye() {
    let e = L.trim();
    (e && !F.includes(e) && I([...F, e]), R(``));
  }
  let $ = (e) =>
    `px-3.5 py-1.5 rounded-full text-xs border-[1.5px] transition-all active:scale-95 ${e ? `bg-primary text-white border-primary` : `border-border text-text2`}`;
  return (
    <div
      className={`px-5 py-4 max-w-[640px] mx-auto pb-20`}
      children={[
        <div
          className={`flex items-center justify-between mb-4`}
          children={[
            <div className={`text-lg font-bold`} children={x ? `添加菜单项` : `编辑菜单项`} />,
            <button
              onClick={() => Q.mutate()}
              disabled={!E || Q.isPending || G || q}
              className={`py-1.5 px-5 rounded-full text-xs font-semibold bg-primary text-white transition-all active:scale-96 disabled:opacity-50`}
              children={Q.isPending ? `保存中...` : `保存`}
            />,
          ]}
        />,
        <FormSection
          title={`基本信息`}
          children={[
            <FormField
              label={`名称 *`}
              hint={`一道招牌菜、甜品、饮品或你们会点的东西`}
              children={
                <input
                  type={`text`}
                  value={E}
                  onChange={(e) => se(e.target.value)}
                  placeholder={`如：毛肚、厚切牛舌、提拉米苏`}
                  className={INPUT_CLASS}
                />
              }
            />,
            <FormField
              label={`分类`}
              children={[
                <div
                  className={`flex flex-wrap gap-2`}
                  children={w.map((e) => (
                    <button onClick={() => O(e)} className={$(D === e)} children={e} key={e} />
                  ))}
                />,
                <div
                  className={`flex gap-2 mt-2`}
                  children={[
                    <input
                      value={V}
                      onChange={(e) => H(e.target.value)}
                      placeholder={`新增分类`}
                      className={INPUT_CLASS}
                    />,
                    <button
                      onClick={pe}
                      className={`px-4 rounded-full text-xs font-semibold bg-primary text-white`}
                      children={`添加`}
                    />,
                  ]}
                />,
              ]}
            />,
            <FormField
              label={`标签/口味`}
              children={[
                <div
                  className={`flex flex-wrap gap-2`}
                  children={T.map((e) => (
                    <button
                      onClick={() => he(e)}
                      className={$(k.includes(e))}
                      children={e}
                      key={e}
                    />
                  ))}
                />,
                <div
                  className={`flex gap-2 mt-2`}
                  children={[
                    <input
                      value={U}
                      onChange={(e) => W(e.target.value)}
                      placeholder={`新增标签`}
                      className={INPUT_CLASS}
                    />,
                    <button
                      onClick={me}
                      className={`px-4 rounded-full text-xs font-semibold bg-primary text-white`}
                      children={`添加`}
                    />,
                  ]}
                />,
              ]}
            />,
            <FormField
              label={`排序权重`}
              hint={`数值越大越靠前`}
              children={
                <input
                  type={`number`}
                  value={z}
                  onChange={(e) => B(Number(e.target.value))}
                  className={INPUT_CLASS}
                />
              }
            />,
          ]}
        />,
        <FormSection
          title={`图片`}
          children={[
            (G || q) && (
              <div
                className={`rounded-xl border border-primary/20 bg-primary-light px-3 py-2`}
                children={[
                  <div
                    className={`flex items-center justify-between gap-3 text-[11px] font-semibold text-primary`}
                    children={[
                      <span children={ue || `图片处理中`} />,
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
            <FormField
              label={`主图`}
              hint={`可选，用来展示菜单项；单张不超过 20MB`}
              children={
                <label
                  className={`relative block border-2 border-dashed rounded-2xl overflow-hidden text-center cursor-pointer transition-all ${G ? `border-primary bg-primary-light` : `border-border2 hover:border-primary hover:bg-primary-light`}`}
                  children={[
                    <input
                      type={`file`}
                      accept={`image/*`}
                      onChange={ge}
                      disabled={G}
                      className={`hidden`}
                    />,
                    j ? (
                      <jsxRuntime.Fragment
                        children={[
                          <img src={j} alt={`预览`} className={`w-full h-48 object-cover`} />,
                          <button
                            type={`button`}
                            onClick={(e) => {
                              (e.preventDefault(), ve(j, `main`));
                            }}
                            className={`absolute top-2 right-2 w-8 h-8 rounded-full bg-black/55 text-white flex items-center justify-center`}
                            children={`×`}
                          />,
                        ]}
                      />
                    ) : (
                      <div
                        className={`p-6`}
                        children={[
                          <span className={`text-[32px] block mb-2`} children={`📷`} />,
                          <div
                            className={`text-[13px] text-text2`}
                            children={G ? `主图上传中...` : `点击上传主图`}
                          />,
                        ]}
                      />
                    ),
                    G && (
                      <div
                        className={`absolute inset-0 bg-white/75 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-[13px] font-semibold text-primary`}
                        children={[
                          <span children={X > 0 ? `上传中 ${X}%` : `图片处理中...`} />,
                          <div
                            className={`h-1.5 w-32 overflow-hidden rounded-full bg-white`}
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
                  ]}
                />
              }
            />,
            <FormField
              label={`更多图片`}
              hint={`可多选，单张不超过 20MB`}
              children={[
                <label
                  className={`block border-2 border-dashed rounded-xl overflow-hidden text-center cursor-pointer py-3 px-4 transition-all ${q ? `border-primary bg-primary-light` : `border-border2 hover:border-primary hover:bg-primary-light`}`}
                  children={[
                    <input
                      type={`file`}
                      accept={`image/*`}
                      multiple={true}
                      onChange={_e}
                      disabled={q}
                      className={`hidden`}
                    />,
                    <span
                      className={`text-xs ${q ? `text-primary font-semibold` : `text-text2`}`}
                      children={
                        q ? (X > 0 ? `图片上传中 ${X}%` : `图片处理中...`) : `+ 上传更多图片`
                      }
                    />,
                  ]}
                />,
                N.length > 0 && (
                  <div
                    className={`flex gap-2 mt-3 overflow-x-auto scrollbar-hide`}
                    children={N.map((e, t) => (
                      <div
                        className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden group`}
                        children={[
                          <img src={e} alt={``} className={`w-full h-full object-cover`} />,
                          <button
                            onClick={() => ve(e, `extra`)}
                            className={`absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center`}
                            children={`×`}
                          />,
                        ]}
                        key={t}
                      />
                    ))}
                  />
                ),
              ]}
            />,
          ]}
        />,
        <FormSection
          title={`备注`}
          children={[
            <FormField
              label={`自定义标签`}
              hint={`例如：她爱吃、下次还点、踩雷`}
              children={[
                <div
                  className={`flex flex-wrap gap-2 mb-2`}
                  children={F.map((e) => (
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-primary-light text-primary font-semibold`}
                      children={[
                        e,
                        <button onClick={() => I(F.filter((t) => t !== e))} children={`×`} />,
                      ]}
                      key={e}
                    />
                  ))}
                />,
                <div
                  className={`flex gap-2`}
                  children={[
                    <input
                      type={`text`}
                      value={L}
                      onChange={(e) => R(e.target.value)}
                      onKeyDown={(e) => {
                        e.key === `Enter` && (e.preventDefault(), ye());
                      }}
                      placeholder={`输入后回车添加`}
                      className={`flex-1 ${INPUT_CLASS}`}
                    />,
                    <button
                      onClick={ye}
                      className={`px-4 rounded-full text-xs font-semibold bg-primary text-white`}
                      children={`添加`}
                    />,
                  ]}
                />,
              ]}
            />,
            <FormField
              label={`备注`}
              children={
                <textarea
                  value={ce}
                  onChange={(e) => le(e.target.value)}
                  rows={3}
                  placeholder={`这道值不值得再点、适合什么场景...`}
                  className={TEXTAREA_CLASS}
                />
              }
            />,
          ]}
        />,
        <div
          className={`flex gap-2.5 mt-2`}
          children={[
            <button
              onClick={() => r(-1)}
              className={`flex-1 py-2.5 px-5 rounded-full text-sm font-semibold border-[1.5px] border-border2 transition-all`}
              children={`取消`}
            />,
            <button
              onClick={() => Q.mutate()}
              disabled={!E || Q.isPending || G || q}
              className={`flex-1 py-2.5 px-5 rounded-full text-sm font-semibold bg-primary text-white transition-all active:scale-96 disabled:opacity-50`}
              children={Q.isPending ? `保存中...` : `保存`}
            />,
          ]}
        />,
      ]}
    />
  );
}
export { DishEdit as default };
