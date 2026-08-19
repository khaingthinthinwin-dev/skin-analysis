import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Trash2 } from 'lucide-react';

interface ContentModerationProps {
  flaggedItems?: any[];
  onRemoveItem?: (id: string) => void;
}

export const ContentModeration: React.FC<ContentModerationProps> = ({
  flaggedItems = [],
  onRemoveItem,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          Content Moderation Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        {flaggedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No flagged products or content items requiring moderation.
          </p>
        ) : (
          <div className="space-y-3">
            {flaggedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-card"
              >
                <div>
                  <h4 className="font-medium text-sm">{item.name || item.title}</h4>
                  <p className="text-xs text-muted-foreground">Reason: {item.flagReason || 'Reported'}</p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => onRemoveItem?.(item.id)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Deactivate
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
