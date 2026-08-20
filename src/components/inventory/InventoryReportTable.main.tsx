import React from 'react';
import { InventoryReportDesktopTable } from './InventoryReportTable.desktop';
import { InventoryReportMobileTable } from './InventoryReportTable.mobile';
import type { InventoryReportTableProps } from './inventoryReportTable.types';

export default function InventoryReportTable(props: InventoryReportTableProps) {
  return (
    <>
      <InventoryReportDesktopTable {...props} />
      <InventoryReportMobileTable {...props} />
    </>
  );
}
