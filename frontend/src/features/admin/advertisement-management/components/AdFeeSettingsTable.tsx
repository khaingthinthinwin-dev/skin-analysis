import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AdminAdFeeSetting } from '@/types/admin-ad-management';

interface AdFeeSettingsTableProps {
  feeSettings?: AdminAdFeeSetting[];
  onUpdateRate?: (id: string, dailyRate: number) => void;
}

// Responsive styling follows AdTable: uppercase muted header band, tight
// horizontal padding, and a sticky right-pinned Actions column so the
// Update Rate button stays reachable. The wrapper's overflow-x-auto only
// remains as a fallback for narrower screens.
const TH_BASE =
  'text-left align-middle h-12 px-2 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap';

const TH_CLASS = `${TH_BASE} bg-muted/40`;

const TH_STICKY_CLASS = `${TH_BASE} sticky right-0 z-10 bg-card before:absolute before:inset-0 before:-z-10 before:content-[''] before:bg-muted/40`;

const TD_CLASS = 'py-4 px-2 text-sm text-muted-foreground border-b border-border';

const TD_STICKY_CLASS = `${TD_CLASS} sticky right-0 z-10 bg-card before:absolute before:inset-0 before:-z-10 before:content-['']`;

const ROW_CLASS = 'group transition-colors duration-150 ease-in-out hover:bg-muted/40';

export const AdFeeSettingsTable: React.FC<AdFeeSettingsTableProps> = ({
  feeSettings = [],
  onUpdateRate,
}) => {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-10">
          <tr>
            <th scope="col" className={TH_CLASS}>Placement Location</th>
            <th scope="col" className={TH_CLASS}>Tier</th>
            <th scope="col" className={TH_CLASS}>Daily Rate (KS)</th>
            <th scope="col" className={`${TH_STICKY_CLASS} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {feeSettings.length === 0 ? (
            <tr>
              <td colSpan={4} className={`${TD_CLASS} py-6 text-center text-muted-foreground`}>
                No fee settings configured.
              </td>
            </tr>
          ) : (
            feeSettings.map((setting) => (
              <tr key={setting.id} className={ROW_CLASS}>
                <td className={`${TD_CLASS} font-medium capitalize text-foreground`}>
                  {setting.placement.replace('_', ' ')}
                </td>
                <td className={`${TD_CLASS} capitalize`}>{setting.tier}</td>
                <td className={`${TD_CLASS} whitespace-nowrap`}>
                  <Input
                    type="number"
                    className="w-28"
                    defaultValue={setting.dailyRate}
                    id={`rate-${setting.id}`}
                  />
                </td>
                <td className={`${TD_STICKY_CLASS} text-right group-hover:before:bg-muted/40`}>
                  <Button
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById(`rate-${setting.id}`) as HTMLInputElement;
                      if (input) onUpdateRate?.(setting.id, parseFloat(input.value));
                    }}
                  >
                    Update Rate
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
