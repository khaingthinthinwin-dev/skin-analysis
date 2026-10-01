import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { CreateCategoryInput } from '../services/masterData.service';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const formSchema = z.object({
  name: z.string().max(120).optional(),
  slug: z
    .union([
      z.literal(''),
      z.string().regex(SLUG_PATTERN, 'Lowercase letters, numbers and hyphens only'),
    ])
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

const schema = formSchema.superRefine((values, ctx) => {
  if (!values.name || values.name.trim().length === 0) {
    ctx.addIssue({ code: 'custom', path: ['name'], message: 'Name is required' });
  }
});

function buildPayload(values: FormValues): CreateCategoryInput {
  return {
    name: values.name?.trim() ?? '',
    ...(values.slug ? { slug: values.slug } : {}),
  };
}

const EMPTY_VALUES: FormValues = {
  name: '',
  slug: '',
};

interface MasterDataFormDialogProps {
  open: boolean;
  isLoading?: boolean;
  onSubmit: (input: CreateCategoryInput) => void;
  onClose: () => void;
}

export function MasterDataFormDialog({
  open,
  isLoading = false,
  onSubmit,
  onClose,
}: MasterDataFormDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset(EMPTY_VALUES);
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Category</DialogTitle>
          <DialogDescription>
            Add a product category to the catalogue tree. Leave the slug empty to generate it from
            the name.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => onSubmit(buildPayload(values)))}
            className="space-y-5"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Lipstick" className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="lipstick" className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Category'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
