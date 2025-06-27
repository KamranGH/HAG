import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";
import type { Artwork } from "@shared/schema";

// Optimized cart item structure
interface CartItem {
  id: string;
  artworkId: number;
  type: 'original' | 'print';
  printSize?: string;
  quantity: number;
  unitPrice: number;
}

// Enhanced cart item with artwork details for display
interface CartItemWithDetails extends CartItem {
  artworkTitle: string;
  artworkImage: string;
  totalPrice: number;
}

export default function Cart() {
  const [, setLocation] = useLocation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartItemsWithDetails, setCartItemsWithDetails] = useState<CartItemWithDetails[]>([]);

  const { data: artworks = [] } = useQuery<Artwork[]>({
    queryKey: ['/api/artworks'],
  });

  useEffect(() => {
    const items: CartItem[] = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(items);
  }, []);

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
    } else {
      setCartItemsWithDetails([]);
    }
  }, [cartItems, artworks]);

  const updateCart = (items: CartItem[]) => {
    setCartItems(items);
    try {
      localStorage.setItem('cart', JSON.stringify(items));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        // Clear all localStorage and try again
        localStorage.clear();
        try {
          localStorage.setItem('cart', JSON.stringify(items));
        } catch {
          // If still failing, just clear the cart
          setCartItems([]);
        }
      }
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const updatedItems = cartItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity: newQuantity,
        };
      }
      return item;
    });
    
    updateCart(updatedItems);
  };

  const removeItem = (itemId: string) => {
    const updatedItems = cartItems.filter(item => item.id !== itemId);
    updateCart(updatedItems);
  };

  const getSubtotal = () => {
    return cartItemsWithDetails.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const getImageUrl = (url: string) => {
    return url || `https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600`;
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-navy-900 text-white">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-navy-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-2xl font-serif font-medium mb-4">Your Cart is Empty</h2>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              Discover beautiful artworks and add them to your cart to get started.
            </p>
            <Button 
              onClick={() => setLocation('/')}
              className="bg-primary hover:bg-primary/90"
            >
              Browse Gallery
            </Button>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-serif font-semibold mb-8">Shopping Cart</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {cartItemsWithDetails.map((item) => (
              <Card key={item.id} className="bg-navy-800 border-navy-700">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="w-24 h-32 bg-navy-700 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={getImageUrl(item.artworkImage)}
                        alt={item.artworkTitle}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-lg font-medium mb-2 text-white">
                        {item.artworkTitle}
                      </h3>
                      <p className="text-gray-300 text-sm mb-2">
                        {item.type === 'original' ? 'Original Artwork' : `Print - ${item.printSize}`}
                      </p>
                      <p className="text-gray-300 text-sm mb-4">
                        ${item.unitPrice} each
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {item.type === 'print' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-1 h-8 w-8 hover:bg-navy-700"
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="w-8 text-center text-white">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="p-1 h-8 w-8 hover:bg-navy-700"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <span className="text-lg font-semibold text-white">
                            ${item.totalPrice.toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="text-red-400 hover:text-red-300 p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-navy-800 border-navy-700 sticky top-24">
              <CardContent className="p-6">
                <h3 className="text-xl font-serif font-medium mb-6 text-white">Order Summary</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-300">Subtotal:</span>
                    <span className="text-white">${getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Shipping:</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="border-t border-navy-700 pt-3">
                    <div className="flex justify-between text-xl font-semibold">
                      <span className="text-white">Total:</span>
                      <span className="text-white">${getSubtotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={() => setLocation('/checkout')}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-3 text-lg font-semibold"
                >
                  Proceed to Checkout
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
