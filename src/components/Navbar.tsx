
import { Button } from "@/components/ui/button"
import { ThemeToggle } from './ThemeToggle'
import { Upload, Users, UserCheck, FileText, BarChart3 } from "lucide-react"


interface NavbarProps {
  onBackToUpload: () => void;
  onShowUpload: () => void;
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export function Navbar({ 
  onBackToUpload,
  onShowUpload,
  currentTab,
  onTabChange
}: NavbarProps) {
  const navItems = [
    { id: 'files', label: 'Anasayfa', icon: FileText },
    { id: 'customers', label: 'Müşteriler', icon: Users },
    { id: 'account-managers', label: 'Account Managers', icon: UserCheck },
    { id: 'overview', label: 'Dashboard', icon: BarChart3 },
  ];

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">AppSamurai Dashboard</h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentTab === item.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onTabChange(item.id)}
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={onShowUpload}>
              <Upload className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Upload</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onBackToUpload}>
              <span className="hidden md:inline">Back</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
