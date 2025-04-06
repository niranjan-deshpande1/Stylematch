import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { fixDialogFocusIssues } from "./lib/dialogFix";

// Apply global dialog/focus fixes before the app renders
fixDialogFocusIssues();

createRoot(document.getElementById("root")!).render(<App />);
