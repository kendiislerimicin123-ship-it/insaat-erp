'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import axios from 'axios';
import {
  contactsApi,
  contactTransactionsApi,
  Contact,
  ContactTransaction,
  TransactionType,
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_COLORS,
  CONTACT_STATUS_LABELS,
  CONTACT_STATUS_COLORS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_COLORS,
  TRANSACTION_TYPE_DIRECTION,
  formatBalance,
} from '@/lib/api/contacts';
import { useAuthStore } from '@/stores/auth-store';
import { TransactionModal } from '@/components/contacts/transaction-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreateTransaction = hasPermission('contact-transaction.create');
  const canDeleteTransaction = hasPermission('contact-transaction.delete');

  const [contact, setContact] = useState<Contact | null>(null);
  const [transactions, setTransactions] = useState<ContactTransaction[]>([]);
  const [summary, setSummary] = useState({ DEBT: '0', CREDIT: '0', PAYMENT: '0', COLLECTION: '0' });
  const [isLoading, setIsLoading] = useState(true);

  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('DEBT');
  const [deleteTransaction, setDeleteTransaction] = useState<ContactTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [contactData, transactionsData] = await Promise.all([
        contactsApi.getById(id),
        contactTransactionsApi.list({ contactId: id, limit: 100 }),
      ]);
      setContact(contactData);
      setTransactions(transactionsData.items);
      setSummary(transactionsData.summary);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Cari bilgileri yüklenemedi',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteTransaction = async () => {
    if (!deleteTransaction) return;
    setDeleting(true);
    try {
      await contactTransactionsApi.remove(deleteTransaction.id);
      toast.success('Cari hareket silindi');
      setDeleteTransaction(null);
      load();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            'Silme başarısız',
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading && !contact) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center text-slate-500">
        <div className="inline-block w-6 h-6 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-sm mt-2">Yükleniyor...</p>
      </div>
    );
  }

  if (!contact) return null;

  const balance = parseFloat(contact.currentBalance);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link href="/contacts" className="text-sm text-slate-600 hover:text-slate-900">
          ← Cari Hesaplar
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-slate-900">{contact.name}</h1>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${CONTACT_TYPE_COLORS[contact.type]}`}
            >
              {CONTACT_TYPE_LABELS[contact.type]}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${CONTACT_STATUS_COLORS[contact.status]}`}
            >
              {CONTACT_STATUS_LABELS[contact.status]}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-mono">{contact.code}</p>
        </div>
        {canCreateTransaction && (
          <button
            onClick={() => {
              setTransactionType('DEBT');
              setTransactionOpen(true);
            }}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2"
          >
            <span>+</span>
            <span>Hareket Ekle</span>
          </button>
        )}
      </div>

      {/* Bakiye Card */}
      <div
        className={`rounded-2xl border-2 p-6 mb-6 ${
          balance > 0
            ? 'bg-emerald-50 border-emerald-300'
            : balance < 0
              ? 'bg-red-50 border-red-300'
              : 'bg-slate-50 border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 uppercase tracking-wide">
              Güncel Bakiye
            </p>
            <p
              className={`text-4xl font-bold mt-2 ${
                balance > 0
                  ? 'text-emerald-700'
                  : balance < 0
                    ? 'text-red-700'
                    : 'text-slate-700'
              }`}
            >
              {formatBalance(contact.currentBalance, contact.currency)}
            </p>
            <p className="text-sm text-slate-600 mt-2">
              {balance > 0 && '✅ Cari bize borçlu (Alacaklıyız)'}
              {balance < 0 && '⚠️ Biz cariye borçluyuz'}
              {balance === 0 && '⚖️ Bakiye sıfır'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Toplam Hareket</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{transactions.length}</p>
          </div>
        </div>

        {/* Özet Kartlar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-200">
          <SummaryBox
            label="Alacak"
            value={formatBalance(summary.CREDIT, contact.currency)}
            color="text-emerald-700"
          />
          <SummaryBox
            label="Borç"
            value={formatBalance(summary.DEBT, contact.currency)}
            color="text-red-700"
          />
          <SummaryBox
            label="Ödeme"
            value={formatBalance(summary.PAYMENT, contact.currency)}
            color="text-blue-700"
          />
          <SummaryBox
            label="Tahsilat"
            value={formatBalance(summary.COLLECTION, contact.currency)}
            color="text-purple-700"
          />
        </div>
      </div>

      {/* İki Kolon Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: Cari Bilgileri */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sticky top-4">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Bilgiler</h2>
            <div className="space-y-3 text-sm">
              <InfoRow label="Yetkili Kişi" value={contact.contactPerson} />
              <InfoRow label="Telefon" value={contact.phone} />
              <InfoRow label="E-posta" value={contact.email} />
              <InfoRow label="Web" value={contact.website} />
              <InfoRow
                label="Adres"
                value={
                  [contact.address, contact.district, contact.city, contact.country]
                    .filter(Boolean)
                    .join(', ') || null
                }
              />
              <InfoRow label="Vergi No" value={contact.taxNumber} />
              <InfoRow label="Vergi Dairesi" value={contact.taxOffice} />
              <InfoRow label="Sicil No" value={contact.tradeRegistry} />
              <InfoRow label="Banka" value={contact.bankName} />
              <InfoRow label="IBAN" value={contact.iban} />
              <InfoRow
                label="Vade Gün"
                value={contact.paymentTerms ? `${contact.paymentTerms} gün` : null}
              />
              <InfoRow
                label="Kredi Limiti"
                value={
                  contact.creditLimit
                    ? formatBalance(contact.creditLimit, contact.currency)
                    : null
                }
              />
              {contact.notes && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                    Notlar
                  </p>
                  <p className="text-slate-700">{contact.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sağ: Hareket Listesi (Ekstre) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Cari Ekstre</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tüm hareketler (en yeni üstte)
                </p>
              </div>
              {canCreateTransaction && (
                <button
                  onClick={() => {
                    setTransactionType('DEBT');
                    setTransactionOpen(true);
                  }}
                  className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800"
                >
                  + Hareket
                </button>
              )}
            </div>

            {transactions.length === 0 ? (
              <div className="p-12 text-center">
                <span className="text-5xl">📋</span>
                <p className="text-slate-600 mt-3">Henüz hareket yok</p>
                {canCreateTransaction && (
                  <button
                    onClick={() => {
                      setTransactionType('DEBT');
                      setTransactionOpen(true);
                    }}
                    className="mt-4 text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
                  >
                    İlk Hareketi Ekle
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const direction = TRANSACTION_TYPE_DIRECTION[t.type];
                  return (
                    <div key={t.id} className="px-5 py-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-medium ${TRANSACTION_TYPE_COLORS[t.type]}`}
                            >
                              {direction} {TRANSACTION_TYPE_LABELS[t.type]}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(t.date).toLocaleDateString('tr-TR')}
                            </span>
                            {t.documentNo && (
                              <span className="text-xs text-slate-500 font-mono">
                                {t.documentNo}
                              </span>
                            )}
                          </div>
                          {t.description && (
                            <p className="text-sm text-slate-700 mt-1">{t.description}</p>
                          )}
                          {(t.paymentMethod || t.bankReference) && (
                            <p className="text-xs text-slate-500 mt-1">
                              {t.paymentMethod}
                              {t.bankReference && ` • ${t.bankReference}`}
                            </p>
                          )}
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <p
                            className={`text-lg font-bold ${
                              direction === '+' ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {direction} {formatBalance(t.amount, t.currency)}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Bakiye: {formatBalance(t.balanceAfter, t.currency)}
                          </p>
                          {canDeleteTransaction && (
                            <button
                              onClick={() => setDeleteTransaction(t)}
                              className="text-xs text-red-600 hover:text-red-700 mt-1"
                            >
                              Sil
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <TransactionModal
        open={transactionOpen}
        contact={contact}
        initialType={transactionType}
        onClose={() => setTransactionOpen(false)}
        onSuccess={load}
      />
      <ConfirmDialog
        open={!!deleteTransaction}
        title="Hareketi sil"
        message="Bu hareketi silmek üzeresiniz. Cari bakiyesi otomatik düzeltilecek."
        confirmText="Sil"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteTransaction}
        onCancel={() => setDeleteTransaction(null)}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}