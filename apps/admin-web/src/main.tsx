import { createRoot } from "react-dom/client";
import { Console } from "./Console.js";
import "./styles.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<Console />);
}
