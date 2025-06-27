import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Mail, CreditCard, Clock, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function InteracPayment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [orderId, setOrderId] = useState<string>('');
  const [transferId, setTransferId] = useState<string>('');

  useEffect(() => {
    // Extract order ID from URL path
    const path = window.location.pathname;
    const orderMatch = path.match(/\/interac-payment\/(\d+)/);
    if (orderMatch) {
      setOrderId(orderMatch[1]);
    }

    // Extract transfer ID from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const transferParam = urlParams.get('transferId');
    if (transferParam) {
      setTransferId(transferParam);
    }
  }, []);

  const { data: order, isLoading } = useQuery({
    queryKey: ['/api/orders', orderId],
    enabled: !!orderId,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${label} has been copied to your clipboard`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="bg-navy-800 border-navy-700 max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-serif text-white mb-4">Order Not Found</h2>
            <p className="text-gray-300 mb-6">We couldn't find your order details.</p>
            <Button onClick={() => setLocation('/')} className="bg-primary hover:bg-primary/90">
              Return to Gallery
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const paymentDetails = {
    recipientEmail: "payments@hanasartgallery.com",
    recipientName: "Hana's Art Gallery",
    amount: Number(order.totalAmount) || 0,
    securityQuestion: "What is your order number?",
    securityAnswer: orderId,
    memo: `Art Gallery Order #${orderId}`
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-serif text-white mb-4">Interac e-Transfer Payment</h1>
          <Badge variant="outline" className="text-primary border-primary">
            Order #{orderId}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Payment Instructions */}
          <Card className="bg-navy-800 border-navy-700">
            <CardHeader>
              <CardTitle className="text-xl font-serif text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium text-green-800">Payment Details Created</h3>
                </div>
                <p className="text-sm text-green-700">
                  Your order has been created and is waiting for payment.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Recipient Email
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-navy-700 border border-navy-600 rounded px-3 py-2 text-white">
                      {paymentDetails.recipientEmail}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(paymentDetails.recipientEmail, 'Email')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Recipient Name
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-navy-700 border border-navy-600 rounded px-3 py-2 text-white">
                      {paymentDetails.recipientName}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(paymentDetails.recipientName, 'Name')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Amount
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-navy-700 border border-navy-600 rounded px-3 py-2 text-white font-semibold">
                      ${paymentDetails.amount.toFixed(2)} CAD
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(paymentDetails.amount.toString(), 'Amount')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Security Question
                  </label>
                  <div className="bg-navy-700 border border-navy-600 rounded px-3 py-2 text-white">
                    {paymentDetails.securityQuestion}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Security Answer
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-navy-700 border border-navy-600 rounded px-3 py-2 text-white font-semibold">
                      {paymentDetails.securityAnswer}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(paymentDetails.securityAnswer, 'Security Answer')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Message/Memo
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-navy-700 border border-navy-600 rounded px-3 py-2 text-white">
                      {paymentDetails.memo}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(paymentDetails.memo, 'Memo')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step-by-Step Guide */}
          <Card className="bg-navy-800 border-navy-700">
            <CardHeader>
              <CardTitle className="text-xl font-serif text-white flex items-center gap-2">
                <Mail className="w-5 h-5" />
                How to Send Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-navy-900 rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  <div>
                    <h4 className="font-medium text-white">Log into your online banking</h4>
                    <p className="text-sm text-gray-300">
                      Access your Canadian bank's online banking or mobile app
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-navy-900 rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  <div>
                    <h4 className="font-medium text-white">Find Interac e-Transfer</h4>
                    <p className="text-sm text-gray-300">
                      Look for "Send Money", "e-Transfer", or "Interac e-Transfer"
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-navy-900 rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </span>
                  <div>
                    <h4 className="font-medium text-white">Enter payment details</h4>
                    <p className="text-sm text-gray-300">
                      Use the recipient email, amount, and security question from above
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-navy-900 rounded-full flex items-center justify-center text-sm font-bold">
                    4
                  </span>
                  <div>
                    <h4 className="font-medium text-white">Send the transfer</h4>
                    <p className="text-sm text-gray-300">
                      Review and confirm the payment details, then send
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-navy-900 rounded-full flex items-center justify-center text-sm font-bold">
                    5
                  </span>
                  <div>
                    <h4 className="font-medium text-white">We'll process your order</h4>
                    <p className="text-sm text-gray-300">
                      Once payment is received, we'll confirm and ship your order
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Processing Time</h4>
                </div>
                <p className="text-sm text-blue-800">
                  Orders are typically processed within 1-2 business days after payment is received.
                  You'll receive a confirmation email once your payment has been processed.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button
            onClick={() => setLocation('/')}
            variant="outline"
            className="text-white border-navy-600 hover:bg-navy-700"
          >
            Return to Gallery
          </Button>
        </div>
      </div>
    </div>
  );
}