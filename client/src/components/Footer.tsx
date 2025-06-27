import { Instagram, Facebook, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Settings } from "lucide-react";
import type { SocialMediaSetting } from "@shared/schema";

interface FooterProps {
  isAdminMode?: boolean;
}

export default function Footer({ isAdminMode = false }: FooterProps) {
  const [email, setEmail] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();

  // Social media settings
  const { data: socialSettings } = useQuery<SocialMediaSetting[]>({
    queryKey: ['/api/social-media'],
  });

  // Create a map for easy access with defaults
  const socialMap = socialSettings?.reduce((acc, setting) => {
    acc[setting.platform] = setting;
    return acc;
  }, {} as Record<string, SocialMediaSetting>) || {};

  const defaultSettings = {
    instagram: { url: '#', isVisible: true },
    facebook: { url: '#', isVisible: true },
    x: { url: '#', isVisible: true },
  };

  const getSetting = (platform: string) => 
    socialMap[platform] || defaultSettings[platform as keyof typeof defaultSettings];

  // Mutation for updating social media settings
  const updateSocialMutation = useMutation({
    mutationFn: async ({ platform, setting }: { platform: string; setting: any }) => {
      return await apiRequest("PUT", `/api/social-media/${platform}`, setting);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-media'] });
      toast({
        title: "Settings Updated",
        description: "Social media settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update social media settings.",
        variant: "destructive",
      });
    },
  });

  const handleSocialUpdate = (platform: string, field: string, value: any) => {
    const currentSetting = getSetting(platform);
    updateSocialMutation.mutate({
      platform,
      setting: { ...currentSetting, [field]: value }
    });
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    // In a real app, this would send to your email service
    toast({
      title: "Successfully subscribed!",
      description: "You'll be the first to know about new artworks.",
    });
    setEmail("");
  };

  return (
    <footer className="border-t border-navy-700 py-12 mt-16 bg-navy-900">
      <div className="container mx-auto px-4">
        {/* Newsletter Signup */}
        <div className="text-center mb-8 max-w-md mx-auto">
          <h3 className="gallery-logo text-lg font-medium text-white mb-2">
            Join the Collector's List
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Be the first to know about new original paintings and prints
          </p>
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-navy-800 border-navy-600 text-white placeholder-gray-400 focus:border-primary"
            />
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/90 text-white px-6"
            >
              Subscribe
            </Button>
          </form>
        </div>

        {/* Footer Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-navy-700">
          <div className="text-gray-400 text-sm mb-4 md:mb-0">
            © 2024 Hana's Art Gallery. All rights reserved.
          </div>
          <div className="flex items-center space-x-4">
            {/* Social Media Links */}
            <div className="flex space-x-4">
              {getSetting('instagram').isVisible && (
                <a 
                  href={getSetting('instagram').url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {getSetting('facebook').isVisible && (
                <a 
                  href={getSetting('facebook').url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {getSetting('x').isVisible && (
                <a 
                  href={getSetting('x').url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </a>
              )}
            </div>
            
            {/* Admin Settings */}
            {isAdminMode && (
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-navy-800 border-navy-700 text-white">
                  <DialogHeader>
                    <DialogTitle>Social Media Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {['instagram', 'facebook', 'x'].map((platform) => (
                      <div key={platform} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="capitalize font-medium">{platform === 'x' ? 'X (Twitter)' : platform}</Label>
                          <Switch
                            checked={getSetting(platform).isVisible}
                            onCheckedChange={(checked) => handleSocialUpdate(platform, 'isVisible', checked)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${platform}-url`} className="text-sm text-gray-400">URL</Label>
                          <Input
                            id={`${platform}-url`}
                            value={getSetting(platform).url || ''}
                            onChange={(e) => handleSocialUpdate(platform, 'url', e.target.value)}
                            placeholder={`https://${platform === 'x' ? 'x.com' : platform}.com/username`}
                            className="mt-1 bg-navy-700 border-navy-600 text-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
