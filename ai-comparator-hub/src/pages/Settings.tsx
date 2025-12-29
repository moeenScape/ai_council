import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sun, Moon, Monitor, Bell, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/contexts/ThemeContext";
import { Theme } from "@/lib/api";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
    { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/app")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to App
        </Button>

        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        <div className="space-y-6">
          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how the app looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label>Theme</Label>
                <RadioGroup
                  value={theme}
                  onValueChange={(value) => setTheme(value as Theme)}
                  className="grid grid-cols-3 gap-4"
                >
                  {themeOptions.map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={option.value}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        theme === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="sr-only"
                      />
                      {option.icon}
                      <span className="text-sm font-medium">{option.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about your account
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Usage alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when approaching quota limits
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy
              </CardTitle>
              <CardDescription>Control your data and privacy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Save chat history</Label>
                  <p className="text-sm text-muted-foreground">
                    Store your conversations for later access
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Help improve the app with anonymous usage data
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Delete all chat history</Label>
                  <p className="text-sm text-muted-foreground">
                    Permanently remove all your conversations
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Delete account</Label>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
