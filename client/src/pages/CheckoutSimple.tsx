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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const shippingCost = hasOriginals ? 25 : 15;
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
    mutationFn: async (customerData?: CustomerData) => {
      const response = await apiRequest('POST', '/api/create-payment-intent', {
        amount: total,
        customerData,
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
      createPaymentIntent.mutate(undefined);
    }
  }, [total]);

  const onSubmit = (data: CustomerData) => {
    setCustomerData(data);
    // Recreate payment intent with customer data for shipping info
    createPaymentIntent.mutate(data);
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-sm bg-slate-700 border-slate-600">
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                              <SelectItem value="AF">Afghanistan</SelectItem>
                              <SelectItem value="AL">Albania</SelectItem>
                              <SelectItem value="DZ">Algeria</SelectItem>
                              <SelectItem value="AS">American Samoa</SelectItem>
                              <SelectItem value="AD">Andorra</SelectItem>
                              <SelectItem value="AO">Angola</SelectItem>
                              <SelectItem value="AI">Anguilla</SelectItem>
                              <SelectItem value="AQ">Antarctica</SelectItem>
                              <SelectItem value="AG">Antigua and Barbuda</SelectItem>
                              <SelectItem value="AR">Argentina</SelectItem>
                              <SelectItem value="AM">Armenia</SelectItem>
                              <SelectItem value="AW">Aruba</SelectItem>
                              <SelectItem value="AU">Australia</SelectItem>
                              <SelectItem value="AT">Austria</SelectItem>
                              <SelectItem value="AZ">Azerbaijan</SelectItem>
                              <SelectItem value="BS">Bahamas</SelectItem>
                              <SelectItem value="BH">Bahrain</SelectItem>
                              <SelectItem value="BD">Bangladesh</SelectItem>
                              <SelectItem value="BB">Barbados</SelectItem>
                              <SelectItem value="BY">Belarus</SelectItem>
                              <SelectItem value="BE">Belgium</SelectItem>
                              <SelectItem value="BZ">Belize</SelectItem>
                              <SelectItem value="BJ">Benin</SelectItem>
                              <SelectItem value="BM">Bermuda</SelectItem>
                              <SelectItem value="BT">Bhutan</SelectItem>
                              <SelectItem value="BO">Bolivia</SelectItem>
                              <SelectItem value="BA">Bosnia and Herzegovina</SelectItem>
                              <SelectItem value="BW">Botswana</SelectItem>
                              <SelectItem value="BV">Bouvet Island</SelectItem>
                              <SelectItem value="BR">Brazil</SelectItem>
                              <SelectItem value="IO">British Indian Ocean Territory</SelectItem>
                              <SelectItem value="BN">Brunei Darussalam</SelectItem>
                              <SelectItem value="BG">Bulgaria</SelectItem>
                              <SelectItem value="BF">Burkina Faso</SelectItem>
                              <SelectItem value="BI">Burundi</SelectItem>
                              <SelectItem value="KH">Cambodia</SelectItem>
                              <SelectItem value="CM">Cameroon</SelectItem>
                              <SelectItem value="CA">Canada</SelectItem>
                              <SelectItem value="CV">Cape Verde</SelectItem>
                              <SelectItem value="KY">Cayman Islands</SelectItem>
                              <SelectItem value="CF">Central African Republic</SelectItem>
                              <SelectItem value="TD">Chad</SelectItem>
                              <SelectItem value="CL">Chile</SelectItem>
                              <SelectItem value="CN">China</SelectItem>
                              <SelectItem value="CX">Christmas Island</SelectItem>
                              <SelectItem value="CC">Cocos (Keeling) Islands</SelectItem>
                              <SelectItem value="CO">Colombia</SelectItem>
                              <SelectItem value="KM">Comoros</SelectItem>
                              <SelectItem value="CG">Congo</SelectItem>
                              <SelectItem value="CD">Congo, Democratic Republic</SelectItem>
                              <SelectItem value="CK">Cook Islands</SelectItem>
                              <SelectItem value="CR">Costa Rica</SelectItem>
                              <SelectItem value="CI">Côte d'Ivoire</SelectItem>
                              <SelectItem value="HR">Croatia</SelectItem>
                              <SelectItem value="CU">Cuba</SelectItem>
                              <SelectItem value="CY">Cyprus</SelectItem>
                              <SelectItem value="CZ">Czech Republic</SelectItem>
                              <SelectItem value="DK">Denmark</SelectItem>
                              <SelectItem value="DJ">Djibouti</SelectItem>
                              <SelectItem value="DM">Dominica</SelectItem>
                              <SelectItem value="DO">Dominican Republic</SelectItem>
                              <SelectItem value="EC">Ecuador</SelectItem>
                              <SelectItem value="EG">Egypt</SelectItem>
                              <SelectItem value="SV">El Salvador</SelectItem>
                              <SelectItem value="GQ">Equatorial Guinea</SelectItem>
                              <SelectItem value="ER">Eritrea</SelectItem>
                              <SelectItem value="EE">Estonia</SelectItem>
                              <SelectItem value="ET">Ethiopia</SelectItem>
                              <SelectItem value="FK">Falkland Islands</SelectItem>
                              <SelectItem value="FO">Faroe Islands</SelectItem>
                              <SelectItem value="FJ">Fiji</SelectItem>
                              <SelectItem value="FI">Finland</SelectItem>
                              <SelectItem value="FR">France</SelectItem>
                              <SelectItem value="GF">French Guiana</SelectItem>
                              <SelectItem value="PF">French Polynesia</SelectItem>
                              <SelectItem value="TF">French Southern Territories</SelectItem>
                              <SelectItem value="GA">Gabon</SelectItem>
                              <SelectItem value="GM">Gambia</SelectItem>
                              <SelectItem value="GE">Georgia</SelectItem>
                              <SelectItem value="DE">Germany</SelectItem>
                              <SelectItem value="GH">Ghana</SelectItem>
                              <SelectItem value="GI">Gibraltar</SelectItem>
                              <SelectItem value="GR">Greece</SelectItem>
                              <SelectItem value="GL">Greenland</SelectItem>
                              <SelectItem value="GD">Grenada</SelectItem>
                              <SelectItem value="GP">Guadeloupe</SelectItem>
                              <SelectItem value="GU">Guam</SelectItem>
                              <SelectItem value="GT">Guatemala</SelectItem>
                              <SelectItem value="GG">Guernsey</SelectItem>
                              <SelectItem value="GN">Guinea</SelectItem>
                              <SelectItem value="GW">Guinea-Bissau</SelectItem>
                              <SelectItem value="GY">Guyana</SelectItem>
                              <SelectItem value="HT">Haiti</SelectItem>
                              <SelectItem value="HM">Heard Island & McDonald Islands</SelectItem>
                              <SelectItem value="VA">Holy See (Vatican City State)</SelectItem>
                              <SelectItem value="HN">Honduras</SelectItem>
                              <SelectItem value="HK">Hong Kong</SelectItem>
                              <SelectItem value="HU">Hungary</SelectItem>
                              <SelectItem value="IS">Iceland</SelectItem>
                              <SelectItem value="IN">India</SelectItem>
                              <SelectItem value="ID">Indonesia</SelectItem>
                              <SelectItem value="IR">Iran, Islamic Republic of</SelectItem>
                              <SelectItem value="IQ">Iraq</SelectItem>
                              <SelectItem value="IE">Ireland</SelectItem>
                              <SelectItem value="IM">Isle of Man</SelectItem>
                              <SelectItem value="IL">Israel</SelectItem>
                              <SelectItem value="IT">Italy</SelectItem>
                              <SelectItem value="JM">Jamaica</SelectItem>
                              <SelectItem value="JP">Japan</SelectItem>
                              <SelectItem value="JE">Jersey</SelectItem>
                              <SelectItem value="JO">Jordan</SelectItem>
                              <SelectItem value="KZ">Kazakhstan</SelectItem>
                              <SelectItem value="KE">Kenya</SelectItem>
                              <SelectItem value="KI">Kiribati</SelectItem>
                              <SelectItem value="KP">Korea, Democratic People's Republic of</SelectItem>
                              <SelectItem value="KR">Korea, Republic of</SelectItem>
                              <SelectItem value="KW">Kuwait</SelectItem>
                              <SelectItem value="KG">Kyrgyzstan</SelectItem>
                              <SelectItem value="LA">Lao People's Democratic Republic</SelectItem>
                              <SelectItem value="LV">Latvia</SelectItem>
                              <SelectItem value="LB">Lebanon</SelectItem>
                              <SelectItem value="LS">Lesotho</SelectItem>
                              <SelectItem value="LR">Liberia</SelectItem>
                              <SelectItem value="LY">Libyan Arab Jamahiriya</SelectItem>
                              <SelectItem value="LI">Liechtenstein</SelectItem>
                              <SelectItem value="LT">Lithuania</SelectItem>
                              <SelectItem value="LU">Luxembourg</SelectItem>
                              <SelectItem value="MO">Macao</SelectItem>
                              <SelectItem value="MK">Macedonia</SelectItem>
                              <SelectItem value="MG">Madagascar</SelectItem>
                              <SelectItem value="MW">Malawi</SelectItem>
                              <SelectItem value="MY">Malaysia</SelectItem>
                              <SelectItem value="MV">Maldives</SelectItem>
                              <SelectItem value="ML">Mali</SelectItem>
                              <SelectItem value="MT">Malta</SelectItem>
                              <SelectItem value="MH">Marshall Islands</SelectItem>
                              <SelectItem value="MQ">Martinique</SelectItem>
                              <SelectItem value="MR">Mauritania</SelectItem>
                              <SelectItem value="MU">Mauritius</SelectItem>
                              <SelectItem value="YT">Mayotte</SelectItem>
                              <SelectItem value="MX">Mexico</SelectItem>
                              <SelectItem value="FM">Micronesia</SelectItem>
                              <SelectItem value="MD">Moldova</SelectItem>
                              <SelectItem value="MC">Monaco</SelectItem>
                              <SelectItem value="MN">Mongolia</SelectItem>
                              <SelectItem value="ME">Montenegro</SelectItem>
                              <SelectItem value="MS">Montserrat</SelectItem>
                              <SelectItem value="MA">Morocco</SelectItem>
                              <SelectItem value="MZ">Mozambique</SelectItem>
                              <SelectItem value="MM">Myanmar</SelectItem>
                              <SelectItem value="NA">Namibia</SelectItem>
                              <SelectItem value="NR">Nauru</SelectItem>
                              <SelectItem value="NP">Nepal</SelectItem>
                              <SelectItem value="NL">Netherlands</SelectItem>
                              <SelectItem value="AN">Netherlands Antilles</SelectItem>
                              <SelectItem value="NC">New Caledonia</SelectItem>
                              <SelectItem value="NZ">New Zealand</SelectItem>
                              <SelectItem value="NI">Nicaragua</SelectItem>
                              <SelectItem value="NE">Niger</SelectItem>
                              <SelectItem value="NG">Nigeria</SelectItem>
                              <SelectItem value="NU">Niue</SelectItem>
                              <SelectItem value="NF">Norfolk Island</SelectItem>
                              <SelectItem value="MP">Northern Mariana Islands</SelectItem>
                              <SelectItem value="NO">Norway</SelectItem>
                              <SelectItem value="OM">Oman</SelectItem>
                              <SelectItem value="PK">Pakistan</SelectItem>
                              <SelectItem value="PW">Palau</SelectItem>
                              <SelectItem value="PS">Palestinian Territory</SelectItem>
                              <SelectItem value="PA">Panama</SelectItem>
                              <SelectItem value="PG">Papua New Guinea</SelectItem>
                              <SelectItem value="PY">Paraguay</SelectItem>
                              <SelectItem value="PE">Peru</SelectItem>
                              <SelectItem value="PH">Philippines</SelectItem>
                              <SelectItem value="PN">Pitcairn</SelectItem>
                              <SelectItem value="PL">Poland</SelectItem>
                              <SelectItem value="PT">Portugal</SelectItem>
                              <SelectItem value="PR">Puerto Rico</SelectItem>
                              <SelectItem value="QA">Qatar</SelectItem>
                              <SelectItem value="RE">Réunion</SelectItem>
                              <SelectItem value="RO">Romania</SelectItem>
                              <SelectItem value="RU">Russian Federation</SelectItem>
                              <SelectItem value="RW">Rwanda</SelectItem>
                              <SelectItem value="BL">Saint Barthélemy</SelectItem>
                              <SelectItem value="SH">Saint Helena</SelectItem>
                              <SelectItem value="KN">Saint Kitts and Nevis</SelectItem>
                              <SelectItem value="LC">Saint Lucia</SelectItem>
                              <SelectItem value="MF">Saint Martin</SelectItem>
                              <SelectItem value="PM">Saint Pierre and Miquelon</SelectItem>
                              <SelectItem value="VC">Saint Vincent and the Grenadines</SelectItem>
                              <SelectItem value="WS">Samoa</SelectItem>
                              <SelectItem value="SM">San Marino</SelectItem>
                              <SelectItem value="ST">Sao Tome and Principe</SelectItem>
                              <SelectItem value="SA">Saudi Arabia</SelectItem>
                              <SelectItem value="SN">Senegal</SelectItem>
                              <SelectItem value="RS">Serbia</SelectItem>
                              <SelectItem value="SC">Seychelles</SelectItem>
                              <SelectItem value="SL">Sierra Leone</SelectItem>
                              <SelectItem value="SG">Singapore</SelectItem>
                              <SelectItem value="SK">Slovakia</SelectItem>
                              <SelectItem value="SI">Slovenia</SelectItem>
                              <SelectItem value="SB">Solomon Islands</SelectItem>
                              <SelectItem value="SO">Somalia</SelectItem>
                              <SelectItem value="ZA">South Africa</SelectItem>
                              <SelectItem value="GS">South Georgia and the South Sandwich Islands</SelectItem>
                              <SelectItem value="ES">Spain</SelectItem>
                              <SelectItem value="LK">Sri Lanka</SelectItem>
                              <SelectItem value="SD">Sudan</SelectItem>
                              <SelectItem value="SR">Suriname</SelectItem>
                              <SelectItem value="SJ">Svalbard and Jan Mayen</SelectItem>
                              <SelectItem value="SZ">Swaziland</SelectItem>
                              <SelectItem value="SE">Sweden</SelectItem>
                              <SelectItem value="CH">Switzerland</SelectItem>
                              <SelectItem value="SY">Syrian Arab Republic</SelectItem>
                              <SelectItem value="TW">Taiwan</SelectItem>
                              <SelectItem value="TJ">Tajikistan</SelectItem>
                              <SelectItem value="TZ">Tanzania</SelectItem>
                              <SelectItem value="TH">Thailand</SelectItem>
                              <SelectItem value="TL">Timor-Leste</SelectItem>
                              <SelectItem value="TG">Togo</SelectItem>
                              <SelectItem value="TK">Tokelau</SelectItem>
                              <SelectItem value="TO">Tonga</SelectItem>
                              <SelectItem value="TT">Trinidad and Tobago</SelectItem>
                              <SelectItem value="TN">Tunisia</SelectItem>
                              <SelectItem value="TR">Turkey</SelectItem>
                              <SelectItem value="TM">Turkmenistan</SelectItem>
                              <SelectItem value="TC">Turks and Caicos Islands</SelectItem>
                              <SelectItem value="TV">Tuvalu</SelectItem>
                              <SelectItem value="UG">Uganda</SelectItem>
                              <SelectItem value="UA">Ukraine</SelectItem>
                              <SelectItem value="AE">United Arab Emirates</SelectItem>
                              <SelectItem value="GB">United Kingdom</SelectItem>
                              <SelectItem value="US">United States</SelectItem>
                              <SelectItem value="UM">United States Minor Outlying Islands</SelectItem>
                              <SelectItem value="UY">Uruguay</SelectItem>
                              <SelectItem value="UZ">Uzbekistan</SelectItem>
                              <SelectItem value="VU">Vanuatu</SelectItem>
                              <SelectItem value="VE">Venezuela</SelectItem>
                              <SelectItem value="VN">Viet Nam</SelectItem>
                              <SelectItem value="VG">Virgin Islands, British</SelectItem>
                              <SelectItem value="VI">Virgin Islands, U.S.</SelectItem>
                              <SelectItem value="WF">Wallis and Futuna</SelectItem>
                              <SelectItem value="EH">Western Sahara</SelectItem>
                              <SelectItem value="YE">Yemen</SelectItem>
                              <SelectItem value="ZM">Zambia</SelectItem>
                              <SelectItem value="ZW">Zimbabwe</SelectItem>
                            </SelectContent>
                          </Select>
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
                  <Elements 
                    stripe={stripePromise} 
                    options={{ 
                      clientSecret,
                      appearance: {
                        theme: 'night',
                        variables: {
                          colorPrimary: '#0066cc',
                          colorBackground: '#1e293b',
                          colorText: '#ffffff',
                          colorDanger: '#fa755a',
                          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                          spacingUnit: '6px',
                          borderRadius: '6px',
                        },
                        rules: {
                          '.Input': {
                            backgroundColor: '#334155',
                            border: '1px solid #475569',
                            color: '#ffffff',
                          },
                          '.Input:focus': {
                            border: '1px solid #0066cc',
                            boxShadow: '0 0 0 1px #0066cc',
                          },
                          '.Label': {
                            color: '#ffffff',
                            fontWeight: '500',
                          },
                        }
                      }
                    }}
                  >
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
                      <p className="text-xs font-medium">${item.totalPrice.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center">
                      <Truck className="w-3 h-3 mr-1" />
                      Shipping
                    </span>
                    <span>
                      ${shippingCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-slate-600 pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-400">
                  <div className="flex items-center">
                    <Shield className="w-3 h-3 mr-2" />
                    <span>Secure payment with Stripe</span>
                  </div>

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