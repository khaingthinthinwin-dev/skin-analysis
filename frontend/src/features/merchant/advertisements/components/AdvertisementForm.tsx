import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateAdInput } from '../services/advertisement.service';

interface AdvertisementFormProps {
  onSubmit: (data: CreateAdInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AdvertisementForm({ onSubmit, onCancel, isLoading }: AdvertisementFormProps) {
  const [form, setForm] = useState<CreateAdInput>({
    title: '',
    announcementMessage: '',
    content: '',
    paymentAmount: 0,
    startsAt: '',
    expiresAt: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Create Ad Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Hero Banner: Vitamin C Serum"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Announcement Message</label>
            <Input
              value={form.announcementMessage}
              onChange={(e) => setForm({ ...form, announcementMessage: e.target.value })}
              placeholder="e.g. Shop Now - 20% Off!"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <Input
              value={form.content ?? ''}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Ad description"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Amount ($)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.paymentAmount || ''}
              onChange={(e) => setForm({ ...form, paymentAmount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Submit Ad Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
