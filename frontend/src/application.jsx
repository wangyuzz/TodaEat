// Recovered from deployed build. Original local names/types/comments are unavailable.
import {
  A,
  BrowserRouter,
  IconArrowLeft,
  IconCalendarDays,
  IconCamera,
  IconChevronRight,
  IconCirclePlus,
  IconHeart,
  IconHouse,
  IconLoaderCircle,
  IconMapPin,
  IconMenu,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSettings,
  IconShuffle,
  IconStar,
  IconStore,
  IconTrash2,
  IconTrophy,
  IconUtensilsCrossed,
  IconX,
  Link,
  Outlet,
  QueryClient,
  QueryClientProvider,
  React,
  ReactDOM,
  ReactDOMCore,
  Route,
  Routes,
  Toaster,
  __vite__mapDeps,
  axios,
  createIcon,
  createStore,
  ee,
  getJSXRuntime,
  getReact,
  getReactDOMCore,
  gsap,
  initHelpers,
  interopModule,
  jsxRuntime,
  re,
  toast,
  useGSAP,
  useLocation,
  useMutation,
  useNavigate,
  useParams,
  useQuery,
  useQueryClient,
  useSearchParams,
} from "./vendor/runtime.js";
function readStorage(e) {
  try {
    return window.localStorage.getItem(e);
  } catch (e) {
    return null;
  }
}
function writeStorage(e, t) {
  try {
    window.localStorage.setItem(e, t);
  } catch (e) {}
}
function removeStorage(e) {
  try {
    window.localStorage.removeItem(e);
  } catch (e) {}
}
var APP_NAME_KEY = `todayeat_app_name`;
function getCachedAppName() {
  return readStorage(APP_NAME_KEY) || `今天吃什么`;
}
var useAppInfoStore = createStore((e) => ({
    appName: getCachedAppName(),
    loaded: false,
    fetch: async () => {
      try {
        var t, n;
        let r = await axios.get(`/api/app-info`);
        if (
          ((t = r.data) == null ? void 0 : t.code) === 0 &&
          !((n = r.data) == null || (n = n.data) == null) &&
          n.app_name
        ) {
          let t = r.data.data.app_name;
          (writeStorage(APP_NAME_KEY, t),
            e({
              appName: t,
              loaded: true,
            }),
            (document.title = t));
        } else
          e({
            loaded: true,
          });
      } catch (t) {
        e({
          loaded: true,
        });
      }
    },
    setAppName: (t) => {
      (writeStorage(APP_NAME_KEY, t),
        e({
          appName: t,
        }),
        (document.title = t));
    },
  })),
  apiClient = axios.create({
    baseURL: `/api`,
    timeout: 1e4,
  }),
  APP_PASSWORD_KEY = `todayeat_app_password`;
(apiClient.interceptors.request.use((e) => {
  let t = readStorage(APP_PASSWORD_KEY);
  t && (e.headers[`X-App-Token`] = t);
  let n = readStorage(`token`);
  return (n && (e.headers.Authorization = `Bearer ${n}`), e);
}),
  apiClient.interceptors.response.use(
    (e) => e,
    (e) => {
      var t;
      if (((t = e.response) == null ? void 0 : t.status) === 401) {
        var n, r;
        (((n = e.config) == null ? void 0 : n.url) || ``).startsWith(`/admin/`) ||
        (!((r = e.config) == null || (r = r.headers) == null) && r.Authorization)
          ? (removeStorage(`token`), window.dispatchEvent(new Event(`admin-auth-expired`)))
          : (removeStorage(APP_PASSWORD_KEY), window.dispatchEvent(new Event(`app-auth-expired`)));
      }
      return Promise.reject(e);
    },
  ));
async function request(e, t, n) {
  let r = await apiClient.request({
    method: e,
    url: t,
    data: n,
    params: e === `GET` ? n : void 0,
  });
  if (r.data.code !== 0) throw Error(r.data.message);
  return r.data.data;
}
function getErrorMessage(e, t = `上传失败`) {
  var n;
  return axios.isAxiosError(e) && !((n = e.response) == null || (n = n.data) == null) && n.message
    ? e.response.data.message
    : e instanceof Error && e.message
      ? e.message
      : t;
}
var dishApi = {
    list: (e) => request(`GET`, `/dishes`, e),
    categoryCounts: () => request(`GET`, `/dishes/category-counts`),
    get: (e) => request(`GET`, `/dishes/${e}`),
    create: (e) => request(`POST`, `/dishes`, e),
    update: (e, t) => request(`PUT`, `/dishes/${e}`, t),
    delete: (e) => request(`DELETE`, `/dishes/${e}`),
    toggle: (e) => request(`PUT`, `/dishes/${e}/toggle`),
    clone: (e) => request(`POST`, `/dishes/${e}/clone`),
    batchToggle: (e, t) =>
      request(`POST`, `/dishes/batch-toggle`, {
        ids: e,
        enabled: t,
      }),
    batchDelete: (e) =>
      request(`POST`, `/dishes/batch-delete`, {
        ids: e,
      }),
    batchCategory: (e, t) =>
      request(`POST`, `/dishes/batch-category`, {
        ids: e,
        category: t,
      }),
  },
  recordApi = {
    list: (e) => request(`GET`, `/records`, e),
    delete: (e) => request(`DELETE`, `/records/${e}`),
  },
  uploadApi = {
    image: (e, t) => {
      let n = new FormData();
      return (
        n.append(`image`, e),
        apiClient.post(`/upload/image`, n, {
          headers: {
            "Content-Type": `multipart/form-data`,
          },
          timeout: 12e4,
          onUploadProgress: (e) => {
            e.total && (t == null || t(Math.min(99, Math.round((e.loaded / e.total) * 100))));
          },
        })
      );
    },
    deleteImage: (e) =>
      request(`DELETE`, `/upload/image`, {
        url: e,
      }),
  },
  authApi = {
    appLogin: (e) =>
      request(`POST`, `/app/login`, {
        password: e,
      }),
    login: (e) =>
      request(`POST`, `/admin/login`, {
        password: e,
      }),
  },
  achievementApi = {
    list: async () => {
      let e = await request(`GET`, `/achievements`);
      return Array.isArray(e) ? e : [];
    },
  },
  photoWallApi = {
    get: () => request(`GET`, `/photo-wall`),
  },
  settingsApi = {
    get: () => request(`GET`, `/settings`),
    update: (e) =>
      request(`PUT`, `/settings`, {
        settings: e,
      }),
  },
  dashboardApi = {
    get: () => request(`GET`, `/admin/dashboard`),
  },
  locationApi = {
    search: (e) =>
      request(`GET`, `/locations/search`, {
        keyword: e,
      }),
  },
  restaurantApi = {
    list: (e) => request(`GET`, `/restaurants`, e),
    categoryCounts: () => request(`GET`, `/restaurants/category-counts`),
    get: (e) => request(`GET`, `/restaurants/${e}`),
    dishes: (e) => request(`GET`, `/restaurants/${e}/dishes`),
    visits: (e) => request(`GET`, `/restaurants/${e}/visits`),
    toggleWish: (e) => request(`POST`, `/restaurants/${e}/wish`),
    create: (e) => request(`POST`, `/restaurants`, e),
    update: (e, t) => request(`PUT`, `/restaurants/${e}`, t),
    delete: (e) => request(`DELETE`, `/restaurants/${e}`),
  },
  visitApi = {
    list: (e) => request(`GET`, `/visits`, e),
    get: (e) => request(`GET`, `/visits/${e}`),
    stats: () => request(`GET`, `/visits/stats`),
    create: (e) => request(`POST`, `/visits`, e),
    update: (e, t) => request(`PUT`, `/visits/${e}`, t),
    delete: (e) => request(`DELETE`, `/visits/${e}`),
  },
  KNOWN_ACHIEVEMENTS_KEY = `todayeat_known_unlocked_achievements`,
  ACHIEVEMENT_OVERLAY_FLAG = `__todayeat_achievement_overlay_active`,
  CONFETTI_COLORS = [`#E8734A`, `#6EC6B8`, `#F5D76E`, `#F4A8A0`, `#8B5CF6`, `#FFFFFF`];
