// Recovered from deployed build. Original local names/types/comments are unavailable.
import { React } from "../../vendor/runtime.js";
import {
  F as useQuery,
  G as interopModule,
  I as useQueryClient,
  L as getJSXRuntime,
  M as useAppInfoStore,
  N as toast,
  O as settingsApi,
  P as useMutation,
  W as getReact,
} from "../../application.jsx";
import "../../components/upload.jsx";
import { n as settingString } from "../../components/utils.jsx";
var jsxRuntime = getJSXRuntime();
function SettingsRow({ label: e, children: t }) {
  return (
    <div
      className={`flex items-center justify-between py-3 border-b border-border/60 last:border-b-0`}
      children={[
        <div className={`text-sm font-medium text-text`} children={e} />,
        <div className={`flex items-center gap-3`} children={t} />,
      ]}
    />
  );
}
function Settings() {
  let t = useQueryClient(),
    { data: r, isLoading: c } = useQuery({
      queryKey: [`settings`],
      queryFn: () => settingsApi.get(),
    }),
    [p, m] = (0, React.useState)(null),
    h = useAppInfoStore((e) => e.appName),
    g = useAppInfoStore((e) => e.setAppName),
    _ = useMutation({
      mutationFn: (e) => settingsApi.update(e),
      onSuccess: (e, n) => {
        (t.invalidateQueries({
          queryKey: [`settings`],
        }),
          n.app_name !== void 0 && g(n.app_name || `今天吃什么`),
          toast.success(`已保存`));
      },
    });
  if (c) return <div className={`p-8 text-center text-text2`} children={`加载中...`} />;
  let v = p === null ? settingString(r == null ? void 0 : r.app_name, h) : p;
  return (
    <div
      className={`px-5 py-4 max-w-[640px] mx-auto pb-20 space-y-4`}
      children={[
        <div
          className={`rounded-2xl border border-border bg-card p-4`}
          children={[
            <div className={`text-[13px] font-semibold text-text2 mb-1`} children={`应用设置`} />,
            <div
              className={`text-[11px] text-text3 mb-2`}
              children={`只保留餐厅打卡需要的基础配置`}
            />,
            <SettingsRow
              label={`应用名称`}
              children={
                <div
                  className={`flex items-center gap-2`}
                  children={[
                    <input
                      type={`text`}
                      value={v}
                      onChange={(e) => m(e.target.value)}
                      placeholder={`今天吃什么`}
                      className={`w-36 py-2 px-3 rounded-[10px] border-[1.5px] border-border bg-bg text-sm outline-none transition-all focus:border-primary text-right`}
                    />,
                    <button
                      onClick={() =>
                        _.mutate({
                          app_name: v || `今天吃什么`,
                        })
                      }
                      disabled={_.isPending}
                      className={`px-3 py-2 rounded-full text-xs font-semibold bg-primary text-white disabled:opacity-60`}
                      children={`保存`}
                    />,
                  ]}
                />
              }
            />,
          ]}
        />,
        <div
          className={`rounded-2xl border border-border bg-card p-4`}
          children={[
            <div className={`text-[13px] font-semibold text-text2 mb-1`} children={`照片上传`} />,
            <div
              className={`text-xs text-text3 leading-relaxed`}
              children={[
                `单张照片上限 `,
                20,
                `MB，上传后自动压缩为适合页面展示的 JPG。压缩边长和图片质量由环境变量控制。`,
              ]}
            />,
          ]}
        />,
        <div
          className={`rounded-2xl border border-border bg-card p-4`}
          children={[
            <div className={`text-[13px] font-semibold text-text2 mb-1`} children={`密码来源`} />,
            <div
              className={`text-xs text-text3 leading-relaxed`}
              children={`应用密码由 APP_PASSWORD 控制，管理密码由 ADMIN_PASSWORD 控制。修改环境变量后重启服务生效。`}
            />,
          ]}
        />,
      ]}
    />
  );
}
export { Settings as default };
