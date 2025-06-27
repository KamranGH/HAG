import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Gallery from "@/pages/Gallery";
import ArtworkDetail from "@/pages/ArtworkDetail";
import Cart from "@/pages/Cart";
import Contact from "@/pages/Contact";
import Checkout from "@/pages/Checkout";
import CheckoutSimple from "@/pages/CheckoutSimple";
import PaymentConfirmation from "@/pages/PaymentConfirmation";
import InteracPayment from "@/pages/InteracPayment";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Gallery} />
      <Route path="/artwork/:id" component={ArtworkDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/contact" component={Contact} />
      <Route path="/checkout" component={CheckoutSimple} />
      <Route path="/payment-confirmation/:orderId" component={PaymentConfirmation} />
      <Route path="/interac-payment/:orderId" component={InteracPayment} />
      <Route path="/landing" component={Landing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark min-h-screen bg-navy-900">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
