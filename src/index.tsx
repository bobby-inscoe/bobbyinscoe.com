import React from 'react';
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element was not found");
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  root
);
