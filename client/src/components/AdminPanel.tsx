import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import AddArtworkModal from "./AddArtworkModal";

export default function AdminPanel() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
          <p className="text-gray-300 text-sm">
            Manage your gallery collection, add new pieces, edit existing artworks, and control display order.
          </p>
        </CardContent>
      </Card>

      <AddArtworkModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </>
  );
}
