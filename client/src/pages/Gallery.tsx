import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArtworkCard from "@/components/ArtworkCard";
import AdminPanel from "@/components/AdminPanel";
import { useAuth } from "@/hooks/useAuth";
import type { Artwork } from "@shared/schema";

export default function Gallery() {
  const { isAuthenticated } = useAuth();
  
  const { data: artworks, isLoading, error } = useQuery<Artwork[]>({
    queryKey: ["/api/artworks"],
  });

  if (error) {
    return (
      <div className="min-h-screen bg-navy-900 text-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-serif mb-4">Error Loading Gallery</h2>
            <p className="text-gray-300">Unable to load artworks. Please try again later.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {isAuthenticated && <AdminPanel />}
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-navy-800 rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-artwork bg-navy-700"></div>
                <div className="p-4 space-y-2">
                  <div className="h-6 bg-navy-700 rounded"></div>
                  <div className="h-4 bg-navy-700 rounded w-3/4"></div>
                  <div className="h-4 bg-navy-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : artworks && artworks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {artworks.map((artwork) => (
              <ArtworkCard key={artwork.id} artwork={artwork} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-serif font-medium mb-4">No Artworks Available</h2>
            <p className="text-gray-300">
              {isAuthenticated 
                ? "Start by adding your first artwork to the gallery." 
                : "Please check back later for new artworks."
              }
            </p>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
