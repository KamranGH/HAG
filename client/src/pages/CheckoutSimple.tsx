import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { ChevronDown, ChevronUp, Truck, Shield, ArrowLeft } from "lucide-react";

// Load Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface CartItem {
  id: string;
  artworkId: number;
  type: 'original' | 'print';
  printSize?: string;
  quantity: number;
  unitPrice: number;
}

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  specialInstructions?: string;
}

const customerDataSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  country: z.string().min(1, "Country is required"),
  specialInstructions: z.string().optional(),
});

interface CartItemWithDetails extends CartItem {
  artworkTitle: string;
  artworkImage: string;
  totalPrice: number;
}

const CheckoutForm = ({ 
  clientSecret, 
  customerData, 
  onPaymentSuccess,
  form 
}: {
  clientSecret: string;
  customerData: CustomerData | null;
  onPaymentSuccess: (orderId: number) => void;
  form: any;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || !customerData) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create order first
      const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
      const orderResponse = await apiRequest('POST', '/api/orders', {
        customerData,
        orderItems: cartItems
      });
      const order = await orderResponse.json();

      // Confirm payment
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-confirmation/${order.id}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Clear cart and redirect
        localStorage.removeItem('cart');
        onPaymentSuccess(order.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "There was an error processing your order.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement 
        options={{
          layout: {
            type: 'tabs',
            defaultCollapsed: false,
          }
        }}
      />
      <Button 
        type="submit" 
        disabled={!stripe || !elements || isProcessing || !customerData}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 h-9"
      >
        {isProcessing ? "Processing..." : "Complete Order"}
      </Button>
    </form>
  );
};

export default function CheckoutSimple() {
  const [, setLocation] = useLocation();
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [specialNotesOpen, setSpecialNotesOpen] = useState(false);
  const { toast } = useToast();

  // Get cart items
  const cartItems: CartItem[] = JSON.parse(localStorage.getItem('cart') || '[]');

  // Fetch artwork details for cart items
  const { data: cartItemsWithDetails = [] } = useQuery({
    queryKey: ['/api/cart-details'],
    queryFn: async (): Promise<CartItemWithDetails[]> => {
      const items = await Promise.all(
        cartItems.map(async (item) => {
          const response = await apiRequest('GET', `/api/artworks/${item.artworkId}`);
          const artwork = await response.json();
          return {
            ...item,
            artworkTitle: artwork.title,
            artworkImage: artwork.images?.[0] || '',
            totalPrice: item.unitPrice * item.quantity,
          };
        })
      );
      return items;
    },
    enabled: cartItems.length > 0,
  });

  // Calculate totals
  const subtotal = cartItemsWithDetails.reduce((sum, item) => sum + item.totalPrice, 0);
  const hasOriginals = cartItemsWithDetails.some(item => item.type === 'original');
  const shippingCost = subtotal >= 100 ? 0 : (hasOriginals ? 25 : 15);
  const total = subtotal + shippingCost;

  const form = useForm<CustomerData>({
    resolver: zodResolver(customerDataSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      zipCode: "",
      country: "US",
      specialInstructions: "",
    },
  });

  // Create payment intent when form is first loaded
  const createPaymentIntent = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/create-payment-intent', {
        amount: total,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize payment intent when component loads
  useEffect(() => {
    if (cartItems.length > 0 && total > 0) {
      createPaymentIntent.mutate();
    }
  }, [total]);

  const onSubmit = (data: CustomerData) => {
    setCustomerData(data);
  };

  const handlePaymentSuccess = (orderId: number) => {
    setLocation(`/payment-confirmation/${orderId}`);
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-xl font-bold mb-4">Your cart is empty</h1>
            <Button onClick={() => setLocation('/')} className="bg-amber-600 hover:bg-amber-700">
              Continue Shopping
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />
      
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Checkout</h1>
            <Button
              onClick={() => setLocation('/cart')}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 h-8"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Edit Cart
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {/* Main Content - Shipping & Payment */}
            <div className="lg:col-span-4 space-y-4">
              {/* Shipping Information */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-3">Shipping Information</h2>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">First Name</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-8 text-sm bg-slate-700 border-slate-600" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-8 text-sm bg-slate-700 border-slate-600" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" className="h-8 text-sm bg-slate-700 border-slate-600" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-sm bg-slate-700 border-slate-600" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Street Address</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-sm bg-slate-700 border-slate-600" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">City</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-8 text-sm bg-slate-700 border-slate-600" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">ZIP Code</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-8 text-sm bg-slate-700 border-slate-600" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Country</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-sm bg-slate-700 border-slate-600" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    {/* Special Instructions - Collapsible */}
                    <Collapsible open={specialNotesOpen} onOpenChange={setSpecialNotesOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full justify-between p-2 h-auto text-xs text-gray-400 hover:text-white"
                        >
                          Special delivery instructions (optional)
                          {specialNotesOpen ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <FormField
                          control={form.control}
                          name="specialInstructions"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="Any special instructions for delivery..."
                                  className="text-sm bg-slate-700 border-slate-600 resize-none h-16"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </CollapsibleContent>
                    </Collapsible>

                    <Button 
                      type="submit"
                      className="w-full bg-amber-600 hover:bg-amber-700 h-8 text-sm"
                    >
                      Save & Continue to Payment
                    </Button>
                  </form>
                </Form>
              </div>

              {/* Payment Section */}
              {clientSecret && customerData && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <h2 className="text-lg font-semibold mb-3">Payment</h2>
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm 
                      clientSecret={clientSecret}
                      customerData={customerData}
                      onPaymentSuccess={handlePaymentSuccess}
                      form={form}
                    />
                  </Elements>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-3">
              <div className="bg-slate-800 rounded-lg p-4 sticky top-4">
                <h3 className="text-lg font-semibold mb-3">Order Summary</h3>
                
                {/* Cart Items */}
                <div className="space-y-2 mb-4">
                  {cartItemsWithDetails.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2 p-2 bg-slate-700 rounded text-sm">
                      <img
                        src={item.artworkImage}
                        alt={item.artworkTitle}
                        className="w-8 h-10 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-xs">{item.artworkTitle}</p>
                        <p className="text-xs text-gray-400">
                          {item.type === 'original' ? 'Original' : `Print - ${item.printSize}`}
                        </p>
                        <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-xs font-medium">${item.totalPrice.toFixed(2)} USD</p>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center">
                      <Truck className="w-3 h-3 mr-1" />
                      Shipping
                    </span>
                    <span>
                      {shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)} USD`}
                    </span>
                  </div>
                  <div className="border-t border-slate-600 pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${total.toFixed(2)} USD</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-400">
                  <div className="flex items-center">
                    <Shield className="w-3 h-3 mr-2" />
                    <span>Secure payment with Stripe</span>
                  </div>
                  <p>Free shipping on orders over $100</p>
                  <p>All prices in USD. International customers may see currency conversion differences from their bank.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}