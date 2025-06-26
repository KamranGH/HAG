import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertContactMessageSchema } from "@shared/schema";
import { z } from "zod";

type FormData = z.infer<typeof insertContactMessageSchema>;

export default function Contact() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(insertContactMessageSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/contact", data);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Thank you for your message! We'll get back to you soon.",
      });
      form.reset();
      setTimeout(() => setLocation('/'), 2000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    sendMessageMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-serif font-semibold text-center mb-12">CONTACT</h1>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium text-white">Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        className="contact-input bg-transparent border-0 border-b-2 border-navy-700 focus:border-primary rounded-none px-0 py-2 text-lg text-white placeholder:text-gray-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium text-white">Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        {...field}
                        className="contact-input bg-transparent border-0 border-b-2 border-navy-700 focus:border-primary rounded-none px-0 py-2 text-lg text-white placeholder:text-gray-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium text-white">Subject</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        className="contact-input bg-transparent border-0 border-b-2 border-navy-700 focus:border-primary rounded-none px-0 py-2 text-lg text-white placeholder:text-gray-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium text-white">Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        rows={6}
                        className="contact-input bg-transparent border-0 border-b-2 border-navy-700 focus:border-primary rounded-none px-0 py-2 text-lg text-white placeholder:text-gray-400 resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="text-center pt-4">
                <Button 
                  type="submit" 
                  disabled={sendMessageMutation.isPending}
                  className="bg-navy-700 hover:bg-navy-600 text-white py-4 px-12 rounded-lg font-medium text-lg"
                >
                  {sendMessageMutation.isPending ? "SENDING..." : "SEND MESSAGE"}
                </Button>
              </div>
            </form>
          </Form>
          
          <div className="text-center mt-8 text-sm text-gray-400">
            <p>
              Protected by reCAPTCHA. Google's{' '}
              <a href="#" className="underline hover:text-white transition-colors">Privacy Policy</a>
              {' '}and{' '}
              <a href="#" className="underline hover:text-white transition-colors">Terms of Service</a>
              {' '}apply.
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
