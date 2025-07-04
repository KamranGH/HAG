
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, GripVertical, Image as ImageIcon, ShoppingCart, Calendar, User, MapPin, Package, CreditCard, MessageSquare, Mail } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, type DropResult } from "react-beautiful-dnd";
import AddArtworkModal from "./AddArtworkModal";
import type { Artwork, ContactMessage, NewsletterSubscription } from "@shared/schema";

interface AdminPanelProps {
  onExitAdmin: () => void;
}

interface OrderWithCustomer {
  id: number;
  totalAmount: string;
  shippingCost: string;
  subtotal: string;
  status: string;
  createdAt: string;
  specialInstructions?: string;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
    country: string;
    createdAt: Date;
    updatedAt: Date;
  };
  itemCount: number;
}

export default function AdminPanel({ onExitAdmin }: AdminPanelProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  const { toast } = useToast();

  const { data: artworks, isLoading: artworksLoading } = useQuery<Artwork[]>({
    queryKey: ['/api/artworks'],
  });

  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery<NewsletterSubscription[]>({
    queryKey: ['/api/admin/newsletter-subscriptions'],
  });

  const { data: contactMessages, isLoading: contactLoading } = useQuery<ContactMessage[]>({
    queryKey: ['/api/admin/contact-messages'],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<OrderWithCustomer[]>({
    queryKey: ['/api/admin/orders'],
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

  const unsubscribeSubscriptionMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest("DELETE", `/api/admin/newsletter-subscriptions/${encodeURIComponent(email)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/newsletter-subscriptions'] });
      toast({
        title: "Subscription Removed",
        description: "The email has been unsubscribed from the collector's list.",
      });
    },
    onError: (error) => {
      toast({
        title: "Remove Failed",
        description: error.message || "Failed to remove subscription.",
        variant: "destructive",
      });
    },
  });

  const reorderArtworksMutation = useMutation({
    mutationFn: async (artworkIds: number[]) => {
      await apiRequest("POST", "/api/artworks/reorder", { artworkIds });
    },
    onSuccess: (_, artworkIds) => {
      queryClient.setQueryData(['/api/artworks'], (old: any[]) => {
        if (!old) return old;
        const artworkMap = new Map(old.map(artwork => [artwork.id, artwork]));
        return artworkIds.map(id => artworkMap.get(id)).filter(Boolean);
      });
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
      queryClient.invalidateQueries({ queryKey: ['/api/artworks'] });
    },
  });

  const handleDelete = (artwork: Artwork) => {
    if (confirm(`Are you sure you want to delete "${artwork.title}"? This action cannot be undone.`)) {
      deleteArtworkMutation.mutate(artwork.id);
    }
  };

  const handleUnsubscribe = (email: string) => {
    if (confirm(`Are you sure you want to unsubscribe ${email} from the collector's list?`)) {
      unsubscribeSubscriptionMutation.mutate(email);
    }
  };



  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !artworks) return;

    const items = Array.from(artworks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const artworkIds = items.map(item => item.id);
    reorderArtworksMutation.mutate(artworkIds);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-white">Admin Dashboard</h1>
        <Button onClick={onExitAdmin} variant="outline" className="text-white border-navy-600">
          Exit Admin
        </Button>
      </div>

      <Tabs defaultValue="artworks" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-navy-800 mb-6">
          <TabsTrigger value="artworks" className="text-white">Artworks</TabsTrigger>
          <TabsTrigger value="orders" className="text-white">Orders</TabsTrigger>
          <TabsTrigger value="subscription" className="text-white">Subscription</TabsTrigger>
          <TabsTrigger value="contact" className="text-white">Contact</TabsTrigger>
        </TabsList>

        <TabsContent value="artworks">
          <Card className="bg-navy-800 border-navy-700">
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
              {artworksLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-navy-700 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-navy-600 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-navy-600 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : artworks && artworks.length > 0 ? (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="artworks">
                    {(provided) => (
                      <div 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3"
                      >
                        {artworks.map((artwork, index) => (
                          <Draggable 
                            key={artwork.id} 
                            draggableId={artwork.id.toString()} 
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center justify-between bg-navy-700 rounded-lg p-4 transition-colors ${
                                  snapshot.isDragging ? 'bg-navy-600 shadow-lg' : 'hover:bg-navy-600'
                                }`}
                              >
                                <div className="flex items-center space-x-4">
                                  <div 
                                    {...provided.dragHandleProps}
                                    className="cursor-grab active:cursor-grabbing"
                                  >
                                    <GripVertical className="w-4 h-4 text-gray-400" />
                                  </div>
                                  
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
                                        {artwork.printOptions && (artwork.printOptions as any[])?.length > 0 && (
                                          <Badge variant="secondary" className="text-xs">
                                            {(artwork.printOptions as any[]).length} Print Options
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
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No artworks found. Add your first piece to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card className="bg-navy-800 border-navy-700">
            <CardHeader>
              <CardTitle className="text-xl font-serif font-semibold text-white flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Order Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-navy-700 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-navy-600 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-navy-600 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : orders && orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-navy-700 rounded-lg p-6 border border-navy-600">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-white text-lg">Order #{order.id}</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white text-lg">${order.totalAmount}</p>
                          <Badge 
                            variant={order.status === 'completed' ? 'default' : 'secondary'}
                            className="mt-1"
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Customer Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-navy-800 rounded-lg p-4">
                          <h4 className="flex items-center text-white font-medium mb-2">
                            <User className="w-4 h-4 mr-2" />
                            Customer Details
                          </h4>
                          <p className="text-white">{order.customer.firstName} {order.customer.lastName}</p>
                          <p className="text-gray-300 text-sm">{order.customer.email}</p>
                          {order.customer.phone && (
                            <p className="text-gray-300 text-sm">{order.customer.phone}</p>
                          )}
                        </div>
                        
                        <div className="bg-navy-800 rounded-lg p-4">
                          <h4 className="flex items-center text-white font-medium mb-2">
                            <MapPin className="w-4 h-4 mr-2" />
                            Shipping Address
                          </h4>
                          {order.customer.address ? (
                            <>
                              <p className="text-gray-300 text-sm">{order.customer.address}</p>
                              <p className="text-gray-300 text-sm">
                                {order.customer.city}, {order.customer.zipCode}
                              </p>
                              <p className="text-gray-300 text-sm">{order.customer.country}</p>
                            </>
                          ) : (
                            <p className="text-gray-400 text-sm italic">No shipping address provided</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Order Summary */}
                      <div className="bg-navy-800 rounded-lg p-4 mb-4">
                        <h4 className="flex items-center text-white font-medium mb-2">
                          <Package className="w-4 h-4 mr-2" />
                          Order Summary
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-300">{order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</span>
                            <span className="text-gray-300">${order.subtotal}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Shipping</span>
                            <span className="text-gray-300">${order.shippingCost}</span>
                          </div>
                          <div className="border-t border-navy-600 pt-1 flex justify-between font-medium">
                            <span className="text-white">Total</span>
                            <span className="text-white">${order.totalAmount}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Special Instructions */}
                      {order.specialInstructions && (
                        <div className="bg-navy-800 rounded-lg p-4">
                          <h4 className="flex items-center text-white font-medium mb-2">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Special Instructions
                          </h4>
                          <p className="text-gray-300 text-sm">{order.specialInstructions}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No orders found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <Card className="bg-navy-800 border-navy-700">
            <CardHeader>
              <CardTitle className="text-xl font-serif font-semibold text-white flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Collector's List
                {subscriptions && subscriptions.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {subscriptions.length} subscriber{subscriptions.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-navy-700 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-navy-600 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-navy-600 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : subscriptions && subscriptions.length > 0 ? (
                <div className="space-y-2">
                  {subscriptions.map((subscription) => (
                    <div key={subscription.id} className="flex justify-between items-center bg-navy-700 rounded-lg p-3">
                      <div>
                        <p className="font-medium text-white">{subscription.email}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnsubscribe(subscription.email)}
                        disabled={unsubscribeSubscriptionMutation.isPending}
                        className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No email subscriptions found.</p>
                  <p className="text-sm mt-1">Visitors can join the collector's list from the footer.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card className="bg-navy-800 border-navy-700">
            <CardHeader>
              <CardTitle className="text-xl font-serif font-semibold text-white flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Contact Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contactLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-navy-700 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-navy-600 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-navy-600 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : contactMessages && contactMessages.length > 0 ? (
                <div className="space-y-4">
                  {contactMessages.map((message) => (
                    <div key={message.id} className="bg-navy-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-white">{message.name}</h3>
                          <p className="text-sm text-gray-400">{message.email}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(message.createdAt.toString())}
                        </p>
                      </div>
                      <h4 className="font-medium text-white mb-2">{message.subject}</h4>
                      <p className="text-sm text-gray-300">{message.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No contact messages found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

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
