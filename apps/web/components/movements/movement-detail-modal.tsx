'use client';

import {
  MaterialMovement,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_COLORS,
  MATERIAL_CATEGORY_LABELS,
  formatStock,
  formatCurrency,
  formatDate,
} from '@/lib/api/materials';

interface Props {
  open: boolean;
  movement: MaterialMovement | null;
  onClose: () => void;
}

export function MovementDetailModal({ open, movement, onClose }: Props) {
  if (!open || !movement) return null;

  const isIn = movement.type === 'IN';
  const isOut = movement.type === 'OUT';
  const isAdj = movement.type === 'ADJUSTMENT';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Stok Hareketi Detayı</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{movement.id}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Header Card - Type + Amount */}
          <div
            className={`rounded-xl border-2 p-5 ${
              isIn
                ? 'bg-emerald-50 border-emerald-300'
                : isOut
                  ? 'bg-red-50 border-red-300'
                  : 'bg-amber-50 border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${MOVEMENT_TYPE_COLORS[movement.type]}`}
                >
                  {isIn && '⬇️'} {isOut && '⬆️'} {isAdj && '🔄'} {MOVEMENT_TYPE_LABELS[movement.type]}
                </span>
                <p className="text-xs text-slate-600 mt-2">{formatDate(movement.date)}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-slate-900">
                  {formatStock(movement.quantity, movement.material.unit)}
                </p>
                {movement.totalPrice && (
                  <p
                    className={`text-lg font-semibold mt-1 ${
                      isIn ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {formatCurrency(movement.totalPrice, movement.currency)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Malzeme Bilgisi */}
          <Section title="Malzeme">
            <Row label="Kod" value={movement.material.code} mono />
            <Row label="Adı" value={movement.material.name} />
            {movement.material.category && (
              <Row
                label="Kategori"
                value={MATERIAL_CATEGORY_LABELS[movement.material.category] ?? movement.material.category}
              />
            )}
            <Row label="Birim" value={formatStock(0, movement.material.unit).split(' ')[1]} />
          </Section>

          {/* Finansal Bilgiler */}
          {movement.unitPrice && (
            <Section title="Finansal">
              <Row
                label="Birim Fiyat"
                value={formatCurrency(movement.unitPrice, movement.currency)}
              />
              <Row
                label="Miktar"
                value={formatStock(movement.quantity, movement.material.unit)}
              />
              <Row
                label="Toplam"
                value={
                  movement.totalPrice
                    ? formatCurrency(movement.totalPrice, movement.currency)
                    : '—'
                }
                bold
              />
              <Row label="Para Birimi" value={movement.currency} />
            </Section>
          )}

          {/* Tedarikçi / Proje */}
          {(movement.supplier || movement.invoiceNo || movement.project) && (
            <Section title={isIn ? 'Tedarikçi Bilgisi' : 'Proje / Sevk Bilgisi'}>
              {movement.supplier && <Row label="Tedarikçi" value={movement.supplier} />}
              {movement.invoiceNo && <Row label="Fatura No" value={movement.invoiceNo} mono />}
              {movement.project && (
                <>
                  <Row label="Proje Kodu" value={movement.project.code} mono />
                  <Row label="Proje Adı" value={movement.project.name} />
                </>
              )}
            </Section>
          )}

          {/* Notlar */}
          {movement.notes && (
            <Section title="Notlar">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{movement.notes}</p>
            </Section>
          )}

          {/* Kayıt Bilgisi */}
          <Section title="Kayıt Bilgisi">
            <Row label="Oluşturulma" value={new Date(movement.createdAt).toLocaleString('tr-TR')} small />
          </Section>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200">
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  bold,
  small,
}: {
  label: string;
  value: string | React.ReactNode;
  mono?: boolean;
  bold?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-xs text-slate-600">{label}</span>
      <span
        className={`text-sm text-slate-900 text-right ${mono ? 'font-mono' : ''} ${bold ? 'font-bold' : ''} ${small ? 'text-xs' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}