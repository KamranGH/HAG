import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Mail, ShoppingCart, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface CartItem {
  id: string;
  artworkId: number;
  type: 'original' | 'print';
  quantity: number;
}

interface HeaderProps {
  isAdminMode?: boolean;
  onToggleAdmin?: () => void;
  showAdminButton?: boolean;
}

export default function Header({ isAdminMode = false, onToggleAdmin, showAdminButton = false }: HeaderProps) {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Get cart items from localStorage for now (in production, this would be from a cart service)
  const cartItems: CartItem[] = JSON.parse(localStorage.getItem('cart') || '[]');
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const isGalleryView = location === '/';
  const showBackButton = !isGalleryView;

  return (
    <header className="sticky top-0 z-50 bg-navy-900/90 backdrop-blur-sm border-b border-navy-700">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBackButton && (
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Gallery
              </Button>
            </Link>
          )}
        </div>
        
        <Link href="/">
          <h1 className="gallery-logo text-2xl md:text-3xl font-semibold tracking-wide text-white hover:text-gray-300 transition-colors cursor-pointer">
            Hana's Art Gallery
          </h1>
        </Link>
        
        <div className="flex items-center space-x-4">
          <Link href="/contact">
            <Button variant="ghost" size="sm" className="p-2 hover:bg-navy-800 text-gray-300 hover:text-white">
              <Mail className="w-5 h-5" />
            </Button>
          </Link>
          
          <Link href="/cart">
            <Button variant="ghost" size="sm" className="relative p-2 hover:bg-navy-800 text-gray-300 hover:text-white">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>
          
          {isAdminMode && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggleAdmin}
              className="text-gray-300 hover:text-white bg-primary text-white"
            >
              Exit Admin
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