function getKnownAchievements() {
  try {
    let e = readStorage(KNOWN_ACHIEVEMENTS_KEY),
      t = e ? JSON.parse(e) : [];
    return new Set(Array.isArray(t) ? t.filter((e) => typeof e == `string`) : []);
  } catch (e) {
    return new Set();
  }
}
function saveKnownAchievements(e) {
  writeStorage(KNOWN_ACHIEVEMENTS_KEY, JSON.stringify(Array.from(e)));
}
function sortUnlockedAchievements(e, t) {
  let n = e.unlocked_at ? new Date(e.unlocked_at).getTime() : 0,
    r = t.unlocked_at ? new Date(t.unlocked_at).getTime() : 0;
  return n === r ? e.id - t.id : n - r;
}
function confettiStyle(e) {
  let t = 8 + ((e * 17) % 84),
    n = ((e % 7) - 3) * 18,
    r = (e % 9) * 70,
    i = 1500 + (e % 5) * 180,
    a = 6 + (e % 4) * 2;
  return {
    left: `${t}%`,
    width: `${a}px`,
    height: `${Math.max(4, a - 2)}px`,
    background: CONFETTI_COLORS[e % CONFETTI_COLORS.length],
    "--drift": `${n}px`,
    "--fall-delay": `${r}ms`,
    "--fall-duration": `${i}ms`,
  };
}
function AchievementUnlockOverlay() {
  let e = (0, React.useRef)(false),
    t = (0, React.useRef)(null),
    [n, r] = (0, React.useState)(false),
    i = (0, React.useRef)([]),
    a = (0, React.useRef)({
      leave: 0,
      next: 0,
    }),
    o = (0, React.useRef)(null),
    [s, c] = (0, React.useState)(null),
    [l, u] = (0, React.useState)(false),
    [d, f] = (0, React.useState)(0),
    p = (0, React.useRef)(() => {}),
    m = (0, React.useCallback)(() => {
      if (i.current.length === 0) {
        (c(null), (o.current = null), f(0));
        return;
      }
      let e = i.current[0];
      ((i.current = i.current.slice(1)),
        c(e),
        (o.current = e),
        u(false),
        f(i.current.length),
        window.clearTimeout(a.current.leave),
        window.clearTimeout(a.current.next),
        (a.current.leave = window.setTimeout(() => {
          u(true);
        }, 2600)),
        (a.current.next = window.setTimeout(() => {
          p.current();
        }, 3200)));
    }, []);
  ((p.current = m),
    (0, React.useEffect)(() => {
      if (!window[ACHIEVEMENT_OVERLAY_FLAG])
        return (
          (window[ACHIEVEMENT_OVERLAY_FLAG] = true),
          r(true),
          () => {
            window[ACHIEVEMENT_OVERLAY_FLAG] = false;
          }
        );
    }, []));
  let { data: h } = useQuery({
      queryKey: [`achievements`],
      queryFn: () => achievementApi.list(),
      enabled: n,
      refetchOnWindowFocus: true,
    }),
    g = Array.isArray(h) ? h : [],
    _ = (0, React.useMemo)(
      () => g.filter((e) => e.is_unlocked).sort(sortUnlockedAchievements),
      [g],
    );
  return (
    (0, React.useEffect)(() => {
      var n;
      if (g.length === 0) return;
      if (!e.current) {
        e.current = true;
        let n = getKnownAchievements();
        if (((t.current = n), n.size === 0)) {
          (_.forEach((e) => n.add(e.code)), saveKnownAchievements(n));
          return;
        }
      }
      let r = (n = t.current) == null ? getKnownAchievements() : n,
        a = _.filter((e) => !r.has(e.code));
      if (a.length === 0) return;
      (a.forEach((e) => r.add(e.code)), (t.current = r), saveKnownAchievements(r));
      let s = new Set([...i.current.map((e) => e.code), ...(o.current ? [o.current.code] : [])]),
        c = a.filter((e) => !s.has(e.code));
      c.length !== 0 && ((i.current = [...i.current, ...c]), f(i.current.length), o.current || m());
    }, [g.length, _, m]),
    (0, React.useEffect)(
      () => () => {
        (window.clearTimeout(a.current.leave), window.clearTimeout(a.current.next));
      },
      [],
    ),
    s ? (
      <div
        className={`achievement-unlock-layer ${l ? `is-leaving` : ``}`}
        children={[
          <div
            className={`achievement-confetti-field`}
            aria-hidden={`true`}
            children={Array.from({
              length: 32,
            }).map((e, t) => (
              <span className={`achievement-confetti-piece`} style={confettiStyle(t)} key={t} />
            ))}
          />,
          <div
            className={`achievement-unlock-card`}
            children={[
              <div className={`achievement-glow-ring`} aria-hidden={`true`} />,
              <div
                className={`achievement-icon-wrap`}
                children={<span className={`achievement-icon`} children={s.icon || `🏆`} />}
              />,
              <div className={`achievement-kicker`} children={`成就已解锁`} />,
              <div className={`achievement-title`} children={s.name} />,
              <div className={`achievement-desc`} children={s.description} />,
              d > 0 && (
                <div className={`achievement-chain`} children={[`连续解锁中 · 还剩 `, d, ` 个`]} />
              ),
            ]}
          />,
        ]}
      />
    ) : null
  );
}
function AppGate({ children: e }) {
  let [t, n] = (0, React.useState)(() => !!readStorage(APP_PASSWORD_KEY)),
    [r, i] = (0, React.useState)(``),
    a = useAppInfoStore((e) => e.appName);
  (0, React.useEffect)(() => {
    let e = () => n(false);
    return (
      window.addEventListener(`app-auth-expired`, e),
      () => window.removeEventListener(`app-auth-expired`, e)
    );
  }, []);
  let o = useMutation({
    mutationFn: () => authApi.appLogin(r),
    onSuccess: () => {
      (writeStorage(APP_PASSWORD_KEY, r), n(true), i(``), toast.success(`已进入`));
    },
    onError: () => toast.error(`应用密码错误`),
  });
  return t ? (
    <jsxRuntime.Fragment children={[e, <AchievementUnlockOverlay />]} />
  ) : (
    <div
      className={`min-h-screen bg-bg flex items-center justify-center px-5`}
      children={
        <div
          className={`w-full max-w-[360px] bg-card rounded-2xl border border-border p-5 shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)]`}
          children={[
            <div
              className={`text-center mb-5`}
              children={[
                <img
                  src={`/180.png`}
                  alt={a}
                  className={`w-[68px] h-[68px] mx-auto mb-2 rounded-[16px]`}
                />,
                <h1 className={`text-xl font-bold tracking-tight`} children={a} />,
                <p
                  className={`text-[13px] text-text2 mt-1`}
                  children={`输入应用密码后进入餐厅打卡`}
                />,
              ]}
            />,
            <label
              className={`block text-[13px] font-semibold mb-1.5 text-text2`}
              children={`应用密码`}
            />,
            <input
              type={`password`}
              value={r}
              placeholder={`请输入应用密码`}
              onChange={(e) => i(e.target.value)}
              onKeyDown={(e) => e.key === `Enter` && r && o.mutate()}
              className={`w-full py-2.5 px-3.5 rounded-[10px] border-[1.5px] border-border bg-bg text-sm transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(232,115,74,.1)] outline-none`}
            />,
            <button
              onClick={() => o.mutate()}
              disabled={!r || o.isPending}
              className={`w-full mt-4 py-2.5 px-5 rounded-full text-sm font-semibold bg-primary text-white transition-all active:scale-96 hover:bg-primary-dark disabled:opacity-50`}
              children={o.isPending ? `验证中...` : `进入应用`}
            />,
          ]}
        />
      }
    />
  );
}
var REDUCED_MOTION_QUERY = `(prefers-reduced-motion: reduce)`;
function prefersReducedMotion() {
  return typeof window < `u` && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
function motionDuration(e) {
  return prefersReducedMotion() ? 0 : e;
}
var CATEGORY_EMOJIS = {
  火锅: `🍲`,
  日料: `🍣`,
  烧烤: `🍢`,
  西餐: `🍝`,
  中餐: `🥘`,
  快餐: `🍔`,
  咖啡馆: `☕`,
  甜品: `🍰`,
  酒馆: `🍻`,
  小吃: `🥟`,
  其他: `🍽`,
};
function isImageURL(e) {
  return e
    ? e.startsWith(`/uploads/`) ||
        e.startsWith(`http`) ||
        /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(e)
    : false;
}
function restaurantImageURL(e) {
  return isImageURL(e.display_image_url)
    ? e.display_image_url
    : isImageURL(e.cover_url)
      ? e.cover_url
      : Array.isArray(e.images) && e.images.length > 0 && isImageURL(e.images[0])
        ? e.images[0]
        : null;
}
function restaurantEmoji(e) {
  return CATEGORY_EMOJIS[e.category] || `🍽`;
}
function RestaurantImage({ restaurant: e, className: t = ``, emojiSize: n = `text-4xl` }) {
  let [r, i] = (0, React.useState)(false),
    a = restaurantImageURL(e);
  return (
    (0, React.useEffect)(() => {
      i(false);
    }, [a]),
    a && !r ? (
      <div
        className={t}
        children={
          <img
            src={a}
            alt={e.name}
            className={`h-full w-full object-cover`}
            loading={`lazy`}
            decoding={`async`}
            onError={() => i(true)}
          />
        }
      />
    ) : (
      <div className={`${t} flex items-center justify-center ${n}`} children={restaurantEmoji(e)} />
    )
  );
}
initHelpers();
var fy = [`className`, `children`];
function IconButton(e) {
  let { className: t = ``, children: n } = e,
    r = ee(e, fy);
  return (0, jsxRuntime.jsx)(
    `button`,
    A(
      A(
        {
          className: `inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 text-text2 shadow-[0_1px_3px_rgba(26,26,46,.05),0_6px_18px_rgba(26,26,46,.06)] transition-all hover:border-primary/20 hover:bg-primary-light hover:text-primary active:scale-95 ${t}`,
        },
        r,
      ),
      {},
      {
        children: n,
      },
    ),
  );
}
function PageHeader({
  title: e,
  subtitle: t,
  icon: n,
  meta: r,
  actions: i,
  onBack: a,
  centerTitle: o = false,
  className: s = ``,
}) {
  return (
    <header
      className={`sticky top-0 z-[100] border-b border-white/70 bg-bg/86 backdrop-blur-2xl shadow-[0_10px_28px_rgba(26,26,46,.045)] ${s}`}
      children={
        <div
          className={`mx-auto grid min-h-[64px] max-w-[640px] grid-cols-[1fr_auto] items-center gap-3 px-5 py-2`}
          children={[
            <div
              className={`flex min-w-0 items-center gap-3`}
              children={[
                a && (
                  <IconButton
                    onClick={a}
                    aria-label={`返回`}
                    className={`shrink-0`}
                    children={<IconArrowLeft size={18} strokeWidth={2.4} />}
                  />
                ),
                n && (
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-primary/10 bg-primary-light text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.82),0_7px_18px_rgba(232,115,74,.11)]`}
                    children={(0, jsxRuntime.jsx)(n, {
                      size: 23,
                      strokeWidth: 2.45,
                    })}
                  />
                ),
                <div
                  className={`min-w-0 ${o ? `text-center` : ``}`}
                  children={[
                    <div
                      className={`truncate text-[18px] font-extrabold leading-tight tracking-tight text-text`}
                      children={e}
                    />,
                    t && (
                      <div
                        className={`mt-1 truncate text-[12px] font-medium leading-tight text-text3`}
                        children={t}
                      />
                    ),
                  ]}
                />,
              ]}
            />,
            <div
              className={`ml-auto flex min-w-0 shrink-0 items-center justify-end gap-2`}
              children={[
                r && (
                  <div
                    className={`max-w-[150px] truncate text-right text-[11px] font-medium text-text3`}
                    children={r}
                  />
                ),
                i,
              ]}
            />,
          ]}
        />
      }
    />
  );
}
function SectionHeader({ title: e, action: t, className: n = `` }) {
  return (
    <div
      className={`flex items-center justify-between mb-3.5 ${n}`}
      children={[<div className={`text-lg font-bold`} children={e} />, t]}
    />
  );
}
var CARD_SHADOW = `shadow-[0_1px_3px_rgba(0,0,0,.04),0_4px_12px_rgba(0,0,0,.04)]`,
  useAuthStore = createStore((e) => ({
    token: readStorage(`token`),
    isLoggedIn: !!readStorage(`token`),
    login: (t) => {
      (writeStorage(`token`, t),
        e({
          token: t,
          isLoggedIn: true,
        }));
    },
    logout: () => {
      (removeStorage(`token`),
        e({
          token: null,
          isLoggedIn: false,
        }));
    },
  }));
function greeting() {
  let e = new Date().getHours();
  return e < 6
    ? `夜深了~`
    : e < 11
      ? `早上好 ☀️`
      : e < 14
        ? `中午好 🍜`
        : e < 18
          ? `下午好 ☕`
          : `晚上好 🌙`;
}
function Home() {
  let e = useNavigate(),
    t = useAuthStore((e) => e.isLoggedIn),
    n = useAppInfoStore((e) => e.appName),
    { data: r, isLoading: i } = useQuery({
      queryKey: [`restaurants`, `wheel`],
      queryFn: () =>
        restaurantApi.list({
          sort: `random`,
          pageSize: `12`,
        }),
    }),
    { data: a } = useQuery({
      queryKey: [`visits`, `recent`],
      queryFn: () =>
        visitApi.list({
          pageSize: `3`,
        }),
    }),
    { data: o } = useQuery({
      queryKey: [`visit-stats`],
      queryFn: () => visitApi.stats(),
    }),
    { data: s } = useQuery({
      queryKey: [`restaurants`, `wish-home`],
      queryFn: () =>
        restaurantApi.list({
          wish: `true`,
          pageSize: `10`,
        }),
    }),
    c = (0, React.useMemo)(() => (r == null ? void 0 : r.items) || [], [r]),
    l = (a == null ? void 0 : a.items) || [],
    u = (s == null ? void 0 : s.items) || [],
    [d, f] = (0, React.useState)(0),
    p = c[d] || null;
  (0, React.useEffect)(() => {
    d >= c.length && f(0);
  }, [d, c.length]);
  function m() {
    c.length <= 1 ||
      f((e) => {
        let t = e;
        for (; t === e;) t = Math.floor(Math.random() * c.length);
        return t;
      });
  }
  return (
    <div
      className={`animate-fadeUp`}
      children={[
        <PageHeader
          title={n}
          subtitle={`今天和你吃点好的`}
          icon={IconHouse}
          actions={
            <IconButton
              onClick={() => e(t ? `/admin/dashboard` : `/admin/login`)}
              aria-label={`管理设置`}
              children={<IconSettings size={18} strokeWidth={2.3} />}
            />
          }
        />,
        <div
          className={`px-5 py-4 max-w-[640px] mx-auto`}
          children={[
            <div
              className={`mb-4`}
              children={[
                <div className={`text-sm text-text2 mb-1`} children={greeting()} />,
                <div
                  className={`text-[26px] font-extrabold tracking-tight leading-tight`}
                  children={[
                    `今天`,
                    <em className={`not-italic text-primary`} children={`吃点什么`} />,
                    `呢？`,
                  ]}
                />,
              ]}
            />,
            o && o.total_visits > 0 && (
              <div
                className={`flex items-center justify-around bg-card rounded-2xl py-3 mb-5 border border-border shadow-[0_1px_3px_rgba(0,0,0,.04),0_4px_12px_rgba(0,0,0,.04)]`}
                children={[
                  <HomeStat value={o.distinct_restaurants} label={`探过店`} />,
                  <div className={`w-px h-7 bg-border`} />,
                  <HomeStat value={o.total_visits} label={`次约饭`} />,
                  <div className={`w-px h-7 bg-border`} />,
                  <HomeStat
                    value={o.total_cost > 0 ? `¥${o.total_cost}` : `¥0`}
                    label={`总花费`}
                  />,
                ]}
              />
            ),
            <button
              onClick={() => e(`/check-in`)}
              className={`w-full mb-6 p-5 rounded-2xl bg-primary text-white flex items-center gap-4 active:scale-98 transition-all shadow-[0_8px_24px_rgba(232,115,74,.32)]`}
              children={[
                <div
                  className={`w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0`}
                  children={`📝`}
                />,
                <div
                  className={`flex-1 text-left`}
                  children={[
                    <div className={`text-[17px] font-bold`} children={`记录这一餐`} />,
                    <div
                      className={`text-[12px] text-white/85 mt-0.5`}
                      children={`刚吃完？把它存进我们的足迹`}
                    />,
                  ]}
                />,
                <IconPlus size={22} />,
              ]}
            />,
            <SectionHeader
              title={`🎲 今天去哪吃`}
              action={
                <button
                  onClick={m}
                  disabled={c.length <= 1}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-text2 transition-all hover:bg-primary-light hover:text-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-45`}
                  children={[<IconShuffle size={14} />, ` 换一家`]}
                />
              }
            />,
            i ? (
              <div
                className={`mb-6 overflow-hidden rounded-2xl border border-border bg-card ${CARD_SHADOW}`}
                children={[
                  <div className={`skeleton h-[180px] w-full`} />,
                  <div
                    className={`space-y-2 p-4`}
                    children={[
                      <div className={`skeleton h-5 w-40 rounded-full`} />,
                      <div className={`skeleton h-3 w-56 rounded-full`} />,
                    ]}
                  />,
                ]}
              />
            ) : p ? (
              <div
                onClick={() => e(`/restaurants/${p.id}`)}
                className={`bg-card rounded-2xl overflow-hidden ${CARD_SHADOW} mb-6 cursor-pointer border border-border active:scale-98 transition-all animate-fadeUp`}
                children={[
                  <div
                    className={`relative h-[180px] bg-gradient-to-br from-primary-light via-yellow-light to-mint-light`}
                    children={[
                      <RestaurantImage
                        restaurant={p}
                        className={`w-full h-full`}
                        emojiSize={`text-[64px]`}
                      />,
                      <div
                        className={`absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/28 to-transparent`}
                      />,
                      <span
                        className={`absolute top-3 left-3 bg-white/92 px-3 py-1 rounded-full text-xs font-semibold text-primary`}
                        children={`🍽 就去这家？`}
                      />,
                    ]}
                  />,
                  <div
                    className={`p-4`}
                    children={[
                      <div className={`mb-1 truncate text-xl font-bold`} children={p.name} />,
                      <div
                        className={`flex min-w-0 items-center gap-2 text-[12px] text-text2`}
                        children={[
                          p.category && p.category !== `其他` && (
                            <span
                              className={`px-2 py-0.5 rounded-full bg-mint-light text-mint font-semibold`}
                              children={p.category}
                            />
                          ),
                          p.address && (
                            <span
                              className={`flex items-center gap-0.5 truncate`}
                              children={[<IconMapPin size={11} />, p.address]}
                            />
                          ),
                        ]}
                      />,
                    ]}
                  />,
                ]}
              />
            ) : (
              <button
                onClick={() => e(`/restaurants`)}
                className={`mb-6 w-full rounded-2xl border border-dashed border-border2 bg-card px-5 py-8 text-center transition-all active:scale-98 ${CARD_SHADOW}`}
                children={[
                  <span className={`mb-3 block text-[42px]`} children={`🍽`} />,
                  <span
                    className={`block text-[14px] font-semibold text-text`}
                    children={`还没有餐厅`}
                  />,
                  <span
                    className={`mt-1 block text-[12px] text-text3`}
                    children={`去「餐厅」加几家，就能随机推荐了`}
                  />,
                ]}
              />
            ),
            l.length > 0 && (
              <jsxRuntime.Fragment
                children={[
                  <SectionHeader
                    title={`📅 最近足迹`}
                    action={
                      <button
                        onClick={() => e(`/history`)}
                        className={`text-sm text-text2 hover:text-primary`}
                        children={`全部 ›`}
                      />
                    }
                  />,
                  <div
                    className={`space-y-2.5 mb-6`}
                    children={l.map((t) => {
                      var n, r;
                      return (
                        <div
                          onClick={() => e(`/restaurants/${t.restaurant_id}`)}
                          className={`bg-card rounded-xl p-3 border border-border shadow-[0_1px_3px_rgba(0,0,0,.04),0_4px_12px_rgba(0,0,0,.04)] flex items-center gap-3 active:scale-98 transition-all cursor-pointer`}
                          children={[
                            <div
                              className={`w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-lg flex-shrink-0 overflow-hidden`}
                              children={
                                (n = t.photos) != null && n[0] ? (
                                  <img
                                    src={t.photos[0]}
                                    alt={t.restaurant_name}
                                    className={`w-full h-full object-cover`}
                                    loading={`lazy`}
                                    decoding={`async`}
                                  />
                                ) : (
                                  <span children={`🍽`} />
                                )
                              }
                            />,
                            <div
                              className={`flex-1 min-w-0`}
                              children={[
                                <div
                                  className={`text-[14px] font-semibold truncate`}
                                  children={t.restaurant_name}
                                />,
                                <div
                                  className={`text-[11px] text-text2`}
                                  children={[
                                    t.visit_date,
                                    (r = t.items) != null && r.length
                                      ? ` · ${t.items.length}道菜`
                                      : ``,
                                    t.cost > 0 ? ` · ¥${t.cost}` : ``,
                                  ]}
                                />,
                              ]}
                            />,
                          ]}
                          key={t.id}
                        />
                      );
                    })}
                  />,
                ]}
              />
            ),
            u.length > 0 && (
              <jsxRuntime.Fragment
                children={[
                  <SectionHeader
                    title={`💗 想去清单`}
                    action={
                      <button
                        onClick={() => e(`/restaurants`)}
                        className={`text-sm text-text2 hover:text-primary`}
                        children={`更多 ›`}
                      />
                    }
                  />,
                  <div
                    className={`flex gap-3 overflow-x-auto scrollbar-none pb-2`}
                    children={u.map((t) => (
                      <div
                        onClick={() => e(`/restaurants/${t.id}`)}
                        className={`w-[130px] flex-shrink-0 bg-card rounded-2xl overflow-hidden border border-border cursor-pointer active:scale-97 transition-all`}
                        children={[
                          <div
                            className={`h-[90px] bg-gradient-to-br from-pink-light to-primary-light`}
                            children={
                              <RestaurantImage
                                restaurant={t}
                                className={`w-full h-full`}
                                emojiSize={`text-[36px]`}
                              />
                            }
                          />,
                          <div
                            className={`p-2.5`}
                            children={[
                              <div
                                className={`text-[13px] font-semibold truncate`}
                                children={t.name}
                              />,
                              <div
                                className={`text-[11px] text-text3 truncate`}
                                children={t.category}
                              />,
                            ]}
                          />,
                        ]}
                        key={t.id}
                      />
                    ))}
                  />,
                ]}
              />
            ),
          ]}
        />,
      ]}
    />
  );
}
function HomeStat({ value: e, label: t }) {
  return (
    <div
      className={`text-center`}
      children={[
        <div className={`text-[18px] font-extrabold text-primary leading-none`} children={e} />,
        <div className={`text-[10px] text-text3 mt-1`} children={t} />,
      ]}
    />
  );
}
function LocationInput({
  value: e,
  onChange: t,
  placeholder: n = `可选地址`,
  nameHint: r = ``,
  className: i = ``,
}) {
  let [a, o] = (0, React.useState)([]),
    [s, c] = (0, React.useState)(false),
    [l, u] = (0, React.useState)(``);
  async function d() {
    let t = `${e || r}`.trim();
    if (t.length < 2) {
      (u(`先输入店名或地址关键字`), o([]));
      return;
    }
    (c(true), u(``));
    try {
      let e = await locationApi.search(t);
      if (!e.configured) {
        (o([]), u(`地址搜索需要先配置高德 AMAP_KEY，也可以手动填写`));
        return;
      }
      (o(e.items), e.items.length === 0 && u(`没搜到地址，可以手动填写`));
    } catch (e) {
      (o([]), u(`地址搜索暂时不可用，可以手动填写`));
    } finally {
      c(false);
    }
  }
  function f(e) {
    (t(e.address || e.name), o([]), u(``));
  }
  return (
    <div
      className={i}
      children={[
        <div
          className={`flex gap-2`}
          children={[
            <div
              className={`relative min-w-0 flex-1`}
              children={[
                <IconMapPin
                  size={14}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 text-text3`}
                />,
                <input
                  value={e}
                  onChange={(e) => t(e.target.value)}
                  placeholder={n}
                  className={`w-full rounded-xl border border-border bg-bg py-2 pl-8 pr-3 text-[14px] outline-none transition-all focus:border-primary`}
                />,
              ]}
            />,
            <button
              type={`button`}
              onClick={d}
              disabled={s}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-all active:scale-95 disabled:opacity-60`}
              aria-label={`搜索地址`}
              title={`搜索地址`}
              children={
                s ? (
                  <IconLoaderCircle size={16} className={`animate-spin`} />
                ) : (
                  <IconSearch size={16} />
                )
              }
            />,
          ]}
        />,
        (a.length > 0 || l) && (
          <div
            className={`mt-2 overflow-hidden rounded-xl border border-border bg-card`}
            children={[
              a.map((e) => (
                <button
                  type={`button`}
                  onClick={() => f(e)}
                  className={`block w-full border-b border-border px-3 py-2.5 text-left text-[12px] leading-relaxed text-text2 last:border-b-0 active:bg-primary-light`}
                  children={[
                    <span
                      className={`block text-[13px] font-semibold text-text`}
                      children={e.name}
                    />,
                    <span className={`mt-0.5 block`} children={e.address || e.district} />,
                  ]}
                  key={`${e.name}-${e.location}-${e.address}`}
                />
              )),
              l && <div className={`px-3 py-2 text-[12px] text-text3`} children={l} />,
            ]}
          />
        ),
      ]}
    />
  );
}
function BottomSheet({ children: e, onClose: t, className: n = ``, zIndexClass: r = `z-[200]` }) {
  let i = (0, React.useRef)(null),
    a = (0, React.useRef)(null),
    o = (0, React.useRef)(false),
    { contextSafe: s } = useGSAP(
      () => {
        gsap
          .timeline({
            defaults: {
              ease: `power3.out`,
            },
          })
          .fromTo(
            i.current,
            {
              autoAlpha: 0,
            },
            {
              autoAlpha: 1,
              duration: motionDuration(0.18),
            },
          )
          .fromTo(
            a.current,
            {
              yPercent: 100,
            },
            {
              yPercent: 0,
              duration: motionDuration(0.34),
              clearProps: `transform`,
            },
            0,
          );
      },
      {
        scope: i,
      },
    ),
    c = s(() => {
      o.current ||
        ((o.current = true),
        gsap
          .timeline({
            onComplete: t,
            defaults: {
              ease: `power2.in`,
            },
          })
          .to(
            a.current,
            {
              yPercent: 100,
              duration: motionDuration(0.24),
            },
            0,
          )
          .to(
            i.current,
            {
              autoAlpha: 0,
              duration: motionDuration(0.18),
            },
            0,
          ));
    });
  return (0, ReactDOMCore.createPortal)(
    <div
      ref={i}
      className={`fixed inset-0 ${r} flex items-end justify-center`}
      onClick={c}
      children={[
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm`} />,
        <div
          ref={a}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-[640px] bg-card will-change-transform ${n}`}
          children={
            typeof e == `function`
              ? e({
                  close: c,
                })
              : e
          }
        />,
      ]}
    />,
    document.body,
  );
}
function Restaurants() {
  let e = useNavigate(),
    [t] = useSearchParams(),
    n = useQueryClient(),
    r = useAuthStore((e) => e.isLoggedIn),
    [i, a] = (0, React.useState)(``),
    [o, s] = (0, React.useState)(`全部`),
    [c, l] = (0, React.useState)(t.get(`wish`) === `true`),
    [u, d] = (0, React.useState)(false);
  (0, React.useEffect)(() => {
    l(t.get(`wish`) === `true`);
  }, [t]);
  let { data: f } = useQuery({
      queryKey: [`restaurants`, `category-counts`],
      queryFn: () => restaurantApi.categoryCounts(),
    }),
    p = (0, React.useMemo)(() => {
      var e;
      return [
        `全部`,
        ...((f == null || (e = f.categories) == null ? void 0 : e.map((e) => e.category)) || []),
      ];
    }, [f]),
    m = (0, React.useMemo)(() => {
      let e = {
        pageSize: `100`,
        sort: `created_at`,
        order: `desc`,
      };
      return (o !== `全部` && (e.category = o), i && (e.search = i), c && (e.wish = `true`), e);
    }, [o, i, c]),
    { data: h, isLoading: g } = useQuery({
      queryKey: [`restaurants`, m],
      queryFn: () => restaurantApi.list(m),
    }),
    _ = (h == null ? void 0 : h.items) || [],
    v = useMutation({
      mutationFn: (e) => restaurantApi.toggleWish(e),
      onSuccess: () =>
        n.invalidateQueries({
          queryKey: [`restaurants`],
        }),
    });
  return (
    <div
      className={`animate-fadeUp flex flex-col h-full`}
      children={[
        <PageHeader
          title={`去哪吃`}
          subtitle={`我们的餐厅清单`}
          icon={IconStore}
          actions={
            <IconButton
              onClick={() => e(r ? `/admin/dashboard` : `/admin/login`)}
              aria-label={`管理设置`}
              children={<IconSettings size={18} strokeWidth={2.3} />}
            />
          }
        />,
        <div
          className={`px-5 pt-3 pb-2 max-w-[640px] mx-auto w-full`}
          children={[
            <div
              className={`relative`}
              children={[
                <span
                  className={`absolute left-3 top-1/2 -translate-y-1/2 text-text3 text-sm`}
                  children={`🔍`}
                />,
                <input
                  type={`text`}
                  placeholder={`搜索餐厅名…`}
                  value={i}
                  onChange={(e) => a(e.target.value)}
                  className={`w-full py-2 pl-9 pr-3 rounded-full bg-bg border border-border text-[13px] transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(232,115,74,.12)] outline-none`}
                />,
              ]}
            />,
            <div
              className={`flex gap-2 mt-3`}
              children={[
                <button
                  onClick={() => l(false)}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all active:scale-95 ${c ? `bg-card border border-border text-text2` : `bg-primary text-white`}`}
                  children={`全部`}
                />,
                <button
                  onClick={() => l(true)}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all active:scale-95 ${c ? `bg-pink text-white` : `bg-card border border-border text-text2`}`}
                  children={`💗 想去`}
                />,
              ]}
            />,
            <div
              className={`flex gap-2 overflow-x-auto mt-3 pb-1 scrollbar-none`}
              children={p.map((e) => (
                <button
                  onClick={() => s(e)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap transition-all active:scale-95 ${o === e ? `bg-mint text-white` : `bg-card border border-border text-text2`}`}
                  children={e}
                  key={e}
                />
              ))}
            />,
          ]}
        />,
        <div
          className={`flex-1 overflow-y-auto px-5 pt-1 max-w-[640px] mx-auto w-full`}
          style={{
            paddingBottom: `calc(84px + env(safe-area-inset-bottom))`,
          }}
          children={
            g ? (
              <div
                className={`space-y-3 pt-2`}
                children={Array.from({
                  length: 4,
                }).map((e, t) => (
                  <div
                    className={`flex gap-3 p-2`}
                    children={[
                      <div className={`skeleton w-[84px] h-[84px] rounded-xl`} />,
                      <div
                        className={`flex-1 space-y-2 py-2`}
                        children={[
                          <div className={`skeleton h-4 w-2/3 rounded`} />,
                          <div className={`skeleton h-3 w-1/2 rounded`} />,
                        ]}
                      />,
                    ]}
                    key={t}
                  />
                ))}
              />
            ) : _.length === 0 ? (
              <div
                className={`text-center py-16`}
                children={[
                  <span className={`text-[56px] block mb-4 animate-float`} children={`🏪`} />,
                  <div
                    className={`text-base font-semibold mb-1.5`}
                    children={c ? `还没有想去的店` : `还没有餐厅`}
                  />,
                  <div className={`text-[13px] text-text2`} children={`点右下角 + 添加你们的店`} />,
                ]}
              />
            ) : (
              <div
                className={`space-y-2.5 pt-1`}
                children={[
                  _.map((t) => (
                    <RestaurantCard
                      r={t}
                      onClick={() => e(`/restaurants/${t.id}`)}
                      onToggleWish={() => v.mutate(t.id)}
                      key={t.id}
                    />
                  )),
                  <div
                    className={`py-3 text-center text-[11px] text-text3`}
                    children={[`共 `, _.length, ` 家店`]}
                  />,
                ]}
              />
            )
          }
        />,
        <button
          onClick={() => d(true)}
          aria-label={`添加餐厅`}
          className={`fixed bottom-[calc(74px+env(safe-area-inset-bottom))] right-5 z-[120] w-14 h-14 rounded-full bg-primary text-white shadow-[0_8px_24px_rgba(232,115,74,.4)] flex items-center justify-center active:scale-90 transition-transform`}
          children={<IconPlus size={26} strokeWidth={2.6} />}
        />,
        u && (
          <QuickAddRestaurantSheet
            onClose={() => d(false)}
            categories={p.filter((e) => e !== `全部`)}
            onCreated={() =>
              n.invalidateQueries({
                queryKey: [`restaurants`],
              })
            }
          />
        ),
      ]}
    />
  );
}
function RestaurantCard({ r: e, onClick: t, onToggleWish: n }) {
  var r;
  return (
    <div
      onClick={t}
      className={`flex gap-3 p-2.5 bg-card rounded-2xl border border-border ${CARD_SHADOW} transition-all active:scale-98 cursor-pointer`}
      children={[
        <div
          className={`w-[84px] h-[84px] rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary-light to-mint-light`}
          children={
            <RestaurantImage restaurant={e} className={`w-full h-full`} emojiSize={`text-[36px]`} />
          }
        />,
        <div
          className={`flex-1 min-w-0 py-0.5`}
          children={[
            <div
              className={`flex items-center gap-1.5`}
              children={[
                <span className={`text-[15px] font-bold truncate`} children={e.name} />,
                <button
                  onClick={(e) => {
                    (e.stopPropagation(), n());
                  }}
                  className={`flex-shrink-0 transition-all active:scale-90 ${e.wish ? `text-pink` : `text-text4`}`}
                  children={<IconHeart size={15} className={e.wish ? `fill-pink` : ``} />}
                />,
              ]}
            />,
            <div
              className={`flex items-center gap-1.5 text-[12px] text-text2 mt-1`}
              children={[
                <span
                  className={`px-1.5 py-0.5 rounded-full bg-mint-light text-mint text-[10px] font-semibold`}
                  children={e.category || `其他`}
                />,
                e.address && (
                  <jsxRuntime.Fragment
                    children={[
                      <IconMapPin size={11} className={`text-text3 flex-shrink-0`} />,
                      <span className={`truncate`} children={e.address} />,
                    ]}
                  />
                ),
              ]}
            />,
            e.signature && (
              <div
                className={`text-[12px] text-text2 mt-1 truncate`}
                children={[`招牌：`, e.signature]}
              />
            ),
            ((r = e.tags) == null ? void 0 : r.length) > 0 && (
              <div
                className={`flex gap-1 mt-1.5 flex-wrap`}
                children={e.tags.slice(0, 3).map((e) => (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] bg-bg text-text3 border border-border`}
                    children={e}
                    key={e}
                  />
                ))}
              />
            ),
          ]}
        />,
      ]}
    />
  );
}
var INPUT_CLASS = `w-full py-2 px-3 rounded-xl bg-bg border border-border text-[14px] focus:border-primary outline-none transition-all`;
function Field({ label: e, children: t }) {
  return (
    <div
      children={[<div className={`text-[12px] font-semibold text-text2 mb-1.5`} children={e} />, t]}
    />
  );
}
function QuickAddRestaurantSheet({ onClose: e, categories: t, onCreated: n }) {
  let [r, i] = (0, React.useState)(``),
    [a, o] = (0, React.useState)(``),
    [s, c] = (0, React.useState)(``),
    [l, u] = (0, React.useState)(``),
    [d, f] = (0, React.useState)(false),
    p = useMutation({
      mutationFn: (e) => restaurantApi.create(e),
      onSuccess: () => {
        (toast.success(`已添加餐厅`), n(), e());
      },
      onError: () => toast.error(`添加失败`),
    });
  function m() {
    if (!r.trim()) {
      toast.error(`请填写店名`);
      return;
    }
    let e = l
      .split(/[,，\s]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    p.mutate({
      name: r.trim(),
      category: `其他`,
      address: a.trim(),
      signature: s.trim(),
      tags: JSON.stringify(e),
      wish: d,
    });
  }
  return (
    <BottomSheet
      onClose={e}
      className={`flex max-h-[82dvh] flex-col rounded-t-2xl`}
      children={({ close: e }) => (
        <jsxRuntime.Fragment
          children={[
            <div
              className={`flex items-center justify-between px-5 py-4 border-b border-border`}
              children={[
                <div className={`text-base font-bold`} children={`🏪 添加餐厅`} />,
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
                <Field
                  label={`店名 *`}
                  children={
                    <input
                      value={r}
                      onChange={(e) => i(e.target.value)}
                      placeholder={`如 海底捞·万达店`}
                      className={INPUT_CLASS}
                    />
                  }
                />,
                <Field
                  label={`地址`}
                  children={<LocationInput value={a} onChange={o} nameHint={r} />}
                />,
                <Field
                  label={`招牌菜`}
                  children={
                    <input
                      value={s}
                      onChange={(e) => c(e.target.value)}
                      placeholder={`可选，如 毛肚 · 虾滑`}
                      className={INPUT_CLASS}
                    />
                  }
                />,
                <Field
                  label={`标签`}
                  children={
                    <input
                      value={l}
                      onChange={(e) => u(e.target.value)}
                      placeholder={`逗号分隔，如 适合约会, 有包间`}
                      className={INPUT_CLASS}
                    />
                  }
                />,
                <label
                  className={`flex items-center gap-2 text-[13px] cursor-pointer`}
                  children={[
                    <input
                      type={`checkbox`}
                      checked={d}
                      onChange={(e) => f(e.target.checked)}
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
                  onClick={m}
                  disabled={p.isPending}
                  className={`w-full py-2.5 rounded-full text-[14px] font-semibold bg-primary text-white active:scale-96 disabled:opacity-60`}
                  children={p.isPending ? `保存中…` : `保存`}
                />
              }
            />,
          ]}
        />
      )}
    />
  );
}
function PhotoViewer({ photos: e, idx: t, setIdx: n, onClose: r }) {
  let i = (0, React.useRef)(null),
    a = (0, React.useRef)(null),
    o = (0, React.useRef)(0),
    s = (0, React.useRef)(false),
    c = (0, React.useRef)(t);
  (0, React.useEffect)(() => {
    ((c.current = t),
      gsap.set(a.current, {
        x: -t * window.innerWidth,
      }));
  }, [t]);
  let { contextSafe: l } = useGSAP(
      () => {
        (gsap.set(a.current, {
          x: -c.current * window.innerWidth,
        }),
          gsap.fromTo(
            i.current,
            {
              autoAlpha: 0,
            },
            {
              autoAlpha: 1,
              duration: motionDuration(0.2),
            },
          ));
      },
      {
        scope: i,
      },
    ),
    u = l(() => {
      gsap.to(i.current, {
        autoAlpha: 0,
        duration: motionDuration(0.18),
        ease: `power1.out`,
        onComplete: r,
      });
    }),
    d = l((e, t) => {
      a.current &&
        ((s.current = true),
        gsap.to(a.current, {
          x: -e * window.innerWidth,
          duration: t ? motionDuration(0.3) : 0,
          ease: `power3.out`,
          overwrite: true,
          onComplete: () => {
            ((s.current = false), (c.current = e), n(e));
          },
        }));
    });
  function f(e) {
    a.current &&
      gsap.set(a.current, {
        x: -c.current * window.innerWidth + e,
        force3D: true,
      });
  }
  function p(e) {
    s.current || (o.current = e.touches[0].clientX);
  }
  function m(t) {
    s.current || f((t.touches[0].clientX - o.current) * (e.length <= 1 ? 0.2 : 1));
  }
  function h(t) {
    if (s.current) return;
    let n = t.changedTouches[0].clientX - o.current;
    n < -80 && e.length > 1
      ? d((c.current + 1) % e.length, true)
      : n > 80 && e.length > 1
        ? d((c.current - 1 + e.length) % e.length, true)
        : d(c.current, true);
  }
  function g() {
    s.current || d((c.current - 1 + e.length) % e.length, true);
  }
  function _() {
    s.current || d((c.current + 1) % e.length, true);
  }
  return (
    <div
      ref={i}
      className={`fixed inset-0 z-500 flex flex-col bg-black/92 select-none`}
      children={[
        <button
          onClick={u}
          aria-label={`关闭图片预览`}
          className={`absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg text-white`}
          children={`x`}
        />,
        e.length > 1 && (
          <jsxRuntime.Fragment
            children={[
              <button
                onClick={g}
                className={`absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-lg text-white active:bg-white/25`}
                children={`←`}
              />,
              <button
                onClick={_}
                className={`absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-lg text-white active:bg-white/25`}
                children={`→`}
              />,
            ]}
          />
        ),
        <div
          className={`flex-1 overflow-hidden`}
          onTouchStart={p}
          onTouchMove={m}
          onTouchEnd={h}
          style={{
            touchAction: `pan-y`,
          }}
          children={
            <div
              ref={a}
              className={`flex h-full will-change-transform`}
              style={{
                width: `${e.length * 100}vw`,
              }}
              children={e.map((e, t) => (
                <div
                  className={`flex shrink-0 items-center justify-center`}
                  style={{
                    width: `100vw`,
                  }}
                  children={
                    <img
                      src={e}
                      alt={``}
                      className={`max-h-[75vh] max-w-[90vw] rounded-lg object-contain`}
                      draggable={false}
                    />
                  }
                  key={t}
                />
              ))}
            />
          }
        />,
        <div
          className={`pb-6 text-center text-[13px] text-white/50`}
          children={[t + 1, ` / `, e.length]}
        />,
      ]}
    />
  );
}
function SwipeDeleteRow({ children: e, onDelete: t, actionWidth: n, className: r = `` }) {
  let i = (0, React.useRef)(null),
    a = (0, React.useRef)(0),
    o = (0, React.useRef)(0),
    s = (0, React.useRef)(false);
  function c(e, t = false) {
    ((o.current = e),
      gsap.to(i.current, {
        x: e,
        duration: t ? motionDuration(0.2) : 0,
        ease: `power2.out`,
        overwrite: true,
        force3D: true,
      }),
      i.current && (i.current.style.zIndex = e < -10 ? `5` : `20`));
  }
  function l(e) {
    ((s.current = true), (a.current = e.touches[0].clientX));
  }
  function u(e) {
    if (!s.current) return;
    let t = e.touches[0].clientX - a.current,
      r = Math.min(0, o.current + t);
    (c(Math.max(r, -n)), (a.current = e.touches[0].clientX));
  }
  function d() {
    ((s.current = false), c(o.current < -30 ? -n : 0, true));
  }
  return (
    <div
      className={`relative overflow-hidden ${r}`}
      children={[
        <button
          onClick={t}
          onTouchEnd={(e) => {
            (e.preventDefault(), t());
          }}
          className={`absolute bottom-0 right-0 top-0 z-10 flex items-center justify-center bg-red text-sm font-semibold text-white transition-colors active:bg-[#b91c1c]`}
          style={{
            width: n,
          }}
          children={`删除`}
        />,
        <div
          ref={i}
          className={`relative z-20 bg-card will-change-transform`}
          style={{
            touchAction: `pan-y`,
          }}
          onTouchStart={l}
          onTouchMove={u}
          onTouchEnd={d}
          children={e}
        />,
      ]}
    />
  );
}
var MOOD_EMOJIS = {
  happy: `😊`,
  love: `🥰`,
  full: `😋`,
  ok: `😐`,
  meh: `😕`,
};
function StarRating({ n: e }) {
  return (
    <span
      className={`inline-flex`}
      children={[1, 2, 3, 4, 5].map((t) => (
        <IconStar size={10} className={t <= e ? `text-yellow fill-yellow` : `text-text4`} key={t} />
      ))}
    />
  );
}
function History() {
  var e, t, n;
  let r = useNavigate(),
    i = useQueryClient(),
    [a, o] = (0, React.useState)([]),
    [s, c] = (0, React.useState)(0),
    [l, u] = (0, React.useState)(false),
    { data: d } = useQuery({
      queryKey: [`visit-stats`],
      queryFn: () => visitApi.stats(),
    }),
    { data: f } = useQuery({
      queryKey: [`visits`],
      queryFn: () =>
        visitApi.list({
          pageSize: `100`,
        }),
    }),
    p = (f == null ? void 0 : f.items) || [],
    m = useMutation({
      mutationFn: (e) => visitApi.delete(e),
      onSuccess: () => {
        (i.invalidateQueries(), toast.success(`已删除`));
      },
      onError: () => toast.error(`删除失败`),
    });
  function h(e, t) {
    (o(e), c(t), u(true));
  }
  function g(e) {
    m.isPending || (confirm(`确定删除「${e.restaurant_name}」这次打卡吗？`) && m.mutate(e.id));
  }
  return (
    <div
      className={`animate-fadeUp`}
      children={[
        <PageHeader title={`足迹`} subtitle={`我们一起吃过的每一餐`} icon={IconCalendarDays} />,
        <div
          className={`px-5 py-4 max-w-[640px] mx-auto`}
          children={[
            <div
              className={`grid grid-cols-4 gap-2 mb-5`}
              children={[
                <HistoryStat
                  value={(e = d == null ? void 0 : d.distinct_restaurants) == null ? 0 : e}
                  label={`探过店`}
                />,
                <HistoryStat
                  value={(t = d == null ? void 0 : d.total_visits) == null ? 0 : t}
                  label={`次约饭`}
                />,
                <HistoryStat
                  value={d != null && d.total_cost ? `¥${d.total_cost}` : `¥0`}
                  label={`总花费`}
                />,
                <HistoryStat
                  value={(n = d == null ? void 0 : d.wish_count) == null ? 0 : n}
                  label={`想去`}
                />,
              ]}
            />,
            <SectionHeader title={`📅 时间线`} />,
            p.length === 0 ? (
              <div
                className={`text-center py-14`}
                children={[
                  <span className={`text-[56px] block mb-4 animate-float`} children={`📅`} />,
                  <div className={`text-base font-semibold mb-1.5`} children={`还没有打卡记录`} />,
                  <div className={`text-[13px] text-text2`} children={`去首页记录第一次约饭吧~`} />,
                ]}
              />
            ) : (
              <div
                className={`relative`}
                children={[
                  <div className={`absolute left-[18px] top-2 bottom-2 w-[2px] bg-border`} />,
                  <div
                    className={`flex flex-col gap-3`}
                    children={p.map((e) => (
                      <div
                        className={`relative pl-11`}
                        children={[
                          <div
                            className={`absolute left-3 top-3 w-3 h-3 rounded-full bg-primary ring-4 ring-primary-light z-10`}
                          />,
                          <SwipeDeleteRow
                            actionWidth={72}
                            onDelete={() => g(e)}
                            className={`rounded-2xl border border-border ${CARD_SHADOW}`}
                            children={
                              <VisitCard
                                v={e}
                                onOpen={h}
                                onRestaurant={() => r(`/restaurants/${e.restaurant_id}`)}
                                onEdit={() => r(`/check-in?visit=${e.id}`)}
                                onDelete={() => g(e)}
                                deleting={m.isPending}
                              />
                            }
                          />,
                        ]}
                        key={e.id}
                      />
                    ))}
                  />,
                ]}
              />
            ),
          ]}
        />,
        l &&
          a.length > 0 &&
          (0, ReactDOMCore.createPortal)(
            <PhotoViewer photos={a} idx={s} setIdx={c} onClose={() => u(false)} />,
            document.body,
          ),
      ]}
    />
  );
}
function HistoryStat({ value: e, label: t }) {
  return (
    <div
      className={`text-center bg-card rounded-xl py-2.5 border border-border`}
      children={[
        <div className={`text-[16px] font-extrabold text-primary leading-tight`} children={e} />,
        <div className={`text-[10px] text-text3 mt-0.5`} children={t} />,
      ]}
    />
  );
}
function VisitCard({ v: e, onOpen: t, onRestaurant: n, onEdit: r, onDelete: i, deleting: a }) {
  var o, s;
  return (
    <div
      className={`bg-card p-3.5 w-full text-left`}
      children={[
        <div
          className={`flex items-center justify-between mb-1.5 gap-2`}
          children={[
            <button
              onClick={n}
              className={`text-[15px] font-bold truncate active:text-primary`}
              children={e.restaurant_name}
            />,
            <div
              className={`flex flex-shrink-0 items-center gap-1.5`}
              children={[
                <span className={`text-[11px] text-text3`} children={e.visit_date} />,
                <button
                  onClick={(e) => {
                    (e.stopPropagation(), r());
                  }}
                  className={`flex h-7 w-7 items-center justify-center rounded-full bg-bg text-text3 transition-all active:scale-90 active:text-primary`}
                  aria-label={`编辑打卡`}
                  title={`编辑打卡`}
                  children={<IconPencil size={13} />}
                />,
                <button
                  onClick={(e) => {
                    (e.stopPropagation(), i());
                  }}
                  disabled={a}
                  className={`flex h-7 w-7 items-center justify-center rounded-full bg-red-light text-red transition-all active:scale-90 disabled:opacity-50`}
                  aria-label={`删除打卡`}
                  title={`删除打卡`}
                  children={<IconTrash2 size={13} />}
                />,
              ]}
            />,
          ]}
        />,
        <div
          className={`flex items-center gap-2.5 text-[11px] text-text2 mb-2`}
          children={[
            e.cost > 0 && <span children={[`¥`, e.cost]} />,
            e.my_mood && <span children={[`我`, MOOD_EMOJIS[e.my_mood]]} />,
            e.her_mood && <span children={[`她`, MOOD_EMOJIS[e.her_mood]]} />,
          ]}
        />,
        ((o = e.items) == null ? void 0 : o.length) > 0 && (
          <div
            className={`space-y-1 mb-2`}
            children={e.items.map((e) => (
              <div
                className={`flex items-center justify-between text-[12px] gap-2`}
                children={[
                  <span className={`truncate text-text`} children={e.dish_name} />,
                  <span
                    className={`flex items-center gap-2 flex-shrink-0 text-text3`}
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
        ((s = e.photos) == null ? void 0 : s.length) > 0 && (
          <div
            className={`flex gap-1.5 overflow-x-auto scrollbar-none`}
            children={e.photos.map((n, r) => (
              <div
                onClick={(n) => {
                  (n.stopPropagation(), t(e.photos, r));
                }}
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
function More() {
  var e, t;
  let n = useNavigate(),
    r = useAuthStore((e) => e.isLoggedIn),
    { data: i } = useQuery({
      queryKey: [`visit-stats`],
      queryFn: () => visitApi.stats(),
    }),
    { data: a } = useQuery({
      queryKey: [`achievements`],
      queryFn: () => achievementApi.list(),
    }),
    o = Array.isArray(a) ? a : [],
    s = o.filter((e) => e.is_unlocked).length;
  return (
    <div
      className={`animate-fadeUp`}
      children={[
        <PageHeader title={`更多`} subtitle={`我们一起吃过的、想去的和拍下的`} icon={IconMenu} />,
        <div
          className={`px-5 py-4 max-w-[640px] mx-auto`}
          children={[
            <div
              className={`grid grid-cols-3 gap-2.5 mb-5`}
              children={[
                <MoreStat
                  value={(e = i == null ? void 0 : i.distinct_restaurants) == null ? 0 : e}
                  label={`探过店`}
                />,
                <MoreStat
                  value={(t = i == null ? void 0 : i.total_visits) == null ? 0 : t}
                  label={`次约饭`}
                />,
                <MoreStat
                  value={i != null && i.total_cost ? `¥${i.total_cost}` : `¥0`}
                  label={`总花费`}
                />,
              ]}
            />,
            <div
              className={`space-y-2.5`}
              children={[
                <MoreLink
                  icon={IconCamera}
                  title={`照片墙`}
                  subtitle={`按每次打卡整理照片`}
                  tone={`pink`}
                  onClick={() => n(`/photo-wall`)}
                />,
                <MoreLink
                  icon={IconHeart}
                  title={`想去清单`}
                  subtitle={`下次约饭先从这里挑`}
                  tone={`primary`}
                  onClick={() => n(`/restaurants?wish=true`)}
                />,
                <MoreLink
                  icon={IconTrophy}
                  title={`情侣成就`}
                  subtitle={`${s}/${o.length || 0} 已解锁`}
                  tone={`yellow`}
                  onClick={() => n(`/achievements`)}
                />,
                <MoreLink
                  icon={IconUtensilsCrossed}
                  title={`打卡记录`}
                  subtitle={`补录、回看、整理每一餐`}
                  tone={`mint`}
                  onClick={() => n(`/history`)}
                />,
              ]}
            />,
            <div className={`mt-7 mb-3 text-[13px] font-bold text-text2`} children={`管理`} />,
            <div
              className={`bg-card rounded-2xl overflow-hidden border border-border ${CARD_SHADOW}`}
              children={
                <button
                  onClick={() => n(r ? `/admin/dashboard` : `/admin/login`)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all active:bg-bg`}
                  children={[
                    <div
                      className={`w-9 h-9 rounded-xl bg-primary-light text-primary flex items-center justify-center`}
                      children={<IconSettings size={18} />}
                    />,
                    <div
                      className={`flex-1 min-w-0`}
                      children={[
                        <div className={`text-sm font-semibold`} children={`管理后台`} />,
                        <div
                          className={`text-[11px] text-text2`}
                          children={`餐厅、菜单、记录和应用设置`}
                        />,
                      ]}
                    />,
                    <IconChevronRight size={17} className={`text-text3`} />,
                  ]}
                />
              }
            />,
          ]}
        />,
      ]}
    />
  );
}
function MoreStat({ value: e, label: t }) {
  return (
    <div
      className={`bg-card rounded-2xl py-3 text-center border border-border ${CARD_SHADOW}`}
      children={[
        <div className={`text-[17px] font-extrabold text-primary leading-none`} children={e} />,
        <div className={`text-[10px] text-text3 mt-1`} children={t} />,
      ]}
    />
  );
}
var TONE_CLASSES = {
  primary: `bg-primary-light text-primary`,
  pink: `bg-pink-light text-pink`,
  mint: `bg-mint-light text-mint`,
  yellow: `bg-yellow-light text-yellow`,
};
function MoreLink({ icon: e, title: t, subtitle: n, tone: r, onClick: i }) {
  return (
    <button
      onClick={i}
      className={`w-full flex items-center gap-3 px-4 py-3.5 bg-card rounded-2xl border border-border text-left transition-all active:scale-98 ${CARD_SHADOW}`}
      children={[
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${TONE_CLASSES[r]}`}
          children={(0, jsxRuntime.jsx)(e, {
            size: 19,
            strokeWidth: 2.4,
          })}
        />,
        <div
          className={`flex-1 min-w-0`}
          children={[
            <div className={`text-[15px] font-bold`} children={t} />,
            <div className={`text-[11px] text-text2 truncate`} children={n} />,
          ]}
        />,
        <IconChevronRight size={17} className={`text-text3`} />,
      ]}
    />
  );
}
var MAIN_PAGES = [
    {
      path: `/`,
      Component: Home,
      icon: IconHouse,
      label: `首页`,
      exact: true,
    },
    {
      path: `/restaurants`,
      Component: Restaurants,
      icon: IconStore,
      label: `餐厅`,
    },
    {
      path: `/history`,
      Component: History,
      icon: IconCalendarDays,
      label: `回忆`,
    },
    {
      path: `/more`,
      Component: More,
      icon: IconMenu,
      label: `更多`,
    },
  ],
  NAV_ITEMS = [
    MAIN_PAGES[0],
    MAIN_PAGES[1],
    {
      path: `/check-in`,
      icon: IconCirclePlus,
      label: `打卡`,
      action: true,
    },
    MAIN_PAGES[2],
    MAIN_PAGES[3],
  ],
  MAIN_PAGE_COUNT = MAIN_PAGES.length,
  PANEL_WIDTH_PERCENT = 100 / MAIN_PAGE_COUNT,
  SWIPE_THRESHOLD = 36,
  SWIPE_Y_TOLERANCE = 30;
function MainLayout() {
  let e = useLocation(),
    t = useNavigate(),
    [n, r] = (0, React.useState)(() => MAIN_PAGES.findIndex((t) => t.path === e.pathname)),
    i = (0, React.useRef)(null),
    a = (0, React.useRef)(false),
    o = (0, React.useRef)(false),
    s = (0, React.useRef)(0),
    c = (0, React.useRef)({
      activeIdx: n,
    });
  c.current = {
    activeIdx: n,
  };
  let l = (0, React.useRef)(null);
  return (
    (0, React.useEffect)(() => {
      let t = MAIN_PAGES.findIndex((t) => t.path === e.pathname);
      t >= 0 && r(t);
    }, [e.pathname]),
    useGSAP(
      () => {
        let e = i.current;
        if (!e) return;
        let t = a.current ? motionDuration(0.32) : 0;
        ((a.current = true),
          (s.current = 0),
          (o.current = t > 0),
          gsap.to(e, {
            xPercent: -n * PANEL_WIDTH_PERCENT,
            x: 0,
            duration: t,
            ease: `power3.out`,
            force3D: true,
            onComplete: () => {
              o.current = false;
            },
          }));
      },
      {
        dependencies: [n],
        scope: i,
      },
    ),
    (0, React.useEffect)(() => {
      function e(e) {
        let t = c.current;
        if (o.current) return;
        let n = e.touches[0],
          r = n.clientX,
          i = window.innerWidth,
          a = null;
        (r < SWIPE_THRESHOLD ? (a = `left`) : r > i - SWIPE_THRESHOLD && (a = `right`),
          a &&
            ((a === `left` && t.activeIdx === 0) ||
              (a === `right` && t.activeIdx === MAIN_PAGES.length - 1) ||
              (l.current = {
                startX: r,
                startY: n.clientY,
                startEdge: a,
                directionDecided: false,
                isHorizontal: null,
              })));
      }
      function n(e) {
        let t = l.current;
        if (!t) {
          let t = e.touches[0].clientX,
            n = window.innerWidth;
          (t < SWIPE_THRESHOLD || t > n - SWIPE_THRESHOLD) && e.preventDefault();
          return;
        }
        e.preventDefault();
        let n = e.touches[0].clientX - t.startX,
          r = e.touches[0].clientY - t.startY;
        if (!t.directionDecided) {
          if (Math.abs(n) < 8 && Math.abs(r) < 8) return;
          ((t.directionDecided = true), (t.isHorizontal = Math.abs(n) > Math.abs(r)));
        }
        if (!t.isHorizontal) {
          ((l.current = null),
            (s.current = 0),
            gsap.to(i.current, {
              x: 0,
              duration: motionDuration(0.18),
              ease: `power2.out`,
            }));
          return;
        }
        let a = n;
        if (t.startEdge === `left`) {
          if (n < 0) {
            ((l.current = null),
              (s.current = 0),
              gsap.to(i.current, {
                x: 0,
                duration: motionDuration(0.18),
                ease: `power2.out`,
              }));
            return;
          }
        } else if (n > 0) {
          ((l.current = null),
            (s.current = 0),
            gsap.to(i.current, {
              x: 0,
              duration: motionDuration(0.18),
              ease: `power2.out`,
            }));
          return;
        }
        let o = window.innerWidth,
          c = o * 0.35;
        a = Math.max(-c, Math.min(c, a));
        let u = a * (1 - Math.abs(a) / (o * 1.2));
        ((s.current = u),
          gsap.set(i.current, {
            x: u,
            force3D: true,
          }));
      }
      function a() {
        let e = l.current;
        if (!e) return;
        let n = c.current,
          a = s.current;
        (e.startEdge === `left` && a > SWIPE_Y_TOLERANCE && n.activeIdx > 0
          ? ((s.current = 0), r(n.activeIdx - 1), t(MAIN_PAGES[n.activeIdx - 1].path))
          : e.startEdge === `right` && a < -30 && n.activeIdx < MAIN_PAGES.length - 1
            ? ((s.current = 0), r(n.activeIdx + 1), t(MAIN_PAGES[n.activeIdx + 1].path))
            : i.current &&
              ((s.current = 0),
              (o.current = true),
              gsap.to(i.current, {
                xPercent: -n.activeIdx * PANEL_WIDTH_PERCENT,
                x: 0,
                duration: motionDuration(0.25),
                ease: `power3.out`,
                onComplete: () => {
                  o.current = false;
                },
              })),
          (l.current = null));
      }
      return (
        document.addEventListener(`touchstart`, e, {
          passive: true,
        }),
        document.addEventListener(`touchmove`, n, {
          passive: false,
        }),
        document.addEventListener(`touchend`, a, {
          passive: true,
        }),
        () => {
          (document.removeEventListener(`touchstart`, e),
            document.removeEventListener(`touchmove`, n),
            document.removeEventListener(`touchend`, a));
        }
      );
    }, [t]),
    (
      <div
        className={`h-dvh bg-bg overflow-hidden`}
        style={{
          touchAction: `pan-y`,
        }}
        children={[
          <div
            className={`h-full overflow-hidden`}
            children={
              <div
                ref={i}
                className={`flex h-full will-change-transform`}
                style={{
                  width: `${MAIN_PAGE_COUNT * 100}%`,
                }}
                children={MAIN_PAGES.map((e) => (
                  <div
                    className={`h-full overflow-y-auto overscroll-y-contain pb-[calc(60px+env(safe-area-inset-bottom))]`}
                    style={{
                      width: `${PANEL_WIDTH_PERCENT}%`,
                      flexShrink: 0,
                    }}
                    children={<e.Component />}
                    key={e.path}
                  />
                ))}
              />
            }
          />,
          <nav
            className={`fixed bottom-0 left-0 right-0 z-[100] border-t border-white/70 bg-white/92 backdrop-blur-2xl shadow-[0_-10px_30px_rgba(26,26,46,.07)]`}
            style={{
              paddingBottom: `env(safe-area-inset-bottom)`,
            }}
            children={
              <div
                className={`mx-auto grid h-[58px] max-w-[640px] grid-cols-5 items-center px-2`}
                children={NAV_ITEMS.map((e) => {
                  let i = e.icon,
                    a = MAIN_PAGES.findIndex((t) => t.path === e.path),
                    o = a >= 0 && n === a;
                  return (
                    <Link
                      to={e.path}
                      end={e.exact}
                      onClick={(i) => {
                        if ((i.preventDefault(), e.action)) {
                          t(e.path);
                          return;
                        }
                        let o = a;
                        o !== n && (r(o), t(e.path));
                      }}
                      className={() =>
                        `group relative flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[13px] text-[10px] font-semibold transition-all active:scale-95 ${o ? `text-primary` : `text-text3 hover:text-text2`}`
                      }
                      children={() => (
                        <jsxRuntime.Fragment
                          children={[
                            <span
                              className={`flex h-6 w-8 items-center justify-center rounded-full transition-all ${o ? `bg-primary-light text-primary shadow-[inset_0_0_0_1px_rgba(232,115,74,.10)]` : `text-text3 group-hover:bg-bg`}`}
                              children={(0, jsxRuntime.jsx)(i, {
                                size: 18,
                                strokeWidth: o ? 2.6 : 2.1,
                              })}
                            />,
                            <span
                              className={`max-w-full truncate leading-none transition-colors ${o ? `text-primary` : `text-text3`}`}
                              children={e.label}
                            />,
                          ]}
                        />
                      )}
                      key={e.path}
                    />
                  );
                })}
              />
            }
          />,
        ]}
      />
    )
  );
}
var ADMIN_NAV_ITEMS = [
  {
    path: `/admin/dashboard`,
    icon: `📊`,
    label: `概览`,
  },
  {
    path: `/admin/dishes`,
    icon: `🍽`,
    label: `菜单`,
  },
  {
    path: `/admin/records`,
    icon: `📋`,
    label: `打卡`,
  },
  {
    path: `/admin/settings`,
    icon: `⚙`,
    label: `设置`,
  },
];
function AdminLayout() {
  let e = useNavigate(),
    t = useLocation(),
    { isLoggedIn: n, logout: r } = useAuthStore(),
    i = useAppInfoStore((e) => e.appName);
  ((0, React.useEffect)(() => {
    t.pathname !== `/admin/login` &&
      !n &&
      e(`/admin/login`, {
        replace: true,
      });
  }, [n, t.pathname, e]),
    (0, React.useEffect)(() => {
      let t = () => {
        (r(),
          e(`/admin/login`, {
            replace: true,
          }));
      };
      return (
        window.addEventListener(`admin-auth-expired`, t),
        () => window.removeEventListener(`admin-auth-expired`, t)
      );
    }, [r, e]));
  let a = () => {
      (r(), e(`/`));
    },
    o = (e) => t.pathname === e || (e !== `/admin/dashboard` && t.pathname.startsWith(e));
  return (
    <div
      className={`h-dvh bg-bg flex flex-col overflow-hidden`}
      children={[
        t.pathname !== `/admin/login` && (
          <jsxRuntime.Fragment
            children={[
              <header
                className={`sticky top-0 z-10 bg-bg/88 backdrop-blur-xl px-5 py-3 flex items-center gap-3 border-b border-border flex-shrink-0`}
                children={[
                  <button
                    onClick={() => e(`/`)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-lg bg-card shadow-sm`}
                    children={`←`}
                  />,
                  <div className={`flex-1 font-bold text-base`} children={[i, ` 管理`]} />,
                  <button
                    onClick={a}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-lg`}
                    children={`🔓`}
                  />,
                ]}
              />,
              <nav
                className={`bg-bg/88 backdrop-blur-xl border-b border-border flex-shrink-0`}
                children={
                  <div
                    className={`flex px-3 py-2 gap-1 max-w-[640px] mx-auto overflow-x-auto overscroll-x-contain scrollbar-none`}
                    style={{
                      WebkitOverflowScrolling: `touch`,
                    }}
                    children={ADMIN_NAV_ITEMS.map((t) => (
                      <button
                        onClick={() => e(t.path)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${o(t.path) ? `bg-primary text-white` : `text-text2 hover:bg-card`}`}
                        children={[<span children={t.icon} />, <span children={t.label} />]}
                        key={t.path}
                      />
                    ))}
                  />
                }
              />,
            ]}
          />
        ),
        <div className={`flex-1 overflow-y-auto overscroll-y-contain`} children={<Outlet />} />,
      ]}
    />
  );
}
function SubPageLayout() {
  return (
    <div
      className={`h-dvh bg-bg overflow-y-auto overscroll-y-contain`}
      style={{
        touchAction: `pan-y`,
      }}
      children={<Outlet />}
    />
  );
}
var RestaurantDetail = (0, React.lazy)(() => import("./pages/RestaurantDetail.jsx")),
  CheckIn = (0, React.lazy)(() => import("./pages/CheckIn.jsx")),
  PhotoWall = (0, React.lazy)(() => import("./pages/PhotoWall.jsx")),
  Achievements = (0, React.lazy)(() => import("./pages/Achievements.jsx")),
  AdminLogin = (0, React.lazy)(() => import("./pages/admin/Login.jsx")),
  AdminDashboard = (0, React.lazy)(() => import("./pages/admin/Dashboard.jsx")),
  AdminDishes = (0, React.lazy)(() => import("./pages/admin/Dishes.jsx")),
  AdminDishEdit = (0, React.lazy)(() => import("./pages/admin/DishEdit.jsx")),
  AdminSettings = (0, React.lazy)(() => import("./pages/admin/Settings.jsx")),
  AdminRecords = (0, React.lazy)(() => import("./pages/admin/Records.jsx")),
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 3e4,
        retry: 1,
      },
    },
  });
function PageLoading() {
  return (
    <div
      className={`flex min-h-dvh items-center justify-center bg-bg px-6 text-center`}
      children={
        <div
          className={`w-full max-w-[280px] space-y-3`}
          children={[
            <div className={`mx-auto h-12 w-12 rounded-2xl bg-primary-light skeleton`} />,
            <div className={`mx-auto h-4 w-32 rounded-full skeleton`} />,
            <div className={`mx-auto h-3 w-48 rounded-full skeleton`} />,
          ]}
        />
      }
    />
  );
}
function App() {
  let e = useAppInfoStore((e) => e.fetch),
    t = useAppInfoStore((e) => e.appName);
  return (
    (0, React.useEffect)(() => {
      e();
    }, [e]),
    (0, React.useEffect)(() => {
      document.title = t;
    }, [t]),
    (
      <QueryClientProvider
        client={queryClient}
        children={[
          <BrowserRouter
            children={
              <Routes
                children={[
                  <Route
                    element={<AppGate children={<MainLayout />} />}
                    children={[
                      <Route path={`/`} element={null} />,
                      <Route path={`/restaurants`} element={null} />,
                      <Route path={`/history`} element={null} />,
                      <Route path={`/more`} element={null} />,
                    ]}
                  />,
                  <Route
                    element={
                      <AppGate
                        children={
                          <React.Suspense fallback={<PageLoading />} children={<SubPageLayout />} />
                        }
                      />
                    }
                    children={[
                      <Route path={`/restaurants/:id`} element={<RestaurantDetail />} />,
                      <Route path={`/check-in`} element={<CheckIn />} />,
                      <Route path={`/photo-wall`} element={<PhotoWall />} />,
                      <Route path={`/achievements`} element={<Achievements />} />,
                    ]}
                  />,
                  <Route
                    path={`/admin`}
                    element={
                      <React.Suspense fallback={<PageLoading />} children={<AdminLayout />} />
                    }
                    children={[
                      <Route path={`login`} element={<AdminLogin />} />,
                      <Route path={`dashboard`} element={<AdminDashboard />} />,
                      <Route path={`dishes`} element={<AdminDishes />} />,
                      <Route path={`dishes/new`} element={<AdminDishEdit />} />,
                      <Route path={`dishes/:id`} element={<AdminDishEdit />} />,
                      <Route path={`settings`} element={<AdminSettings />} />,
                      <Route path={`records`} element={<AdminRecords />} />,
                    ]}
                  />,
                ]}
              />
            }
          />,
          <Toaster
            position={`top-center`}
            toastOptions={{
              duration: 2e3,
              style: {
                borderRadius: `9999px`,
                background: `#FFFFFF`,
                color: `#1A1A2E`,
                fontSize: `14px`,
                padding: `10px 24px`,
                boxShadow: `0 8px 32px rgba(0,0,0,.1)`,
              },
            }}
          />,
        ]}
      />
    )
  );
}
export {
  PageHeader,
  PhotoViewer,
  photoWallApi,
  visitApi as A,
  useSearchParams as B,
  dashboardApi as C,
  restaurantApi as D,
  recordApi as E,
  useQuery as F,
  interopModule as G,
  initHelpers as H,
  useQueryClient as I,
  getJSXRuntime as L,
  useAppInfoStore as M,
  toast as N,
  settingsApi as O,
  useMutation as P,
  useNavigate as R,
  authApi as S,
  photoWallApi as T,
  getReactDOMCore as U,
  A as V,
  getReact as W,
  IconMapPin as _,
  CARD_SHADOW as a,
  createIcon as b,
  RestaurantImage as c,
  IconX as d,
  IconTrash2 as f,
  IconPencil as g,
  IconPlus as h,
  useAuthStore as i,
  getErrorMessage as j,
  uploadApi as k,
  restaurantEmoji as l,
  IconSearch as m,
  BottomSheet as n,
  SectionHeader as o,
  IconStar as p,
  LocationInput as r,
  PageHeader as s,
  PhotoViewer as t,
  restaurantImageURL as u,
  IconHeart as v,
  dishApi as w,
  achievementApi as x,
  IconCamera as y,
  useParams as z,
  App,
};
