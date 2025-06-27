import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Artwork } from "@shared/schema";

interface CartItem {
  id: string;
  artworkId: number;
  artworkTitle: string;
  artworkImage: string;
  type: 'original' | 'print';
  printSize?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export default function ArtworkDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [selectedPrintOption, setSelectedPrintOption] = useState<number | null>(null);
  const [printQuantity, setPrintQuantity] = useState(1);
  
  const { data: artwork, isLoading, error } = useQuery<Artwork>({
    queryKey: [`/api/artworks/${id}`],
  });

  // Fetch all artworks for navigation
  const { data: allArtworks } = useQuery<Artwork[]>({
    queryKey: ['/api/artworks'],
  });

  // Find current artwork index and navigation
  const currentIndex = allArtworks?.findIndex(art => art.id === parseInt(id || '0')) ?? -1;
  const previousArtwork = currentIndex > 0 ? allArtworks?.[currentIndex - 1] : null;
  const nextArtwork = currentIndex >= 0 && allArtworks && currentIndex < allArtworks.length - 1 ? allArtworks[currentIndex + 1] : null;

  const addToCart = (item: CartItem) => {
    const existingCart: CartItem[] = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if item already exists in cart
    const existingItemIndex = existingCart.findIndex(
      cartItem => cartItem.artworkId === item.artworkId && 
                 cartItem.type === item.type && 
                 cartItem.printSize === item.printSize
    );

    if (existingItemIndex >= 0) {
      // Update quantity if item exists
      existingCart[existingItemIndex].quantity += item.quantity;
      existingCart[existingItemIndex].totalPrice = 
        existingCart[existingItemIndex].quantity * existingCart[existingItemIndex].unitPrice;
    } else {
      // Add new item
      existingCart.push(item);
    }
    
    localStorage.setItem('cart', JSON.stringify(existingCart));
    
    toast({
      title: "Added to Cart",
      description: `${item.artworkTitle} has been added to your cart.`,
    });
  };

  const handleAddOriginalToCart = () => {
    if (!artwork || !artwork.originalAvailable || artwork.originalSold) return;
    
    const item: CartItem = {
      id: `${artwork.id}-original`,
      artworkId: artwork.id,
      artworkTitle: artwork.title,
      artworkImage: artwork.images?.[0] || '',
      type: 'original',
      quantity: 1,
      unitPrice: parseFloat(artwork.originalPrice || '0'),
      totalPrice: parseFloat(artwork.originalPrice || '0'),
    };
    
    addToCart(item);
  };

  const handleAddPrintToCart = () => {
    if (!artwork || selectedPrintOption === null || !artwork.printOptions) return;
    
    const printOption = artwork.printOptions[selectedPrintOption];
    const item: CartItem = {
      id: `${artwork.id}-print-${selectedPrintOption}`,
      artworkId: artwork.id,
      artworkTitle: artwork.title,
      artworkImage: artwork.images?.[0] || '',
      type: 'print',
      printSize: printOption.size,
      quantity: printQuantity,
      unitPrice: printOption.price,
      totalPrice: printOption.price * printQuantity,
    };
    
    addToCart(item);
  };

