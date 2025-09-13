import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { VisuallyHidden } from './ui/visually-hidden';
import { Button } from './ui/button';

interface ExampleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExampleAccessibleDialog({ open, onOpenChange }: ExampleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Option 1: Visible title and description */}
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>
            This dialog has a visible title and description for accessibility.
          </DialogDescription>
        </DialogHeader>
        
        {/* Dialog content */}
        <div className="space-y-4">
          <p>Your dialog content goes here.</p>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Alternative: Hidden title and description for dialogs that don't need visible titles
export function ExampleAccessibleDialogWithHiddenTitle({ open, onOpenChange }: ExampleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Option 2: Hidden title and description using VisuallyHidden */}
        <VisuallyHidden>
          <DialogTitle>Screen Reader Title</DialogTitle>
          <DialogDescription>
            This title and description are hidden visually but available to screen readers.
          </DialogDescription>
        </VisuallyHidden>
        
        {/* Dialog content */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Visual Title (not DialogTitle)</h2>
          <p>Your dialog content goes here.</p>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}