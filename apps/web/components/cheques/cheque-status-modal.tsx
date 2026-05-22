'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  chequesApi,
  Cheque,
  ChequeStatus,
  CHEQUE_STATUS_LABELS,
  formatChequeAmount,
  formatChequeDate,
} from '@/lib/api/cheques';

interface Props {
  open: boolean;
  cheque: Cheque | null;
  onClose: () => void;
  onSuccess: () => void;
}

const VALID_TRANSITIONS: Record<ChequeStatus, ChequeStatus[]> = {
  PORTFOLIO: ['ENDORSED', 'DEPOSITED', 'COLLECTED', 'PAID', 'BOUNCED', 'CANCELLED'],
  ENDORSED: ['COLLECTED', 'BOUNCED', 'CANCELLED'],
  DEPOSITED: ['COLLECTED', 'BOUNCED'],
  COLLECTED: [],
  PAID: [],
  BOUNCED: ['PORTFOLIO'],
  CANCELLED: [],
};

export function ChequeStatusModal({ open, cheque, onClose, onSuccess }: Props) {
  const [status, setStatus] = useState<ChequeStatus>('PORTFOLIO');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && cheque) {
      const validNext = VALID_TRANSITIONS[cheque.status];
      setStatus(validNext[0] ?? cheque.status);
      setNote('');
    }
  }, [open, cheque]);

  if (!open || !cheque) return null;

  const validNextStatuses = VALID_TRANSITIONS[cheque.status];

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await chequesApi.updateStatus(cheque.id, status, note || undefined);
      toast.success(`Durum güncellendi: ${CHEQUE_STATUS_LABELS[status]}`);
      onSuccess();
      onClose();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'İşlem başarısız',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Durum Değiştir</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {cheque.chequeNo} • {formatChequeAmount(cheque.amount, cheque.currency)} •
            Vade: {formatChequeDate(cheque.dueDate)}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
            <p className="text-slate-700">
              Mevcut durum:{' '}
              <span className="font-semibold">{CHEQUE_STATUS_LABELS[cheque.status]}</span>
            </p>
          </div>

          {validNextStatuses.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              ⚠️ Bu durumda durum değişimi yapılamaz (final durum).
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Yeni Durum
                </label>
                <div className="space-y-2">
                  {validNextStatuses.map((s) => (
                    <label
                      key={s}
                      className={`flex items-center gap-3 cursor-pointer border-2 rounded-lg p-3 transition-colors ${
                        status === s
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={status === s}
                        onChange={() => setStatus(s)}
                        className="sr-only"
                      />
                      <span className="font-medium text-sm">
                        {s === 'COLLECTED' && '✅'}
                        {s === 'PAID' && '✅'}
                        {s === 'BOUNCED' && '❌'}
                        {s === 'CANCELLED' && '🚫'}
                        {s === 'ENDORSED' && '🔄'}
                        {s === 'DEPOSITED' && '🏦'}
                        {s === 'PORTFOLIO' && '📋'}
                        {' '}{CHEQUE_STATUS_LABELS[s]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Açıklama / Not
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="örn: Karşılıksız çıktı, ciro edildi ABC firmasına, vs."
                  className="input"
                />
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Kapat
          </button>
          {validNextStatuses.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Güncelleniyor...' : 'Onayla'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}