// Estilos compartidos para los tooltips de Recharts (legibles en modo oscuro).
export const chartTooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
} as const;

export const chartTooltipLabelStyle = { color: "var(--popover-foreground)", fontWeight: 600 } as const;
export const chartTooltipItemStyle = { color: "var(--popover-foreground)" } as const;

export const chartTooltipProps = {
  contentStyle: chartTooltipStyle,
  labelStyle: chartTooltipLabelStyle,
  itemStyle: chartTooltipItemStyle,
  wrapperStyle: { outline: "none" },
} as const;
