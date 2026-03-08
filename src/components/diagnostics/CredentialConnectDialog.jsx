import React, { useState } from 'react';
import { Loader2, KeyRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { connectProviderWithCredentials } from '@/services/telematics/telematicsService';

const FIELD_LABELS = {
  database: 'Database',
  userName: 'Username',
  password: 'Password',
  server: 'Server (optional)',
  apiKey: 'API Key',
  apiSecret: 'API Secret',
};

/**
 * CredentialConnectDialog
 *
 * Modal that collects credentials for providers that use credential-based auth
 * (Geotab, Verizon Connect, Omnitracs) and submits them via the
 * credential-connect endpoint.
 *
 * Props:
 *   open – boolean
 *   onOpenChange(open) – toggle
 *   providerMeta – { provider, requiredFields, optionalFields } from connectProvider()
 *   onSuccess() – called after successful connection
 */
export default function CredentialConnectDialog({ open, onOpenChange, providerMeta, onSuccess }) {
  const [fields, setFields] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!providerMeta) return null;

  const { provider, requiredFields = [], optionalFields = [] } = providerMeta;
  const allFields = [...requiredFields, ...optionalFields];

  const handleChange = (name, value) => {
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required
    for (const f of requiredFields) {
      if (!fields[f]?.trim()) {
        toast.error(`${FIELD_LABELS[f] || f} is required`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await connectProviderWithCredentials(provider, fields);
      toast.success(`${provider} connected — ${result.vehicles_found || 0} vehicle(s) found`);
      onOpenChange(false);
      setFields({});
      onSuccess?.();
    } catch (err) {
      toast.error('Connection failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#141a1e] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <KeyRound className="w-5 h-5 text-cyan-400" />
            Connect {provider.charAt(0).toUpperCase() + provider.slice(1)}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Enter your credentials to link this telematics provider. They are encrypted and stored securely.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {allFields.map((name) => (
            <div key={name} className="space-y-1.5">
              <Label htmlFor={`cred-${name}`} className="text-white/70 text-sm">
                {FIELD_LABELS[name] || name}
                {requiredFields.includes(name) && <span className="text-red-400 ml-0.5">*</span>}
              </Label>
              <Input
                id={`cred-${name}`}
                type={name.toLowerCase().includes('password') || name.toLowerCase().includes('secret') ? 'password' : 'text'}
                value={fields[name] || ''}
                onChange={(e) => handleChange(name, e.target.value)}
                placeholder={FIELD_LABELS[name] || name}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
                required={requiredFields.includes(name)}
                autoComplete="off"
              />
            </div>
          ))}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-white/50 hover:text-white/80"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
