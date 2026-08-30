export const Spinner = ({ message = 'Loading...', size = 'md' }) => {
  return (
    <div className="spinner-container">
      <div className={`spinner spinner-${size}`} />
      {message && <p className="spinner-text">{message}</p>}
    </div>
  );
};
