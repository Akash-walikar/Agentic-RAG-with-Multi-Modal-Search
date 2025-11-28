import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

interface SidebarProps {
  onNewChat: () => void;
}

export function Sidebar({ onNewChat }: SidebarProps) {

  return (
    <div className="flex flex-col h-full w-64 bg-muted/30 border-r border-border shrink-0">
      <div className="p-3 border-b border-border">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <PlusCircle className="h-4 w-4" />
          New Chat
        </Button>
      </div>
    </div>
  );
}

