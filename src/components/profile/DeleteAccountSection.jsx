import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { deleteAccount } from '@/services/accountDeletionService';

export default function DeleteAccountSection() {
  const { t } = useLanguage();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      console.log('[DeleteAccount] Starting deletion process...');
      await deleteAccount();
      console.log('[DeleteAccount] Deletion successful');
      setDialogOpen(false);
      queryClient.clear();
      await logout();
      toast.success(t('profile.accountDeleted') || 'Your account has been permanently deleted.');
      navigate('/Login', { replace: true });
    } catch (err) {
      console.error('[DeleteAccount] Account deletion failed:', {
        message: err.message,
        stack: err.stack,
        error: err,
        stringified: JSON.stringify(err, Object.getOwnPropertyNames(err))
      });
      toast.error(
        err.message || t('profile.accountDeleteFailed') || 'Could not delete account. Please try again.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="p-6 bg-red-500/5 border-red-500/20">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
        <Trash2 className="w-5 h-5 text-red-400" />
        {t('profile.deleteAccount') || 'Delete Account'}
      </h3>
      <p className="text-sm text-white/50 mb-4">
        {t('profile.deleteAccountDesc') ||
          'Permanently remove your account and all associated data from Truck Repair Assistant.'}
      </p>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            disabled={isDeleting}
          >
            {t('profile.deleteAccount') || 'Delete Account'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-[#1a1a1a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {t('profile.deleteAccountConfirmTitle') || 'Delete your account?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {t('profile.deleteAccountConfirmBody') ||
                'This permanently deletes your account and associated data. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              {t('common.cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('profile.deletingAccount') || 'Deleting...'}
                </>
              ) : (
                t('profile.deleteAccountConfirmAction') || 'Delete permanently'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
