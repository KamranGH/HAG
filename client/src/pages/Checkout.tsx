import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMutation } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface CartItem {
  id: string;
  artworkId: number;
  artworkTitle: string;
  artworkImage: string;
  type: 'original' | 'print';
  printSize?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
}

const CheckoutForm = ({ cartItems, customerData, subtotal }: { 
  cartItems: CartItem[]; 
  customerData: CustomerData;
  subtotal: number;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const completeOrderMutation = useMutation({
    mutationFn: async ({ orderId, stripePaymentIntentId }: { orderId: number; stripePaymentIntentId: string }) => {
      return await apiRequest("POST", `/api/orders/${orderId}/complete`, { stripePaymentIntentId });
    },
    onSuccess: (_, { orderId }) => {
      // Clear cart
      localStorage.removeItem('cart');
      setLocation(`/payment-confirmation/${orderId}`);
    },
    onError: (error) => {
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Find order ID from metadata or create order here
      const orderId = 1; // This would come from the order creation response
      completeOrderMutation.mutate({
        orderId,
        stripePaymentIntentId: paymentIntent.id,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || completeOrderMutation.isPending}
        className="w-full bg-primary hover:bg-primary/90 text-white py-4 text-lg font-semibold"
      >
        {completeOrderMutation.isPending ? "Processing..." : `Complete Payment - $${subtotal.toFixed(2)}`}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const [, setLocation] = useLocation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [clientSecret, setClientSecret] = useState("");
  const [customerData, setCustomerData] = useState<CustomerData>({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    city: "",
    zipCode: "",
  });

  useEffect(() => {
    const items: CartItem[] = JSON.parse(localStorage.getItem('cart') || '[]');
    if (items.length === 0) {
      setLocation('/cart');
      return;
    }
    setCartItems(items);

    // Create payment intent
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    apiRequest("POST", "/api/create-payment-intent", { 
      amount: subtotal,
      metadata: {
        cart_items: JSON.stringify(items.map(item => ({
          artworkId: item.artworkId,
          type: item.type,
          printSize: item.printSize,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))),
      }
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        console.error("Error creating payment intent:", error);
      });
  }, [setLocation]);

  const getSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const getImageUrl = (url: string) => {
    return url || `https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=300`;
  };

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-navy-900 text-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-serif font-semibold mb-8">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Billing Information and Payment */}
          <div className="space-y-6">
            <Card className="bg-navy-800 border-navy-700">
              <CardHeader>
                <CardTitle className="text-xl font-serif font-medium text-white">
                  Billing Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="First Name"
                    value={customerData.firstName}
                    onChange={(e) => setCustomerData({...customerData, firstName: e.target.value})}
                    className="bg-navy-700 border-navy-600 text-white placeholder:text-gray-400 focus:border-primary"
                  />
                  <Input
                    placeholder="Last Name"
                    value={customerData.lastName}
                    onChange={(e) => setCustomerData({...customerData, lastName: e.target.value})}
                    className="bg-navy-700 border-navy-600 text-white placeholder:text-gray-400 focus:border-primary"
                  />
                </div>
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                  className="bg-navy-700 border-navy-600 text-white placeholder:text-gray-400 focus:border-primary"
                />
                <Input
                  placeholder="Address"
                  value={customerData.address}
                  onChange={(e) => setCustomerData({...customerData, address: e.target.value})}
                  className="bg-navy-700 border-navy-600 text-white placeholder:text-gray-400 focus:border-primary"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="City"
                    value={customerData.city}
                    onChange={(e) => setCustomerData({...customerData, city: e.target.value})}
                    className="bg-navy-700 border-navy-600 text-white placeholder:text-gray-400 focus:border-primary"
                  />
                  <Input
                    placeholder="ZIP Code"
                    value={customerData.zipCode}
                    onChange={(e) => setCustomerData({...customerData, zipCode: e.target.value})}
                    className="bg-navy-700 border-navy-600 text-white placeholder:text-gray-400 focus:border-primary"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-navy-800 border-navy-700">
              <CardHeader>
                <CardTitle className="text-xl font-serif font-medium text-white">
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Elements 
                  stripe={stripePromise} 
                  options={{ 
                    clientSecret,
                    appearance: {
                      theme: 'night',
                      variables: {
                        colorPrimary: '#d4af37',
                        colorBackground: '#0F172A',
                        colorText: '#ffffff',
                        colorDanger: '#ef4444',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        spacingUnit: '4px',
                        borderRadius: '6px',
                        colorTextSecondary: '#94a3b8',
                        colorTextPlaceholder: '#64748b',
                        colorIconTab: '#94a3b8',
                        colorLogo: 'dark'
                      },
                      rules: {
                        '.Input': {
                          backgroundColor: '#283747',
                          border: '1px solid #3a4d5c',
                          color: '#ffffff'
                        },
                        '.Input:focus': {
                          border: '2px solid #d4af37',
                          boxShadow: '0 0 0 1px #d4af37'
                        },
                        '.Label': {
                          color: '#ffffff',
                          fontWeight: '500'
                        },
                        '.Tab': {
                          backgroundColor: '#283747',
                          border: '1px solid #3a4d5c',
                          color: '#ffffff'
                        },
                        '.Tab:hover': {
                          backgroundColor: '#3a4d5c'
                        },
                        '.Tab--selected': {
                          backgroundColor: '#d4af37',
                          color: '#1e2832'
                        }
                      }
                    }
                  }}
                >
                  <CheckoutForm 
                    cartItems={cartItems} 
                    customerData={customerData}
                    subtotal={getSubtotal()}
                  />
                </Elements>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="bg-navy-800 border-navy-700 sticky top-24">
              <CardHeader>
                <CardTitle className="text-xl font-serif font-medium text-white">
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-20 bg-navy-700 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={getImageUrl(item.artworkImage)}
                          alt={item.artworkTitle}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white text-sm">{item.artworkTitle}</h4>
                        <p className="text-gray-300 text-xs">
                          {item.type === 'original' ? 'Original' : `Print - ${item.printSize}`}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-gray-300 text-xs">Qty: {item.quantity}</p>
                        )}
                        <p className="text-white font-semibold text-sm">${item.totalPrice.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-navy-700 pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Subtotal:</span>
                    <span className="text-white">${getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Shipping:</span>
                    <span className="text-white">$15.00</span>
                  </div>
                  <div className="flex justify-between text-xl font-semibold border-t border-navy-700 pt-2">
                    <span className="text-white">Total:</span>
                    <span className="text-white">${(getSubtotal() + 15).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
