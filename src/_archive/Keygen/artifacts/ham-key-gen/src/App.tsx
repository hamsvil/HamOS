import React from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import NotFound from "./pages/not-found";

import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import KeysList from "./pages/keys/index";
import KeyGenerate from "./pages/keys/generate";
import KeyDetail from "./pages/keys/[id]";
import Validate from "./pages/validate";
import Providers from "./pages/providers";
import Environments from "./pages/environments";
import AuditLog from "./pages/audit";
import Notifications from "./pages/notifications";
import ScheduledJobs from "./pages/scheduled";
import Export from "./pages/export";
import Search from "./pages/search";
import Webhooks from "./pages/webhooks";
import Settings from "./pages/settings";
import SystemPage from "./pages/system";
import ChatPage from "./pages/chat";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/keys" component={KeysList} />
      <Route path="/keys/generate" component={KeyGenerate} />
      <Route path="/keys/:id" component={KeyDetail} />
      <Route path="/validate" component={Validate} />
      <Route path="/providers" component={Providers} />
      <Route path="/environments" component={Environments} />
      <Route path="/audit" component={AuditLog} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/scheduled" component={ScheduledJobs} />
      <Route path="/export" component={Export} />
      <Route path="/search" component={Search} />
      <Route path="/webhooks" component={Webhooks} />
      <Route path="/settings" component={Settings} />
      <Route path="/system" component={SystemPage} />
      <Route path="/chat" component={ChatPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
