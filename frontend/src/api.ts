const isLocal = window.location.hostname === "localhost";

export const API_BASE = isLocal
  ? ""
  : "https://sleepsync-yiqn.onrender.com";
