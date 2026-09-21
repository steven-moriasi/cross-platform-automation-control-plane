interface MetricCardProperties {
  readonly detail: string;
  readonly label: string;
  readonly tone?: "alert" | "default" | "success";
  readonly value: string;
}

export function MetricCard({
  detail,
  label,
  tone = "default",
  value,
}: MetricCardProperties): React.JSX.Element {
  return (
    <article className={`metric metric--${tone}`}>
      <p className="metric__label">{label}</p>
      <p className="metric__value">{value}</p>
      <p className="metric__detail">{detail}</p>
    </article>
  );
}
