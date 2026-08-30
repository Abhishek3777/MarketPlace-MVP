export const Alert = ({ type = 'error', message, onClose }) => {
  if (!message) return null;

  return (
    <div className={`alert alert-${type}`}>
      <div className="alert-content">
        <span className="alert-icon">{type === 'error' ? '⚠️' : '✓'}</span>
        <span>{message}</span>
      </div>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="Close alert">
          ✕
        </button>
      )}
    </div>
  );
};
