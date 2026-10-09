# Third-party components

TodaEat's own source is distributed under the MIT license in [LICENSE](LICENSE). Third-party components retain their own licenses and copyright notices; the project license does not replace them.

- Frontend dependencies are recorded in `frontend/package.json` and `frontend/package-lock.json`: React, React Router, TanStack Query, Zustand, Axios, GSAP, Lucide, react-hot-toast, Vite, and their dependencies.
- Backend dependencies are recorded in `backend/go.mod` and `backend/go.sum`: Gin, GORM, SQLite drivers, jwt/v5, image processing packages, and their dependencies.
- `frontend/src/index.css` contains generated Tailwind CSS with its existing MIT notice. Preserve that notice.
- `frontend/src/vendor/runtime.js` is a compatibility export layer using installed npm packages, rather than a replacement license for those packages.

When redistributing builds, review and preserve the dependency licenses included with the installed packages and Go modules. Dependency versions and licensing terms may change; no claim is made that every dependency uses MIT.
