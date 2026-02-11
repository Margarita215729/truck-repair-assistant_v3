import React, { useState, useMemo } from 'react';
import { entities } from '@/services/entityService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  Search,
  Trash2,
  Clock,
  Truck,
  ChevronRight,
  Plus,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * Chat history sidebar for Diagnostics page.
 * Shows all saved conversations grouped by date, with search and delete.
 */
export default function ChatHistory({ open, onClose, onSelectChat, activeConversationId, onNewChat }) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch all user conversations
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => entities.Conversation.list('-updated_at', 200),
    enabled: open,
    staleTime: 10_000,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Conversation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(t('diagnostics.chatDeleted') || 'Chat deleted');
    },
    onError: () => toast.error('Failed to delete chat'),
  });

  // Filter conversations by search
  const filtered = useMemo(() => {
    if (!searchQuery) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c =>
      c.title?.toLowerCase().includes(q) ||
      c.truck_make?.toLowerCase().includes(q) ||
      c.truck_model?.toLowerCase().includes(q) ||
      c.error_codes?.some(code => code.toLowerCase().includes(q)) ||
      c.symptoms?.some(s => s.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  // Group by date
  const groups = useMemo(() => {
    const result = [];
    const today = [];
    const yesterday = [];
    const thisWeek = [];
    const thisMonth = [];
    const older = [];

    for (const c of filtered) {
      const d = new Date(c.updated_at || c.created_at);
      if (isToday(d)) today.push(c);
      else if (isYesterday(d)) yesterday.push(c);
      else if (isThisWeek(d)) thisWeek.push(c);
      else if (isThisMonth(d)) thisMonth.push(c);
      else older.push(c);
    }

    if (today.length) result.push({ label: t('diagnostics.today') || 'Today', chats: today });
    if (yesterday.length) result.push({ label: t('diagnostics.yesterday') || 'Yesterday', chats: yesterday });
    if (thisWeek.length) result.push({ label: t('diagnostics.thisWeek') || 'This Week', chats: thisWeek });
    if (thisMonth.length) result.push({ label: t('diagnostics.thisMonth') || 'This Month', chats: thisMonth });
    if (older.length) result.push({ label: t('diagnostics.older') || 'Older', chats: older });

    return result;
  }, [filtered, t]);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm(t('diagnostics.deleteChatConfirm') || 'Delete this chat?')) {
      deleteMutation.mutate(id);
    }
  };

  const getMessagePreview = (conv) => {
    const msgs = conv.messages;
    if (!msgs || !Array.isArray(msgs) || msgs.length === 0) return 'Empty conversation';
    // Find last user message for preview
    const lastUser = [...msgs].reverse().find(m => m.role === 'user');
    if (lastUser) {
      const text = lastUser.content || lastUser.text || '';
      return text.length > 80 ? text.substring(0, 80) + '...' : text;
    }
    return `${msgs.length} messages`;
  };

  const getMessageCount = (conv) => {
    return Array.isArray(conv.messages) ? conv.messages.length : 0;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-[#0d0d0d] border-r border-white/10 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-orange-500" />
                  {t('diagnostics.chatHistory') || 'Chat History'}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <Button
                onClick={() => { onNewChat(); onClose(); }}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 mb-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('diagnostics.newChat') || 'New Chat'}
              </Button>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('diagnostics.searchChats') || 'Search chats...'}
                  className="pl-9 h-9 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/40"
                />
              </div>
            </div>

            {/* Chat list */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                    <p className="text-sm text-white/40">{t('common.loading') || 'Loading...'}</p>
                  </div>
                ) : groups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <MessageSquare className="w-12 h-12 text-white/10 mb-3" />
                    <p className="text-sm text-white/40">
                      {searchQuery
                        ? (t('diagnostics.noChatsFound') || 'No chats found')
                        : (t('diagnostics.noChatsYet') || 'No conversations yet')}
                    </p>
                    {!searchQuery && (
                      <p className="text-xs text-white/25 mt-1">
                        {t('diagnostics.startChatHint') || 'Start a diagnostic session to see it here'}
                      </p>
                    )}
                  </div>
                ) : (
                  groups.map((group) => (
                    <div key={group.label} className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 px-2 mb-1.5">
                        {group.label}
                      </p>
                      <div className="space-y-1">
                        {group.chats.map((conv) => {
                          const isActive = activeConversationId === conv.id;
                          const msgCount = getMessageCount(conv);
                          return (
                            <motion.button
                              key={conv.id}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => { onSelectChat(conv); onClose(); }}
                              className={`w-full text-left p-3 rounded-xl transition-all group ${
                                isActive
                                  ? 'bg-orange-500/15 border border-orange-500/30'
                                  : 'bg-white/[0.03] hover:bg-white/[0.07] border border-transparent hover:border-white/10'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${isActive ? 'text-orange-300' : 'text-white/90'}`}>
                                    {conv.title || 'Untitled Chat'}
                                  </p>
                                  
                                  {/* Truck info */}
                                  {(conv.truck_make || conv.truck_model) && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Truck className="w-3 h-3 text-white/30" />
                                      <span className="text-[11px] text-white/40 truncate">
                                        {[conv.truck_year, conv.truck_make, conv.truck_model].filter(Boolean).join(' ')}
                                      </span>
                                    </div>
                                  )}

                                  {/* Preview */}
                                  <p className="text-xs text-white/30 truncate mt-1">
                                    {getMessagePreview(conv)}
                                  </p>

                                  {/* Meta: date + message count + error codes */}
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span className="text-[10px] text-white/25 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatDistanceToNow(new Date(conv.updated_at || conv.created_at), { addSuffix: true })}
                                    </span>
                                    {msgCount > 0 && (
                                      <span className="text-[10px] text-white/25">
                                        {msgCount} msg{msgCount !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                    {conv.error_codes?.length > 0 && (
                                      <Badge className="bg-red-500/10 text-red-400/60 border-red-500/20 text-[9px] px-1 py-0 h-4">
                                        <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                                        {conv.error_codes.length} DTC
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {/* Delete button */}
                                <button
                                  onClick={(e) => handleDelete(e, conv.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Footer stats */}
            {conversations.length > 0 && (
              <div className="p-3 border-t border-white/5 shrink-0">
                <p className="text-[10px] text-white/20 text-center">
                  {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
