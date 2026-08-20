import React from 'react';
import { RenderReceiptLayoutProps } from './ReceiptPreviewLayoutProps';
import {
  renderHorizontalHeader,
  renderCenteredFlow,
  renderLeftGrid,
  renderSplitColumns,
  renderFloatingTotals,
} from './ReceiptPreviewLayoutsA';
import {
  renderOffsetLogo,
  renderBoxedSections,
  renderTearOff,
  renderVerticalLine,
  renderEmphasizedTotal,
} from './ReceiptPreviewLayoutsB';

export function renderReceiptLayout(props: RenderReceiptLayoutProps) {
  switch (props.template) {
    case 'horizontal_header': return renderHorizontalHeader(props);
    case 'centered_flow': return renderCenteredFlow(props);
    case 'left_grid': return renderLeftGrid(props);
    case 'split_columns': return renderSplitColumns(props);
    case 'floating_totals': return renderFloatingTotals(props);
    case 'offset_logo': return renderOffsetLogo(props);
    case 'boxed_sections': return renderBoxedSections(props);
    case 'tear_off': return renderTearOff(props);
    case 'vertical_line': return renderVerticalLine(props);
    case 'emphasized_total': return renderEmphasizedTotal(props);
  }
  return null;
}
