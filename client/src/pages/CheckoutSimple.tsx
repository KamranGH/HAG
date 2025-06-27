import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMutation, useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Artwork } from "@shared/schema";
import { CheckCircle } from "lucide-react";

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
}

// Step Progress Component
const StepProgress = ({ currentStep }: { currentStep: number }) => (
  <div className="mb-8">
    <div className="flex items-center justify-center space-x-8">
      <div className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          currentStep >= 1 ? 'bg-white text-black' : 'bg-gray-600 text-gray-300'
        }`}>
          {currentStep > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
        </div>
        <span className={`ml-2 text-sm ${currentStep >= 1 ? 'text-white' : 'text-gray-400'}`}>
          Cart
        </span>
      </div>
      <div className={`h-px flex-1 ${currentStep >= 2 ? 'bg-white' : 'bg-gray-600'}`} />
      <div className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          currentStep >= 2 ? 'bg-white text-black' : 'bg-gray-600 text-gray-300'
        }`}>
          {currentStep > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
        </div>
        <span className={`ml-2 text-sm ${currentStep >= 2 ? 'text-white' : 'text-gray-400'}`}>
          Details
        </span>
      </div>
      <div className={`h-px flex-1 ${currentStep >= 3 ? 'bg-white' : 'bg-gray-600'}`} />
      <div className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          currentStep >= 3 ? 'bg-white text-black' : 'bg-gray-600 text-gray-300'
        }`}>
          3
        </div>
        <span className={`ml-2 text-sm ${currentStep >= 3 ? 'text-white' : 'text-gray-400'}`}>
          Payment
        </span>
      </div>
    </div>
  </div>
);

// Interac Payment Form
const InteracPaymentForm = ({ cartItems, customerData, total, customInstructions }: {
  cartItems: CartItem[];
  customerData: CustomerData;
  total: number;
  customInstructions: string;
}) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const createOrderMutation = useMutation({
    mutationFn: async ({ cartItems, customerData, totalAmount, subtotalAmount, shippingAmount }: {
      cartItems: CartItem[];
      customerData: CustomerData;
      totalAmount: number;
      subtotalAmount: number;
      shippingAmount: number;
    }) => {
      // Create customer
      const customerResponse = await apiRequest("POST", "/api/customers", {
        email: customerData.email,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        address: customerData.address,
        city: customerData.city,
        zipCode: customerData.zipCode,
      });
      const customer = await customerResponse.json();

      // Create order
      const orderResponse = await apiRequest("POST", "/api/orders", {
        customerId: customer.id,
        subtotalAmount,
        shippingAmount,
        totalAmount,
        status: "pending",
        paymentMethod: "interac",
      });
      const order = await orderResponse.json();

      // Add order items
      for (const item of cartItems) {
        await apiRequest("POST", "/api/order-items", {
          orderId: order.id,
          artworkId: item.artworkId,
          type: item.type,
          printSize: item.printSize,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      }

      return order;
    },
  });

  const handleInteracPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const subtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const hasOriginals = cartItems.some(item => item.type === 'original');
      const shippingCost = subtotal >= 100 ? 0 : (hasOriginals ? 25 : 15);
      
      const order = await createOrderMutation.mutateAsync({
        cartItems,
        customerData,
        totalAmount: total,
        subtotalAmount: subtotal,
        shippingAmount: shippingCost,
      });

      const interacResponse = await apiRequest("POST", "/api/interac/create-payment", {
        orderId: order.id,
        amount: total,
        customerEmail: customerData.email,
        customerName: `${customerData.firstName} ${customerData.lastName}`,
        memo: `Art Gallery Order #${order.id}`,
      });

      localStorage.removeItem('cart');
      setLocation(`/interac-payment/${order.id}`);

    } catch (error: any) {
      toast({
        title: "Payment Setup Failed",
        description: error.message || "There was an error setting up your Interac payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-600 text-white p-4 rounded-lg">
        <h3 className="font-medium mb-2">Interac e-Transfer</h3>
        <p className="text-sm">Secure payment directly from your Canadian bank account</p>
      </div>
      <Button 
        onClick={handleInteracPayment}
        disabled={isProcessing || createOrderMutation.isPending}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold"
      >
        {isProcessing ? "Setting up..." : `Pay with Interac e-Transfer`}
      </Button>
    </div>
  );
};

// Stripe Payment Form
const StripePaymentForm = ({ cartItems, customerData, total, clientSecret }: {
  cartItems: CartItem[];
  customerData: CustomerData;
  total: number;
  clientSecret: string;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const createOrderMutation = useMutation({
    mutationFn: async ({ cartItems, customerData, totalAmount, subtotalAmount, shippingAmount }: {
      cartItems: CartItem[];
      customerData: CustomerData;
      totalAmount: number;
      subtotalAmount: number;
      shippingAmount: number;
    }) => {
      const customerResponse = await apiRequest("POST", "/api/customers", {
        email: customerData.email,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        address: customerData.address,
        city: customerData.city,
        zipCode: customerData.zipCode,
      });
      const customer = await customerResponse.json();

      const orderResponse = await apiRequest("POST", "/api/orders", {
        customerId: customer.id,
        subtotalAmount,
        shippingAmount,
        totalAmount,
        status: "pending",
        paymentMethod: "stripe",
      });
      const order = await orderResponse.json();

      for (const item of cartItems) {
        await apiRequest("POST", "/api/order-items", {
          orderId: order.id,
          artworkId: item.artworkId,
          type: item.type,
          printSize: item.printSize,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      }

      return order;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
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
        const subtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        const hasOriginals = cartItems.some(item => item.type === 'original');
        const shippingCost = subtotal >= 100 ? 0 : (hasOriginals ? 25 : 15);
        
        const order = await createOrderMutation.mutateAsync({
          cartItems,
          customerData,
          totalAmount: total,
          subtotalAmount: subtotal,
          shippingAmount: shippingCost,
        });

        localStorage.removeItem('cart');
        setLocation(`/payment-confirmation/${order.id}`);
      }
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || !elements || isProcessing || createOrderMutation.isPending}
        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black py-4 text-lg font-semibold"
      >
        {isProcessing ? "Processing..." : `Complete Payment - $${total.toFixed(2)} ${customerData.country === 'Canada' ? 'CAD' : 'USD'}`}
      </Button>
    </form>
  );
};

export default function CheckoutSimple() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [clientSecret, setClientSecret] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'interac'>('stripe');
  const [customerData, setCustomerData] = useState<CustomerData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    country: ''
  });
  const [customInstructions, setCustomInstructions] = useState('');

  const { data: artworks = [] } = useQuery<Artwork[]>({
    queryKey: ['/api/artworks'],
  });

  useEffect(() => {
    const items: CartItem[] = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(items);

    if (items.length === 0) {
      setLocation('/cart');
    }
  }, [setLocation]);

  // Auto-select payment method based on country
  useEffect(() => {
    if (customerData.country === 'Canada') {
      setPaymentMethod('interac');
    } else if (customerData.country && customerData.country !== 'Canada') {
      setPaymentMethod('stripe');
    }
  }, [customerData.country]);

  // Create payment intent for Stripe
  useEffect(() => {
    if (cartItems.length > 0 && paymentMethod === 'stripe') {
      const subtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const hasOriginals = cartItems.some(item => item.type === 'original');
      const shippingCost = subtotal >= 100 ? 0 : (hasOriginals ? 25 : 15);
      const total = subtotal + shippingCost;

      apiRequest("POST", "/api/create-payment-intent", {
        amount: total,
        currency: customerData.country === 'Canada' ? 'cad' : 'usd',
        shipping: customerData,
      })
        .then(res => res.json())
        .then(data => setClientSecret(data.clientSecret))
        .catch(error => {
          console.error('Error creating payment intent:', error);
          toast({
            title: "Error",
            description: "Failed to initialize payment",
            variant: "destructive",
          });
        });
    }
  }, [cartItems, paymentMethod, customerData, toast]);

  const getCartItemsWithDetails = () => {
    return cartItems.map(item => {
      const artwork = artworks.find(a => a.id === item.artworkId);
      return {
        ...item,
        artworkTitle: artwork?.title || 'Unknown Artwork',
        artworkImage: artwork?.images?.[0] || '',
        totalPrice: item.unitPrice * item.quantity
      };
    });
  };

  const getTotal = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const hasOriginals = cartItems.some(item => item.type === 'original');
    const shippingCost = subtotal >= 100 ? 0 : (hasOriginals ? 25 : 15);
    return subtotal + shippingCost;
  };

  const getSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const getShippingCost = () => {
    const subtotal = getSubtotal();
    const hasOriginals = cartItems.some(item => item.type === 'original');
    return subtotal >= 100 ? 0 : (hasOriginals ? 25 : 15);
  };

  const canProceedToPayment = () => {
    return customerData.firstName && customerData.lastName && customerData.email && 
           customerData.phone && customerData.address && customerData.city && 
           customerData.zipCode && customerData.country;
  };

  const cartItemsWithDetails = getCartItemsWithDetails();

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-serif text-white text-center mb-8">Checkout</h1>
        
        <StepProgress currentStep={2} />
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Information and Shipping */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-white">Contact information</h2>
                  <Button variant="link" className="text-blue-400 p-0">Edit</Button>
                </div>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-white">Shipping address</h2>
                  <Button variant="link" className="text-blue-400 p-0">Edit</Button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="First name"
                      value={customerData.firstName}
                      onChange={(e) => setCustomerData({ ...customerData, firstName: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                    <Input
                      placeholder="Last name"
                      value={customerData.lastName}
                      onChange={(e) => setCustomerData({ ...customerData, lastName: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  <Input
                    placeholder="Address"
                    value={customerData.address}
                    onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      placeholder="City"
                      value={customerData.city}
                      onChange={(e) => setCustomerData({ ...customerData, city: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                    <Input
                      placeholder="ZIP code"
                      value={customerData.zipCode}
                      onChange={(e) => setCustomerData({ ...customerData, zipCode: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                    <select
                      value={customerData.country}
                      onChange={(e) => setCustomerData({ ...customerData, country: e.target.value })}
                      className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                    >
                      <option value="">Select Country</option>
                      <option value="Canada">Canada</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <Input
                    placeholder="Phone number"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Custom Instructions */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <h2 className="text-lg font-medium text-white mb-4">Need to leave a note or instructions?</h2>
                <textarea
                  placeholder="Special delivery instructions, gift message, etc."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-400 min-h-[100px] rounded px-3 py-2"
                />
              </CardContent>
            </Card>

            {/* Payment Information */}
            {canProceedToPayment() && (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <h2 className="text-lg font-medium text-white mb-4">Payment information</h2>
                  {paymentMethod === 'interac' ? (
                    <InteracPaymentForm
                      cartItems={cartItems}
                      customerData={customerData}
                      total={getTotal()}
                      customInstructions={customInstructions}
                    />
                  ) : clientSecret ? (
                    <Elements 
                      stripe={stripePromise} 
                      options={{ 
                        clientSecret,
                        appearance: {
                          theme: 'night',
                          variables: {
                            colorPrimary: '#d4af37',
                            colorBackground: '#374151',
                            colorText: '#ffffff',
                            colorDanger: '#ef4444',
                          }
                        }
                      }}
                    >
                      <StripePaymentForm
                        cartItems={cartItems}
                        customerData={customerData}
                        total={getTotal()}
                        clientSecret={clientSecret}
                      />
                    </Elements>
                  ) : (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                      <p className="text-gray-400 mt-2">Setting up payment...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700 sticky top-8">
              <CardContent className="p-6">
                <h2 className="text-lg font-medium text-white mb-4">Order summary</h2>
                
                <div className="space-y-4 mb-6">
                  {cartItemsWithDetails.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <div className="relative">
                        <img
                          src={item.artworkImage}
                          alt={item.artworkTitle}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <span className="absolute -top-2 -right-2 bg-gray-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white text-sm font-medium">{item.artworkTitle}</h3>
                        <p className="text-gray-400 text-xs">
                          {item.type === 'original' ? 'Original' : `Print - ${item.printSize}`}
                        </p>
                      </div>
                      <span className="text-white font-medium">
                        ${item.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-600 pt-4 space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal</span>
                    <span>${getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Shipping</span>
                    <span>${getShippingCost().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Tax</span>
                    <span>$0.00</span>
                  </div>
                  <div className="border-t border-gray-600 pt-2">
                    <div className="flex justify-between text-white font-semibold text-lg">
                      <span>Total</span>
                      <span>${getTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}