  const handleBuyNow = (type: 'original' | 'print') => {
    if (type === 'original') {
      handleAddOriginalToCart();
    } else {
      handleAddPrintToCart();
    }
    setLocation('/cart');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-900 text-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              <div className="aspect-[3/4] bg-navy-800 rounded-lg"></div>
              <div className="space-y-6">
                <div className="h-12 bg-navy-800 rounded"></div>
                <div className="h-6 bg-navy-800 rounded w-3/4"></div>
                <div className="h-32 bg-navy-800 rounded"></div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !artwork) {
    return (
      <div className="min-h-screen bg-navy-900 text-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-serif mb-4">Artwork Not Found</h2>
            <p className="text-gray-300 mb-6">The artwork you're looking for doesn't exist.</p>
            <Button onClick={() => setLocation('/')}>Return to Gallery</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const getImageUrl = (url: string) => {
    return url || `https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=1200`;
  };

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Navigation Controls */}
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/artwork/${previousArtwork?.id}`)}
            disabled={!previousArtwork}
            className="text-gray-300 hover:text-white disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <div className="text-center text-gray-400 text-sm">
            {currentIndex + 1} of {allArtworks?.length || 0}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/artwork/${nextArtwork?.id}`)}
            disabled={!nextArtwork}
            className="text-gray-300 hover:text-white disabled:opacity-50"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Artwork Images */}
          <div className="space-y-4">
            <div className="relative bg-navy-800 rounded-lg overflow-hidden">
              <img 
                src={getImageUrl(artwork.images?.[0] || '')}
                alt={artwork.title}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </div>
          </div>

          {/* Artwork Info */}
          <div className="space-y-6">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-4 text-white">
                {artwork.title}
              </h1>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mb-6">
                <div>
                  <span className="block font-medium text-white">Year</span>
                  <span>{artwork.year}</span>
                </div>
                <div>
                  <span className="block font-medium text-white">Medium</span>
                  <span>{artwork.medium}</span>
                </div>
                <div>
                  <span className="block font-medium text-white">Dimensions</span>
                  <span>{artwork.originalDimensions}</span>
                </div>
              </div>
              {artwork.description && (
                <div className="prose prose-invert">
                  <p className="text-gray-300 leading-relaxed">
                    {artwork.description}
                  </p>
                </div>
              )}
            </div>

            {/* Purchase Options */}
            <div className="space-y-6">
              {/* Original Purchase Option */}
              {artwork.originalAvailable && (
                <Card className={`bg-navy-800 border-navy-700 ${artwork.originalSold ? 'opacity-50' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-serif font-medium text-white">Original Artwork</h3>
                      <div className="text-2xl font-semibold text-white">
                        ${artwork.originalPrice}
                        {artwork.originalSold && <span className="text-red-400 text-sm ml-2">(SOLD)</span>}
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      One-of-a-kind original piece, hand-created by the artist.
                    </p>
                    {!artwork.originalSold && (
                      <div className="flex space-x-3">
                        <Button 
                          onClick={() => handleBuyNow('original')}
                          className="flex-1 bg-primary hover:bg-primary/90"
                        >
                          Buy Now
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={handleAddOriginalToCart}
                          className="flex-1 border-primary text-primary hover:bg-primary hover:text-white"
                        >
                          Add to Cart
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Print Purchase Options */}
              {artwork.printsAvailable && artwork.printOptions && artwork.printOptions.length > 0 && (
                <Card className="bg-navy-800 border-navy-700">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-serif font-medium mb-4 text-white">Fine Art Prints</h3>
                    
                    {/* Print Size Selector */}
                    <div className="space-y-3 mb-6">
                      {artwork.printOptions.map((option, index) => (
                        <div 
                          key={index}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedPrintOption === index 
                              ? 'border-primary bg-primary/10' 
                              : 'border-navy-700 hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedPrintOption(index)}
                        >
                          <div>
                            <div className="font-medium text-white">Print - {option.size}</div>
                          </div>
                          <div className="font-semibold text-white">${option.price}</div>
                        </div>
                      ))}
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center space-x-4 mb-6">
                      <label className="font-medium text-white">Quantity:</label>
                      <div className="flex items-center border border-navy-700 rounded-lg">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPrintQuantity(Math.max(1, printQuantity - 1))}
                          className="p-2 hover:bg-navy-700"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <input 
                          type="number" 
                          value={printQuantity} 
                          min="1" 
                          max="10"
                          onChange={(e) => setPrintQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 text-center bg-transparent border-none focus:outline-none text-white"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPrintQuantity(Math.min(10, printQuantity + 1))}
                          className="p-2 hover:bg-navy-700"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <Button 
                        onClick={() => handleBuyNow('print')}
                        disabled={selectedPrintOption === null}
                        className="flex-1 bg-primary hover:bg-primary/90"
                      >
                        Buy Now
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleAddPrintToCart}
                        disabled={selectedPrintOption === null}
                        className="flex-1 border-primary text-primary hover:bg-primary hover:text-white"
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
