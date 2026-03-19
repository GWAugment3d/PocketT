import express from "express";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  console.log(`Starting server in ${process.env.NODE_ENV} mode on port ${PORT}`);

  app.use(express.json({ limit: '50mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV, port: PORT });
  });

  app.get("/config.js", (req, res) => {
    res.type("application/javascript");
    res.send(`window.ENV = ${JSON.stringify({
      GEMINI_API_KEY: process.env.GEMINI_API_KEY
    })};`);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite not found, skipping middleware (this is normal in production if NODE_ENV is not set)");
      // In production, server.cjs is in the dist folder.
      // In development (fallback), it's in the root.
      let distPath = __dirname;
      if (!fs.existsSync(path.join(distPath, "index.html"))) {
        distPath = path.join(process.cwd(), "dist");
      }
      
      const indexPath = path.join(distPath, "index.html");
      app.use(express.static(distPath));
      app.get("*all", (req, res) => {
        res.sendFile(indexPath);
      });
    }
  } else {
    // In production, server.cjs is in the dist folder.
    // In development (fallback), it's in the root.
    let distPath = __dirname;
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      distPath = path.join(process.cwd(), "dist");
    }
    
    const indexPath = path.join(distPath, "index.html");
    console.log(`Serving static files from ${distPath}`);
    if (!fs.existsSync(indexPath)) {
      console.error(`Warning: index.html not found at ${indexPath}`);
    }
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

