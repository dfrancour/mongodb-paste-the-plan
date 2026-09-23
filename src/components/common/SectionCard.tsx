interface SectionCardProps {
  readonly title: string;
  readonly icon: React.ReactNode;
  readonly headerAction?: React.ReactNode;
  /** Small marker rendered after the title, such as a beta tag. */
  readonly titleBadge?: React.ReactNode;
  readonly featured?: boolean;
  readonly children: React.ReactNode;
}

/** A titled card that is always open, for pages that read top to bottom. */
export function SectionCard({
  title,
  icon,
  headerAction,
  titleBadge,
  featured = false,
  children,
}: SectionCardProps) {
  return (
    <section
      aria-label={title}
      className={featured ? "container-primary-featured" : "container-primary"}
    >
      <div className="flex items-center justify-between p-4">
        <h3 className="header-card flex items-center gap-2">
          {icon}
          {title}
          {titleBadge}
        </h3>
        {headerAction}
      </div>
      <div
        className={
          featured
            ? "p-4"
            : "border-t border-neutral-200 p-4 dark:border-neutral-700"
        }
      >
        {children}
      </div>
    </section>
  );
}
