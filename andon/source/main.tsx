/** Mount the standalone React manager simulation on its public experiment page. */
import {createRoot} from "react-dom/client";
import Page from "./page";
const root=document.getElementById("root");
if(!root)throw new Error("Andon mount point missing");
createRoot(root).render(<Page/>);
