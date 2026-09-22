import { AuthProvider, useAuth } from "./app/providers/AuthProvider";
import { QueryClientProvider } from "./app/providers/QueryClientProvider";
import { OrgContextProvider } from "./app/providers/OrgContextProvider";
import { AuthScreen } from "./features/auth/components/AuthScreen";
import { WorkspaceLayout } from "./app/layouts/WorkspaceLayout";
import { lazy, Suspense } from "react";
import { HashRouter } from "react-router-dom";

const DemoApp = lazy(() => import("./demo/App"));

function Application() {
  const { session, loading, recovery } = useAuth();
  if (loading)
    return (
      <div className="loading-screen" role="status">
        Opening your learning space…
      </div>
    );
  if (!session || recovery) return <AuthScreen />;
  return (
    <OrgContextProvider>
      <WorkspaceLayout />
    </OrgContextProvider>
  );
}

export default function App() {
  if (new URLSearchParams(location.search).get("demo") === "1")
    return (
      <Suspense
        fallback={<div className="loading-screen">Loading preview…</div>}
      >
        <DemoApp />
      </Suspense>
    );
  return (
    <QueryClientProvider>
      <AuthProvider>
        <HashRouter>
          <Application />
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

