import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, RouteObject } from "react-router-dom";
import "./index.css";
import { App, ErrorBoundary } from "./App";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";

// Admin route only available in development
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: "gestion-evenement",
        lazy: () => import("./pages/Admin").then((m) => ({ Component: m.Admin })),
      },
    ]
  : [];

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      ...devRoutes,
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
