// Recovered from deployed build. Original local names/types/comments are unavailable.
import { React } from "../../vendor/runtime.js";
import {
  G as interopModule,
  L as getJSXRuntime,
  M as useAppInfoStore,
  N as toast,
  P as useMutation,
  R as useNavigate,
  S as authApi,
  W as getReact,
  i as useAuthStore,
} from "../../application.jsx";
var jsxRuntime = getJSXRuntime();
function Login() {
  let e = useNavigate(),
    { isLoggedIn: t, login: s } = useAuthStore(),
    d = useAppInfoStore((e) => e.appName),
    [f, p] = (0, React.useState)(``);
  (0, React.useEffect)(() => {
    t &&
      e(`/admin/dashboard`, {
        replace: true,
      });
  }, [t, e]);
  let m = useMutation({
    mutationFn: () => authApi.login(f),
    onSuccess: (t) => {
      (s(t.token), toast.success(`✅ 登录成功`), e(`/admin/dashboard`));
    },
    onError: () => toast.error(`密码错误`),
  });
  return (
    <div
      className={`min-h-screen bg-bg flex items-center justify-center px-5`}
      children={
        <div
          className={`w-full max-w-[360px]`}
          children={[
            <h3
              className={`text-xl font-bold mb-1 text-center`}
              children={[`🔒 `, d, ` 管理模式`]}
            />,
            <p
              className={`text-[13px] text-text2 text-center mb-5`}
              children={`输入管理密码进入餐厅打卡管理`}
            />,
            <div
              className={`mb-4`}
              children={[
                <label
                  className={`block text-[13px] font-semibold mb-1.5 text-text2`}
                  children={`管理密码`}
                />,
                <input
                  type={`password`}
                  placeholder={`请输入密码`}
                  value={f}
                  onChange={(e) => p(e.target.value)}
                  onKeyDown={(e) => e.key === `Enter` && m.mutate()}
                  className={`w-full py-2.5 px-3.5 rounded-[10px] border-[1.5px] border-border bg-bg text-sm transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(232,115,74,.1)] outline-none`}
                />,
              ]}
            />,
            <button
              onClick={() => m.mutate()}
              disabled={m.isPending}
              className={`w-full py-2.5 px-5 rounded-full text-sm font-semibold bg-primary text-white transition-all active:scale-96 hover:bg-primary-dark disabled:opacity-50`}
              children={`进入管理`}
            />,
            <button
              onClick={() => e(`/`)}
              className={`w-full py-2.5 px-5 rounded-full text-sm font-medium text-text2 mt-2`}
              children={`取消`}
            />,
          ]}
        />
      }
    />
  );
}
export { Login as default };
