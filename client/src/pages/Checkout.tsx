import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMutation, useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Artwork } from "@shared/schema";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Optimized cart item structure
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
  address: string;
  city: string;
  zipCode: string;
  country: string;
}

// Interac e-Transfer payment form component
const InteracPaymentForm = ({ cartItems, customerData, total }: {
  cartItems: CartItem[];
  customerData: CustomerData;
  total: number;
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
      // First create the customer
      const customerResponse = await apiRequest("POST", "/api/customers", {
        email: customerData.email,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        address: customerData.address,
        city: customerData.city,
        zipCode: customerData.zipCode,
      });
      const customer = await customerResponse.json();

      // Then create the order
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

    // Validate required billing information
    if (!customerData.firstName || !customerData.lastName || !customerData.email || 
        !customerData.address || !customerData.city || !customerData.zipCode) {
      toast({
        title: "Missing Information",
        description: "Please fill in all billing information fields",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    try {
      // Calculate amounts
      const subtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const hasOriginals = cartItems.some(item => item.type === 'original');
      const shippingCost = subtotal >= 100 ? 0 : (hasOriginals ? 25 : 15);
      
      // Create order first
      const order = await createOrderMutation.mutateAsync({
        cartItems,
        customerData,
        totalAmount: total,
        subtotalAmount: subtotal,
        shippingAmount: shippingCost,
      });

      // Create Interac e-Transfer request
      const interacResponse = await apiRequest("POST", "/api/interac/create-payment", {
        orderId: order.id,
        amount: total,
        customerEmail: customerData.email,
        customerName: `${customerData.firstName} ${customerData.lastName}`,
        memo: `Art Gallery Order #${order.id}`,
      });

      const { transferId, instructions } = await interacResponse.json();

      // Clear cart and redirect to payment instructions
      localStorage.removeItem('cart');
      setLocation(`/interac-payment/${order.id}?transferId=${transferId}`);

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
    <form onSubmit={handleInteracPayment} className="space-y-6">
      <div className="bg-navy-700 border border-navy-600 rounded-lg p-4">
        <h3 className="text-lg font-medium text-white mb-2">Interac e-Transfer Payment</h3>
        <div className="text-sm text-gray-300 space-y-2">
          <p>• You'll receive an email with payment instructions</p>
          <p>• Transfer directly from your Canadian bank account</p>
          <p>• Lower fees than credit cards</p>
          <p>• Secure and trusted by millions of Canadians</p>
        </div>
      </div>
      
      <div className="border border-navy-600 rounded-lg p-4 bg-navy-700">
        <h4 className="font-medium text-white mb-2">How it works:</h4>
        <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
          <li>Click "Send Interac e-Transfer" below</li>
          <li>Check your email for payment instructions</li>
          <li>Log into your online banking</li>
          <li>Send the e-Transfer using the provided details</li>
          <li>Your order will be processed once payment is received</li>
        </ol>
      </div>

      <Button 
        type="submit" 
        disabled={isProcessing || createOrderMutation.isPending}
        className="w-full bg-primary hover:bg-primary/90 text-white py-4 text-lg font-semibold"
      >
        {(isProcessing || createOrderMutation.isPending) ? "Setting up..." : `Send Interac e-Transfer - $${total.toFixed(2)} CAD`}
      </Button>
    </form>
  );
};

const CheckoutFormWithElements = ({ cartItems, customerData, total, clientSecret }: { 
  cartItems: CartItem[]; 
  customerData: CustomerData;
  total: number;
  clientSecret: string;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createOrderMutation = useMutation({
    mutationFn: async ({ cartItems, customerData, totalAmount, subtotalAmount, shippingAmount }: {
      cartItems: CartItem[];
      customerData: CustomerData;
      totalAmount: number;
      subtotalAmount: number;
      shippingAmount: number;
    }) => {
      // First create the customer
      const customerResponse = await apiRequest("POST", "/api/customers", {
        email: customerData.email,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        address: customerData.address,
        city: customerData.city,
        zipCode: customerData.zipCode,
      });
      const customer = await customerResponse.json();

      // Then create the order
      const orderResponse = await apiRequest("POST", "/api/orders", {
        customerId: customer.id,
        subtotalAmount,
        shippingAmount,
        totalAmount,
        status: "pending",
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

    // Validate required billing information
    if (!customerData.firstName || !customerData.lastName || !customerData.email || 
        !customerData.address || !customerData.city || !customerData.zipCode) {
      toast({
        title: "Missing Information",
        description: "Please fill in all billing information fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Extract payment intent ID from client secret 
      // Client secret format: "pi_xxx_secret_yyy", we need the "pi_xxx" part
      const paymentIntentId = clientSecret?.split('_secret_')[0];

      if (paymentIntentId) {
        // Update the payment intent with shipping information
        await apiRequest("POST", "/api/update-payment-intent", {
          paymentIntentId,
          shipping: customerData,
        });
      }

      // Now confirm the payment
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
        // Create order first, then complete it
        const subtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        const hasOriginals = cartItems.some(item => item.type === 'original');
        const shippingCost = subtotal >= 100 ? 0 : (hasOriginals ? 25 : 15);
        
        createOrderMutation.mutate({
          cartItems,
          customerData,
          totalAmount: total,
          subtotalAmount: subtotal,
          shippingAmount: shippingCost,
        }, {
          onSuccess: (order) => {
            completeOrderMutation.mutate({
              orderId: order.id,
              stripePaymentIntentId: paymentIntent.id,
            });
          },
          onError: (error) => {
            toast({
              title: "Order Creation Failed",
              description: error.message || "There was an error creating your order",
              variant: "destructive",
            });
          },
        });
      }
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || !elements || createOrderMutation.isPending || completeOrderMutation.isPending}
        className="w-full bg-primary hover:bg-primary/90 text-white py-4 text-lg font-semibold"
      >
        {(createOrderMutation.isPending || completeOrderMutation.isPending) ? "Processing..." : `Complete Payment - $${total.toFixed(2)} USD`}
      </Button>
    </form>
  );
};

// Enhanced cart item with artwork details for display
interface CartItemWithDetails extends CartItem {
  artworkTitle: string;
  artworkImage: string;
  totalPrice: number;
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartItemsWithDetails, setCartItemsWithDetails] = useState<CartItemWithDetails[]>([]);
  const [clientSecret, setClientSecret] = useState("");
  const [customerData, setCustomerData] = useState<CustomerData>({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    city: "",
    zipCode: "",
    country: "CA",
  });
  
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'interac'>('stripe');
  
  // Auto-detect payment method based on country
  useEffect(() => {
    if (customerData.country === "CA") {
      setPaymentMethod('interac');
    } else {
      setPaymentMethod('stripe');
    }
  }, [customerData.country]);

  const { data: artworks = [] } = useQuery<Artwork[]>({
    queryKey: ['/api/artworks'],
  });

  // Convert cart items to items with details
  useEffect(() => {
    if (cartItems.length > 0 && artworks.length > 0) {
      const itemsWithDetails = cartItems.map(item => {
        const artwork = artworks.find(a => a.id === item.artworkId);
        return {
          ...item,
          artworkTitle: artwork?.title || 'Unknown Artwork',
          artworkImage: artwork?.images?.[0] || '',
          totalPrice: item.unitPrice * item.quantity,
        };
      });
      setCartItemsWithDetails(itemsWithDetails);
    }
  }, [cartItems, artworks]);

  useEffect(() => {
    const items: CartItem[] = JSON.parse(localStorage.getItem('cart') || '[]');
    if (items.length === 0) {
      setLocation('/cart');
      return;
    }
    setCartItems(items);

    // Calculate total including shipping
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const hasOriginals = items.some(item => item.type === 'original');
    const shippingCost = subtotal >= 100 ? 0 : (hasOriginals ? 25 : 15);
    const total = subtotal + shippingCost;
    
    apiRequest("POST", "/api/create-payment-intent", { 
      amount: total,
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
    if (cartItemsWithDetails.length > 0) {
      return cartItemsWithDetails.reduce((sum, item) => sum + item.totalPrice, 0);
    }
    return cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const getShippingCost = () => {
    const subtotal = getSubtotal();
    const hasOriginals = cartItems.some(item => item.type === 'original');
    
    // Free shipping for orders over $100
    if (subtotal >= 100) return 0;
    
    // Higher shipping for originals due to special handling
    if (hasOriginals) return 25;
    
    // Standard shipping for prints only
    return 15;
  };

  const getTotal = () => {
    return getSubtotal() + getShippingCost();
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
                <div className="grid grid-cols-3 gap-4">
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
                  <select
                    value={customerData.country}
                    onChange={(e) => setCustomerData({...customerData, country: e.target.value})}
                    className="bg-navy-700 border border-navy-600 text-white rounded-md px-3 py-2 focus:border-primary focus:outline-none"
                  >
                    <option value="CA">Canada</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                
                {/* Payment Method Selection */}
                <div className="mt-6 p-4 bg-navy-700 rounded-lg">
                  <h3 className="text-sm font-medium text-white mb-3">Payment Method</h3>
                  <div className="space-y-2">
                    {customerData.country === "CA" && (
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="interac"
                          checked={paymentMethod === 'interac'}
                          onChange={(e) => setPaymentMethod(e.target.value as 'interac')}
                          className="text-primary"
                        />
                        <span className="text-white">Interac e-Transfer (Canadian customers)</span>
                        <span className="text-xs text-gray-400">- Lower fees for Canadians</span>
                      </label>
                    )}
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="stripe"
                        checked={paymentMethod === 'stripe'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'stripe')}
                        className="text-primary"
                      />
                      <span className="text-white">Credit/Debit Card (International)</span>
                      <span className="text-xs text-gray-400">- Visa, Mastercard, Amex</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-navy-800 border-navy-700">
              <CardHeader>
                <CardTitle className="text-xl font-serif font-medium text-white">
                  {paymentMethod === 'interac' ? 'Interac e-Transfer' : 'Payment'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethod === 'interac' ? (
                  <InteracPaymentForm
                    cartItems={cartItems}
                    customerData={customerData}
                    total={getTotal()}
                  />
                ) : (
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
                  <CheckoutFormWithElements 
                    cartItems={cartItems} 
                    customerData={customerData}
                    total={getTotal()}
                    clientSecret={clientSecret}
                  />
                </Elements>
                )}
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
                  {cartItemsWithDetails.map((item) => (
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
                    <span className="text-gray-300">
                      Shipping:
                      {getShippingCost() === 0 && (
                        <span className="text-green-400 text-xs ml-1">(Free over $100)</span>
                      )}
                    </span>
                    <span className="text-white">
                      {getShippingCost() === 0 ? 'FREE' : `$${getShippingCost().toFixed(2)}`}
                    </span>
                  </div>
                  {getSubtotal() < 100 && (
                    <div className="text-xs text-gray-400">
                      {getSubtotal() >= 75 ? 
                        `Add $${(100 - getSubtotal()).toFixed(2)} more for free shipping!` :
                        'Free shipping on orders over $100'
                      }
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-semibold border-t border-navy-700 pt-2">
                    <span className="text-white">Total (USD):</span>
                    <span className="text-white">${getTotal().toFixed(2)}</span>
                  </div>
                  <div className="mt-2 p-3 bg-navy-800 rounded border border-navy-600">
                    <div className="flex items-start space-x-2">
                      <div className="text-blue-400 mt-0.5">ℹ️</div>
                      <div className="text-sm text-gray-300">
                        <p className="font-medium text-white mb-1">International Payment Notice</p>
                        <p>All prices are in USD. Your bank may convert to your local currency and apply conversion fees. The final charge on your statement may differ slightly due to exchange rates.</p>
                      </div>
                    </div>
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
