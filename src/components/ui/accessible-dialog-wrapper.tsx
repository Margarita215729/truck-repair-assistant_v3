import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";
import { VisuallyHidden } from "./visually-hidden";

/**
 * A wrapper component that ensures DialogContent always has proper accessibility attributes.
 * Use this instead of raw DialogContent to avoid accessibility errors.
 */

interface AccessibleDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogContent> {
  title?: string;
  description?: string;
  hideTitle?: boolean;
  hideDescription?: boolean;
}

export const AccessibleDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  AccessibleDialogContentProps
>(({ 
  title = "Dialog", 
  description = "Dialog content", 
  hideTitle = false, 
  hideDescription = false, 
  children, 
  ...props 
}, ref) => {
  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <DialogContent 
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      {...props}
    >
      {/* Always include title and description for accessibility */}
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
      
      {hideDescription && (
        <VisuallyHidden>
          <DialogDescription id={descriptionId}>
            {description}
          </DialogDescription>
        </VisuallyHidden>
      )}
      
      {children}
    </DialogContent>
  );
});

AccessibleDialogContent.displayName = "AccessibleDialogContent";

/**
 * Example usage:
 * 
 * <Dialog open={open} onOpenChange={setOpen}>
 *   <AccessibleDialogContent 
 *     title="Confirmation" 
 *     description="Are you sure you want to continue?"
 *   >
 *     <p>Dialog content here</p>
 *   </AccessibleDialogContent>
 * </Dialog>
 * 
 * Or with hidden title:
 * 
 * <Dialog open={open} onOpenChange={setOpen}>
 *   <AccessibleDialogContent 
 *     title="Screen reader title" 
 *     description="Screen reader description"
 *     hideTitle={true}
 *     hideDescription={true}
 *   >
 *     <h2>Visual Title</h2>
 *     <p>Dialog content here</p>
 *   </AccessibleDialogContent>
 * </Dialog>
 */