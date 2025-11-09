import express from "express";
import { SharingDebugger } from "./models/sharing-debugger-model.js";

const app = express();
const PORT = 3000;

app.set("view engine", "ejs");
app.set("views", "./views");
app.use( express.static( "public" ) );

// Example route
app.get("/", async (req, res) => {
  const url = req.query.q;
  const data = await new SharingDebugger().debug(url);
  res.render("index", { url, data });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
