import { React, ReactDOM } from './vendor/runtime.js';
import { App } from './application.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null, React.createElement(App)),
);
