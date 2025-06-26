import { Link } from "wouter";
import type { Artwork } from "@shared/schema";

interface ArtworkCardProps {
  artwork: Artwork;
}

export default function ArtworkCard({ artwork }: ArtworkCardProps) {
  const getImageUrl = (url: string) => {
    // Fallback to a placeholder if no image
    return url || `https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600`;
  };

  const getPrintPriceRange = () => {
    if (!artwork.printsAvailable || !artwork.printOptions || artwork.printOptions.length === 0) {
      return null;
    }
    
    const prices = artwork.printOptions.map(option => option.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    if (minPrice === maxPrice) {
      return `$${minPrice}`;
    }
    return `$${minPrice} - $${maxPrice}`;
  };

  return (
    <Link href={`/artwork/${artwork.id}`}>
      <div className="group cursor-pointer artwork-card">
        <div className="relative bg-navy-800 rounded-lg overflow-hidden hover:bg-navy-700 transition-all duration-300">
          <div className="relative aspect-artwork">
            {artwork.originalSold && (
              <div className="absolute top-2 right-2 z-10">
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Original is sold
                </span>
              </div>
            )}
            <img 
              src={getImageUrl(artwork.images?.[0] || '')}
              alt={artwork.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-4">
            <h3 className="font-serif text-lg font-medium mb-2 text-white">{artwork.title}</h3>
            <div className="space-y-1 text-sm text-gray-300">
              {artwork.originalAvailable && (
                <div>
                  Original: <span className={`text-white font-medium ${artwork.originalSold ? 'line-through' : ''}`}>
                    ${artwork.originalPrice}
                  </span>
                </div>
              )}
              {artwork.printsAvailable && getPrintPriceRange() && (
                <div>
                  Prints: <span className="text-white font-medium">{getPrintPriceRange()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
