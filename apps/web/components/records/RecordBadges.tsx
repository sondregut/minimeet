/**
 * RecordBadges Component
 * Displays record badges (PB, SB, MR, CR, CLR, NR) for results
 */

interface RecordBadgesProps {
  isPB?: boolean;
  isSB?: boolean;
  isMR?: boolean;
  isCR?: boolean;
  isCLR?: boolean;
  isNR?: boolean;
  size?: 'sm' | 'md';
  showAll?: boolean; // Show all badges or just the highest priority one
}

const badgeConfig = {
  NR: {
    label: 'NR',
    title: 'National Record',
    className: 'bg-red-100 text-red-800 border-red-200',
    priority: 1,
  },
  CR: {
    label: 'CR',
    title: 'Championship Record',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    priority: 2,
  },
  MR: {
    label: 'MR',
    title: 'Meeting Record',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    priority: 3,
  },
  CLR: {
    label: 'CLR',
    title: 'Club Record',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    priority: 4,
  },
  PB: {
    label: 'PB',
    title: 'Personal Best',
    className: 'bg-green-100 text-green-800 border-green-200',
    priority: 5,
  },
  SB: {
    label: 'SB',
    title: 'Season Best',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    priority: 6,
  },
};

export function RecordBadges({
  isPB = false,
  isSB = false,
  isMR = false,
  isCR = false,
  isCLR = false,
  isNR = false,
  size = 'sm',
  showAll = false,
}: RecordBadgesProps) {
  // Collect all active badges
  const activeBadges: Array<keyof typeof badgeConfig> = [];
  if (isNR) activeBadges.push('NR');
  if (isCR) activeBadges.push('CR');
  if (isMR) activeBadges.push('MR');
  if (isCLR) activeBadges.push('CLR');
  if (isPB) activeBadges.push('PB');
  if (isSB) activeBadges.push('SB');

  if (activeBadges.length === 0) return null;

  // Sort by priority and optionally show only the highest priority
  const sortedBadges = activeBadges.sort(
    (a, b) => badgeConfig[a].priority - badgeConfig[b].priority
  );

  const badgesToShow = showAll ? sortedBadges : [sortedBadges[0]];

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1 py-0.5 font-semibold'
    : 'text-xs px-1.5 py-0.5 font-semibold';

  return (
    <span className="inline-flex items-center gap-1">
      {badgesToShow.map((badge) => (
        <span
          key={badge}
          title={badgeConfig[badge].title}
          className={`inline-flex items-center rounded border ${badgeConfig[badge].className} ${sizeClasses}`}
        >
          {badgeConfig[badge].label}
        </span>
      ))}
    </span>
  );
}

/**
 * Helper to determine record flags from a result object
 */
export function getRecordFlags(result: {
  is_pb?: boolean;
  is_sb?: boolean;
  is_mr?: boolean;
  is_cr?: boolean;
  is_clr?: boolean;
  is_nr?: boolean;
}) {
  return {
    isPB: result.is_pb ?? false,
    isSB: result.is_sb ?? false,
    isMR: result.is_mr ?? false,
    isCR: result.is_cr ?? false,
    isCLR: result.is_clr ?? false,
    isNR: result.is_nr ?? false,
  };
}

/**
 * Check if any record flag is set
 */
export function hasAnyRecord(result: {
  is_pb?: boolean;
  is_sb?: boolean;
  is_mr?: boolean;
  is_cr?: boolean;
  is_clr?: boolean;
  is_nr?: boolean;
}) {
  return (
    result.is_pb ||
    result.is_sb ||
    result.is_mr ||
    result.is_cr ||
    result.is_clr ||
    result.is_nr
  );
}
