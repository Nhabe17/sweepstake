import { countryCodeToFlag } from '@/lib/flags';

export default function TeamFlag({
  countryCode,
  className = '',
}: {
  countryCode?: string | null;
  className?: string;
}) {
  const flag = countryCodeToFlag(countryCode);
  if (!flag) return null;

  return (
    <span aria-hidden="true" className={`inline-block w-[1.35em] shrink-0 text-center leading-none ${className}`}>
      {flag}
    </span>
  );
}
