import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AddArtworkModal from "./AddArtworkModal";
import type { Artwork } from "@shared/schema";

export default function AdminPanel() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  const { toast } = useToast();

  const { data: artworks, isLoading } = useQuery<Artwork[]>({
    queryKey: ['/api/artworks'],
  });

  const deleteArtworkMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/artworks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/artworks'] });
      toast({
        title: "Artwork Deleted",
        description: "The artwork has been removed from your gallery.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete artwork.",
        variant: "destructive",
      });
    },
  });

  const reorderArtworksMutation = useMutation({
    mutationFn: async (artworkIds: number[]) => {
      await apiRequest("POST", "/api/artworks/reorder", { artworkIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/artworks'] });
      toast({
        title: "Order Updated",
        description: "Artwork display order has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Reorder Failed",
        description: error.message || "Failed to update artwork order.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (artwork: Artwork) => {
    if (confirm(`Are you sure you want to delete "${artwork.title}"? This action cannot be undone.`)) {
      deleteArtworkMutation.mutate(artwork.id);
    }
  };

  return (
    <>
      <Card className="mb-8 bg-navy-800 border-navy-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-serif font-semibold text-white">
              Artwork Management
            </CardTitle>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Artwork
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 text-sm mb-6">
            Manage your gallery collection, add new pieces, edit existing artworks, and control display order.
          </p>
          
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-navy-700 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-navy-600 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-navy-600 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : artworks && artworks.length > 0 ? (
            <div className="space-y-3">
              {artworks.map((artwork) => (
                <div 
                  key={artwork.id}
                  className="flex items-center justify-between bg-navy-700 rounded-lg p-4 hover:bg-navy-600 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                    
                    <div className="flex items-center space-x-3">
                      {artwork.images && artwork.images.length > 0 ? (
                        <img 
                          src={artwork.images[0]} 
                          alt={artwork.title}
                          className="w-12 h-16 object-cover rounded bg-navy-800"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-navy-800 rounded flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      
                      <div>
                        <h3 className="font-semibold text-white">{artwork.title}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-primary border-primary">
                            ${artwork.originalPrice}
                          </Badge>
                          {artwork.originalSold && (
                            <Badge variant="destructive" className="text-xs">
                              Original Sold
                            </Badge>
                          )}
                          {artwork.printOptions && artwork.printOptions.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {artwork.printOptions.length} Print Options
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingArtwork(artwork)}
                      className="text-white border-navy-500 hover:bg-navy-600"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(artwork)}
                      disabled={deleteArtworkMutation.isPending}
                      className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No artworks found. Add your first piece to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AddArtworkModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
      
      {editingArtwork && (
        <AddArtworkModal 
          isOpen={true}
          onClose={() => setEditingArtwork(null)}
          editingArtwork={editingArtwork}
        />
      )}
    </>
  );
}
