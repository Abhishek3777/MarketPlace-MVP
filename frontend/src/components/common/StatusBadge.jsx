export const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = status.toUpperCase();

  let className = 'badge';
  let label = normalized;

  switch (normalized) {
    case 'PENDING':
      className += ' badge-pending';
      label = '⏳ Pending';
      break;
    case 'APPROVED':
      className += ' badge-approved';
      label = '✓ Approved';
      break;
    case 'COMPLETED':
      className += ' badge-completed';
      label = '★ Completed';
      break;
    case 'REJECTED':
      className += ' badge-rejected';
      label = '✕ Rejected';
      break;
    case 'ACTIVE':
      className += ' badge-completed';
      label = 'Active';
      break;
    case 'INACTIVE':
      className += ' badge-rejected';
      label = 'Inactive';
      break;
    default:
      className += ' badge-pending';
      label = status;
  }

  return <span className={className}>{label}</span>;
};
