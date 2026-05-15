import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { App, ErrorBoundary } from "./App";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { AdminLogin } from "./pages/AdminLogin";
import { AdminGuard } from "./components/AdminGuard";

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
      {
        path: "admin-login",
        element: <AdminLogin />,
      },
      {
        path: "gestion-evenement",
        lazy: async () => {
          const { Admin } = await import("./pages/Admin");
          return {
            element: (
              <AdminGuard>
                <Admin />
              </AdminGuard>
            ),
          };
        },
      },
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
