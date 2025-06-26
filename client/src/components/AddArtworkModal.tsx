import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertArtworkSchema } from "@shared/schema";
import { z } from "zod";
import ImageUpload from "./ImageUpload";
import { Plus, Trash2 } from "lucide-react";

const formSchema = insertArtworkSchema.extend({
  printOptions: z.array(z.object({
    size: z.string().min(1, "Size is required"),
    price: z.number().min(0, "Price must be positive"),
  })).default([]),
});

type FormData = z.infer<typeof formSchema>;

interface AddArtworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddArtworkModal({ isOpen, onClose }: AddArtworkModalProps) {
  const [printOptions, setPrintOptions] = useState([{ size: "", price: 0 }]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      year: new Date().getFullYear(),
      medium: "",
      originalDimensions: "",
      originalPrice: "0",
      originalAvailable: true,
      originalSold: false,
      printsAvailable: true,
      printOptions: [],
      images: [],
      displayOrder: 0,
    },
  });

  const createArtworkMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/artworks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artworks"] });
      toast({
        title: "Success",
        description: "Artwork created successfully!",
      });
      onClose();
      form.reset();
      setPrintOptions([{ size: "", price: 0 }]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create artwork",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: FormData) => {
    const formattedData = {
      ...data,
      printOptions: printOptions.filter(option => option.size && option.price > 0),
    };
    createArtworkMutation.mutate(formattedData);
  };

  const addPrintOption = () => {
    setPrintOptions([...printOptions, { size: "", price: 0 }]);
  };

  const removePrintOption = (index: number) => {
    setPrintOptions(printOptions.filter((_, i) => i !== index));
  };

  const updatePrintOption = (index: number, field: 'size' | 'price', value: string | number) => {
    const newOptions = [...printOptions];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setPrintOptions(newOptions);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-navy-800 border-navy-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif font-semibold text-white">
            Add New Artwork
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Title</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="bg-navy-700 border-navy-600 text-white focus:border-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      rows={4}
                      className="bg-navy-700 border-navy-600 text-white focus:border-primary resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Year</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        className="bg-navy-700 border-navy-600 text-white focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="medium"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Medium</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Oil on Canvas"
                        className="bg-navy-700 border-navy-600 text-white focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="originalDimensions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Original Dimensions</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder='e.g., 24" × 36"'
                      className="bg-navy-700 border-navy-600 text-white focus:border-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Images</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value || []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="originalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Original Price ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        {...field}
                        className="bg-navy-700 border-navy-600 text-white focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col space-y-4 pt-8">
                <FormField
                  control={form.control}
                  name="originalAvailable"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-navy-600"
                        />
                      </FormControl>
                      <FormLabel className="text-white text-sm">Original Available</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="printsAvailable"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-navy-600"
                        />
                      </FormControl>
                      <FormLabel className="text-white text-sm">Prints Available</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <FormLabel className="text-white">Print Options</FormLabel>
              <div className="space-y-3">
                {printOptions.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      placeholder='Size (e.g., 8" × 12")'
                      value={option.size}
                      onChange={(e) => updatePrintOption(index, 'size', e.target.value)}
                      className="flex-1 bg-navy-700 border-navy-600 text-white focus:border-primary"
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      min="0"
                      step="0.01"
                      value={option.price || ''}
                      onChange={(e) => updatePrintOption(index, 'price', parseFloat(e.target.value) || 0)}
                      className="w-24 bg-navy-700 border-navy-600 text-white focus:border-primary"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePrintOption(index)}
                      className="text-red-400 hover:text-red-300 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addPrintOption}
                className="text-primary hover:text-primary/90"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Print Option
              </Button>
            </div>

            <div className="flex space-x-4 pt-6">
              <Button 
                type="submit" 
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={createArtworkMutation.isPending}
              >
                {createArtworkMutation.isPending ? "Saving..." : "Save Artwork"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1 border-navy-600 text-gray-300 hover:bg-navy-700"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
