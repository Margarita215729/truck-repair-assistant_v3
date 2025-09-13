import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";
import { VisuallyHidden } from "./visually-hidden";

interface AccessibleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  hideTitle?: boolean;
  hideDescription?: boolean;
}

export function AccessibleDialog({
  open,
  onOpenChange,
  title,
  description = "Dialog content",
  children,
  className,
  hideTitle = false,
  hideDescription = false
}: AccessibleDialogProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={className}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        {hideTitle ? (
          <VisuallyHidden>
            <DialogTitle id={titleId}>
              {title}
            </DialogTitle>
          </VisuallyHidden>
        ) : (
          <DialogHeader>
            <DialogTitle id={titleId}>
              {title}
            </DialogTitle>
            {!hideDescription && (
              <DialogDescription id={descriptionId}>
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}
        
        {hideTitle && !hideDescription && (
          <DialogHeader>
            <DialogDescription id={descriptionId}>
              {description}
            </DialogDescription>
          </DialogHeader>
        )}
        
        {hideTitle && hideDescription && (
          <VisuallyHidden>
            <DialogDescription id={descriptionId}>
              {description}
            </DialogDescription>
          </VisuallyHidden>
        )}
        
        {children}
      </DialogContent>
    </Dialog>
  );
}