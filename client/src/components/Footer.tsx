import { Instagram, Facebook, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Footer() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    // In a real app, this would send to your email service
    toast({
      title: "Successfully subscribed!",
      description: "You'll be the first to know about new artworks.",
    });
    setEmail("");
  };

  return (
    <footer className="border-t border-navy-700 py-12 mt-16 bg-navy-900">
      <div className="container mx-auto px-4">
        {/* Newsletter Signup */}
        <div className="text-center mb-8 max-w-md mx-auto">
          <h3 className="gallery-logo text-lg font-medium text-white mb-2">
            Join the Collector's List
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Be the first to know about new original paintings and prints
          </p>
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-navy-800 border-navy-600 text-white placeholder-gray-400 focus:border-primary"
            />
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/90 text-white px-6"
            >
              Subscribe
            </Button>
          </form>
        </div>

        {/* Footer Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-navy-700">
          <div className="text-gray-400 text-sm mb-4 md:mb-0">
            © 2024 Hana's Art Gallery. All rights reserved.
          </div>
          <div className="flex space-x-4">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
