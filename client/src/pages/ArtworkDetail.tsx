import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Minus, Plus, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Artwork } from "@shared/schema";

// Optimized cart item structure to reduce localStorage usage
interface CartItem {
  id: string;
  artworkId: number;
  type: 'original' | 'print';
  printSize?: string;
  quantity: number;
  unitPrice: number;
}

export default function ArtworkDetail() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [selectedPrintOption, setSelectedPrintOption] = useState<number | null>(null);
  const [printQuantity, setPrintQuantity] = useState(1);
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
  const currentZoomIndex = zoomLevels.findIndex(level => Math.abs(level - imageZoom) < 0.01);
  const [imageDrag, setImageDrag] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const { data: artwork, isLoading, error } = useQuery<Artwork>({
    queryKey: [`/api/artworks/${slug}`],
  });

  // Fetch all artworks for navigation
  const { data: allArtworks } = useQuery<Artwork[]>({
    queryKey: ['/api/artworks'],
  });

  // Find current artwork index and navigation
  const currentIndex = allArtworks?.findIndex(art => art.slug === slug) ?? -1;
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
    } else {
      // Add new item
      existingCart.push(item);
    }
    
    try {
      localStorage.setItem('cart', JSON.stringify(existingCart));
      toast({
        title: "Added to Cart",
        description: `Item has been added to your cart.`,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        // Clear all localStorage and try again
        localStorage.clear();
        try {
          localStorage.setItem('cart', JSON.stringify([item]));
          toast({
            title: "Storage Cleared and Item Added",
            description: "Browser storage was full. We cleared it and added your item.",
            variant: "destructive",
          });
        } catch {
          toast({
            title: "Unable to Add to Cart",
            description: "Please close some browser tabs and try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error Adding to Cart",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddOriginalToCart = () => {
    if (!artwork || !artwork.originalAvailable || artwork.originalSold) return;
    
    const item: CartItem = {
      id: `${artwork.id}-original`,
      artworkId: artwork.id,
      type: 'original',
      quantity: 1,
      unitPrice: parseFloat(artwork.originalPrice || '0'),
    };
    
    addToCart(item);
  };

  const handleAddPrintToCart = () => {
    if (!artwork || selectedPrintOption === null || !artwork.printOptions) return;
    
    const printOption = artwork.printOptions[selectedPrintOption];
    const item: CartItem = {
      id: `${artwork.id}-print-${selectedPrintOption}`,
      artworkId: artwork.id,
      type: 'print',
      printSize: printOption.size,
      quantity: printQuantity,
      unitPrice: printOption.price,
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
            <p className="text-gray-300">The artwork you're looking for doesn't exist.</p>
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


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Artwork Images */}
          <div className="space-y-4">
            <div 
              className="relative bg-navy-800 rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => {
                setIsImagePopupOpen(true);
                setImageZoom(1);
                setImageDrag({ x: 0, y: 0 });
              }}
            >
              <img 
                src={getImageUrl(artwork.images?.[0] || '')}
                alt={artwork.title}
                className="w-full h-auto max-h-[80vh] object-contain transition-opacity group-hover:opacity-90"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-navy-900 bg-opacity-80 p-2 rounded-full">
                  <ZoomIn className="w-6 h-6 text-white" />
                </div>
              </div>
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
                <div className="prose prose-invert max-w-none">
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
      
      <Footer 
        showProductNavigation={true}
        previousProduct={previousArtwork ? { id: previousArtwork.id, title: previousArtwork.title, slug: previousArtwork.slug } : null}
        nextProduct={nextArtwork ? { id: nextArtwork.id, title: nextArtwork.title, slug: nextArtwork.slug } : null}
        onNavigateToProduct={(slug) => setLocation(`/artwork/${slug}`)}
      />

      {/* Image Popup Dialog */}
      <Dialog open={isImagePopupOpen} onOpenChange={setIsImagePopupOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] bg-black border-none p-0 overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsImagePopupOpen(false)}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
            >
              <X className="w-4 h-4" />
            </Button>
            
            {/* Zoom Controls */}
            <div className="absolute top-4 left-4 z-10 flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newIndex = Math.max(0, currentZoomIndex - 1);
                  setImageZoom(zoomLevels[newIndex]);
                  setImageDrag({ x: 0, y: 0 });
                }}
                disabled={currentZoomIndex <= 0}
                className="bg-black bg-opacity-50 text-white hover:bg-opacity-70 disabled:opacity-30"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newIndex = Math.min(zoomLevels.length - 1, currentZoomIndex + 1);
                  setImageZoom(zoomLevels[newIndex]);
                  setImageDrag({ x: 0, y: 0 });
                }}
                disabled={currentZoomIndex >= zoomLevels.length - 1}
                className="bg-black bg-opacity-50 text-white hover:bg-opacity-70 disabled:opacity-30"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setImageZoom(1);
                  setImageDrag({ x: 0, y: 0 });
                }}
                className="bg-black bg-opacity-50 text-white hover:bg-opacity-70 text-xs px-2"
              >
                Reset
              </Button>
            </div>

            {/* Image */}
            <div 
              className="overflow-hidden max-w-full max-h-full p-4"
              style={{ 
                cursor: imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
              onMouseDown={(e) => {
                if (imageZoom > 1) {
                  setIsDragging(true);
                  setDragStart({ x: e.clientX - imageDrag.x, y: e.clientY - imageDrag.y });
                  e.preventDefault();
                }
              }}
              onMouseMove={(e) => {
                if (isDragging && imageZoom > 1) {
                  setImageDrag({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y
                  });
                }
              }}
              onMouseUp={() => {
                setIsDragging(false);
              }}
              onMouseLeave={() => {
                setIsDragging(false);
              }}
            >
              <img 
                src={getImageUrl(artwork?.images?.[0] || '')}
                alt={artwork?.title}
                className="max-w-none h-auto select-none"
                style={{ 
                  transform: `scale(${imageZoom}) translate(${imageDrag.x}px, ${imageDrag.y}px)`,
                  transformOrigin: 'center',
                  transition: isDragging ? 'none' : 'transform 0.2s ease-in-out',
                  maxWidth: imageZoom === 1 ? '100%' : 'none',
                  maxHeight: imageZoom === 1 ? '85vh' : 'none'
                }}
                draggable={false}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
