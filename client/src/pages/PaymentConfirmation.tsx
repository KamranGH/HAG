import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useLocation } from "wouter";

export default function PaymentConfirmation() {
  const { orderId } = useParams();
  const [, setLocation] = useLocation();

  const { data: order, isLoading } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-900 text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-navy-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif mb-4">Order Not Found</h1>
          <Button onClick={() => setLocation('/')}>Return to Gallery</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-serif font-semibold mb-4">Payment Successful!</h1>
          <p className="text-gray-300 mb-8">Thank you for your purchase. Your order has been confirmed.</p>
          
          <Card className="bg-navy-800 border-navy-700 text-left mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-serif font-medium mb-4 text-white">Order Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Order ID:</span>
                  <span className="text-white">#HAG-{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Payment Date:</span>
                  <span className="text-white">
                    {new Date(order.createdAt || order.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                {order.subtotalAmount && order.shippingAmount !== undefined ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Subtotal:</span>
                      <span className="text-white">${parseFloat(order.subtotalAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Shipping:</span>
                      <span className="text-white">
                        {parseFloat(order.shippingAmount) === 0 ? 'FREE' : `$${parseFloat(order.shippingAmount).toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-xl font-semibold border-t border-navy-700 pt-3">
                      <span className="text-white">Total Amount:</span>
                      <span className="text-white">${parseFloat(order.totalAmount).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Amount:</span>
                    <span className="text-xl font-semibold text-white">
                      ${parseFloat(order.totalAmount || order.total).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-4">
            <p className="text-gray-300">
              You will receive a confirmation email shortly with your order details and tracking information.
            </p>
            <Button 
              onClick={() => setLocation('/')}
              className="bg-primary hover:bg-primary/90"
            >
              Return to Gallery
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
